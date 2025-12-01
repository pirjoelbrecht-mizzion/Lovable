import { ProviderInterface, WearableMetric, WearableProviderName, SyncResult } from '../../types/wearable';
import { GarminProvider } from './providers/GarminProvider';
import { OuraProvider } from './providers/OuraProvider';
import { COROSProvider } from './providers/COROSProvider';
import { SuuntoProvider } from './providers/SuuntoProvider';
import { PolarProvider } from './providers/PolarProvider';
import { HealthKitProvider } from './providers/HealthKitProvider';
import { StravaProvider } from './providers/StravaProvider';
import { resolveConflicts, validateMetric } from './utils/resolveConflicts';
import { supabase } from '../../lib/supabase';
import { updateClimatePerformance } from '../locationAnalytics';
import type { LogEntry } from '../../types';
import * as bus from '../../lib/bus';

export class WearableManager {
  private providers: Map<WearableProviderName, ProviderInterface>;
  private priorityOrder: WearableProviderName[];

  constructor(priorityOrder?: WearableProviderName[]) {
    this.providers = new Map([
      ['garmin', new GarminProvider()],
      ['oura', new OuraProvider()],
      ['coros', new COROSProvider()],
      ['suunto', new SuuntoProvider()],
      ['polar', new PolarProvider()],
      ['apple', new HealthKitProvider()],
      ['strava', new StravaProvider()]
    ]);

    this.priorityOrder = priorityOrder || ['garmin', 'oura', 'coros', 'suunto', 'polar', 'apple', 'strava'];
  }

  async sync(dateISO: string): Promise<WearableMetric | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: settings } = await supabase
      .from('provider_priority_settings')
      .select('priority_order')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settings?.priority_order) {
      this.priorityOrder = settings.priority_order;
    }

    const metrics: WearableMetric[] = [];
    const syncResults: SyncResult[] = [];

    for (const providerName of this.priorityOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      const syncId = await this.startSyncLog(user.id, providerName);

      try {
        const isConnected = await provider.isConnected();
        if (!isConnected) {
          syncResults.push({
            success: false,
            provider: providerName,
            error: 'Not connected'
          });
          continue;
        }

        const metric = await provider.fetchMetrics(dateISO);

        if (metric && validateMetric(metric)) {
          metrics.push(metric);

          await this.saveRawMetrics(user.id, providerName, dateISO, metric);
          await this.completeSyncLog(syncId, 'success', metric);

          syncResults.push({
            success: true,
            provider: providerName,
            metrics: metric
          });
        } else {
          await this.completeSyncLog(syncId, 'failed', null, 'No valid metrics returned');
          syncResults.push({
            success: false,
            provider: providerName,
            error: 'No valid metrics'
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await this.completeSyncLog(syncId, 'failed', null, errorMessage);

        syncResults.push({
          success: false,
          provider: providerName,
          error: errorMessage
        });
      }
    }

    if (metrics.length === 0) {
      return null;
    }

    const resolved = resolveConflicts(metrics, this.priorityOrder);

    await this.updateReadinessWithMetrics(user.id, dateISO, resolved);

    return resolved;
  }

  private async startSyncLog(userId: string, provider: WearableProviderName): Promise<string> {
    const { data, error } = await supabase
      .from('wearable_sync_history')
      .insert({
        user_id: userId,
        provider,
        sync_started_at: new Date().toISOString(),
        status: 'success'
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  private async completeSyncLog(
    syncId: string,
    status: 'success' | 'failed' | 'partial',
    metrics: WearableMetric | null,
    errorMessage?: string
  ): Promise<void> {
    await supabase
      .from('wearable_sync_history')
      .update({
        sync_completed_at: new Date().toISOString(),
        status,
        metrics_synced: metrics ? JSON.parse(JSON.stringify(metrics)) : null,
        error_message: errorMessage
      })
      .eq('id', syncId);
  }

  private async saveRawMetrics(
    userId: string,
    provider: WearableProviderName,
    dateISO: string,
    metric: WearableMetric
  ): Promise<void> {
    await supabase
      .from('wearable_raw_metrics')
      .upsert({
        user_id: userId,
        provider,
        metric_date: dateISO,
        raw_data: JSON.parse(JSON.stringify(metric))
      }, {
        onConflict: 'user_id,provider,metric_date'
      });
  }

  private async updateReadinessWithMetrics(
    userId: string,
    dateISO: string,
    metric: WearableMetric
  ): Promise<void> {
    const updates: any = {
      data_source: metric.source,
      last_synced_at: new Date().toISOString()
    };

    if (metric.sleepHours) updates.sleep_hours = metric.sleepHours;
    if (metric.sleepQuality) updates.sleep_quality = metric.sleepQuality;
    if (metric.hrv) updates.hrv_value = metric.hrv;
    if (metric.restingHR) updates.resting_hr = metric.restingHR;

    const { data: existing } = await supabase
      .from('readiness_scores')
      .select('id')
      .eq('user_id', userId)
      .eq('date', dateISO)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('readiness_scores')
        .update(updates)
        .eq('id', existing.id);
    }
  }

  async updateLastSyncTime(provider: WearableProviderName): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('wearable_connections')
      .update({
        last_sync_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('provider', provider);
  }

  async syncProvider(providerName: WearableProviderName, startDate: string, endDate: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Provider ${providerName} not found`);

    if (providerName === 'strava') {
      const stravaProvider = provider as StravaProvider;
      const activities = await stravaProvider.fetchActivities(startDate, endDate);

      if (activities.length === 0) {
        console.log('No activities to sync from Strava');
        return;
      }

      const dates = [...new Set(activities.map(a => a.dateISO))];

      const { data: existingByDateKm } = await supabase
        .from('log_entries')
        .select('id, date, km, map_polyline, map_summary_polyline, elevation_gain, elevation_stream, distance_stream')
        .eq('user_id', user.id)
        .in('date', dates);

      const existingMap = new Map(
        (existingByDateKm || []).map(e => [`${e.date}_${e.km}`, e])
      );

      const newActivities: typeof activities = [];
      const updateActivities: Array<{ id: number; activity: typeof activities[0] }> = [];

      for (const activity of activities) {
        const key = `${activity.dateISO}_${activity.km}`;
        const existing = existingMap.get(key);

        if (!existing) {
          newActivities.push(activity);
        } else if (
          ((activity.mapSummaryPolyline || activity.mapPolyline) &&
          !existing.map_polyline &&
          !existing.map_summary_polyline) ||
          ((activity.elevationStream || activity.elevationGain) &&
          !existing.elevation_stream &&
          !existing.elevation_gain)
        ) {
          updateActivities.push({ id: existing.id, activity });
        }
      }

      console.log(`Strava sync: ${newActivities.length} new, ${updateActivities.length} to update with map data`);

      if (newActivities.length > 0) {
        const insertData = newActivities.map(activity => ({
          user_id: user.id,
          date: activity.dateISO,
          title: activity.title,
          km: activity.km,
          duration_min: activity.durationMin,
          hr_avg: activity.hrAvg,
          source: activity.source || 'Strava',
          data_source: 'strava',
          external_id: activity.externalId,
          map_polyline: activity.mapPolyline,
          map_summary_polyline: activity.mapSummaryPolyline,
          elevation_gain: activity.elevationGain,
          elevation_stream: activity.elevationStream,
          distance_stream: activity.distanceStream,
          temperature: activity.temperature,
          location_name: activity.location
        }));

        const { data, error } = await supabase
          .from('log_entries')
          .upsert(insertData, {
            onConflict: 'user_id,external_id,data_source',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('Error upserting activities:', error);
        } else {
          console.log(`Upserted ${newActivities.length} activities`);

          // Analyze terrain for activities with elevation data
          await this.analyzeTerrainForActivities(newActivities);

          // Emit event to trigger pace profile recalculation
          bus.emit('log:updated');
        }

        await this.populateClimatePerformance(newActivities);
      }

      if (updateActivities.length > 0) {
        for (const { id, activity } of updateActivities) {
          await supabase
            .from('log_entries')
            .update({
              map_polyline: activity.mapPolyline,
              map_summary_polyline: activity.mapSummaryPolyline,
              elevation_gain: activity.elevationGain,
              elevation_stream: activity.elevationStream,
              distance_stream: activity.distanceStream
            })
            .eq('id', id);
        }

        console.log(`Updated ${updateActivities.length} activities with map and elevation data`);

        // Analyze terrain for updated activities
        const updatedLogEntries = updateActivities.map(u => u.activity);
        await this.analyzeTerrainForActivities(updatedLogEntries);
      }

      if (newActivities.length === 0 && updateActivities.length === 0) {
        console.log('All activities already synced with map data');
      }
    }
  }

  private async analyzeTerrainForActivities(activities: LogEntry[]): Promise<void> {
    const activitiesWithElevation = activities.filter(a =>
      a.elevationStream && a.distanceStream && a.durationMin
    );

    if (activitiesWithElevation.length === 0) {
      console.log('[WearableManager] No activities with elevation data to analyze');
      return;
    }

    console.log(`[WearableManager] Analyzing terrain for ${activitiesWithElevation.length} activities`);

    try {
      const { analyzeUserActivities } = await import('../../engine/historicalAnalysis/analyzeActivityTerrain');
      await analyzeUserActivities();
      console.log('[WearableManager] Terrain analysis complete');
    } catch (err) {
      console.error('[WearableManager] Failed to analyze terrain:', err);
    }
  }

  private async populateClimatePerformance(activities: LogEntry[]): Promise<void> {
    const entriesWithWeather = activities.filter(e =>
      e.temperature && e.location && e.durationMin && e.km && e.hrAvg
    );

    console.log(`[WearableManager] Populating climate performance for ${entriesWithWeather.length} activities with weather data`);

    for (const entry of entriesWithWeather) {
      const pace = entry.durationMin! / entry.km;
      const humidity = entry.humidity || 50;

      await updateClimatePerformance(
        entry.location!,
        entry.temperature!,
        humidity,
        pace,
        entry.hrAvg!
      );
    }

    console.log('[WearableManager] Climate performance data populated');
  }
}
