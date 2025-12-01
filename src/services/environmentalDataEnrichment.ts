import { getSupabase, getCurrentUserId } from '@/lib/supabase';
import type { DbLogEntry } from '@/lib/database';

export interface EnrichedEnvironmentalData {
  temperature_c?: number;
  humidity_pct?: number;
  wind_kph?: number;
  altitude_m?: number;
  terrain_type?: 'road' | 'trail' | 'technical' | 'mixed';
  time_of_day: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';
  performance_metrics: {
    pace_min_km: number;
    hr_avg?: number;
    perceived_effort?: number;
    completion_rate: number;
  };
}

function getTimeOfDay(dateStr: string): 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' {
  const date = new Date(dateStr);
  const hour = date.getHours();

  if (hour >= 5 && hour < 8) return 'early_morning';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function inferTerrainType(
  elevationGain?: number,
  distance?: number,
  title?: string
): 'road' | 'trail' | 'technical' | 'mixed' {
  if (!elevationGain || !distance) return 'road';

  const elevationPerKm = elevationGain / distance;
  const titleLower = title?.toLowerCase() || '';

  if (titleLower.includes('trail') || titleLower.includes('mountain') || titleLower.includes('hiking')) {
    if (elevationPerKm > 80) return 'technical';
    return 'trail';
  }

  if (elevationPerKm > 50) return 'technical';
  if (elevationPerKm > 20) return 'trail';
  if (elevationPerKm > 10) return 'mixed';
  return 'road';
}

export async function enrichLogEntryWithEnvironment(
  logEntry: DbLogEntry
): Promise<EnrichedEnvironmentalData> {
  const timeOfDay = getTimeOfDay(logEntry.date);
  const terrainType = inferTerrainType(logEntry.elevation_gain, logEntry.km, logEntry.title);

  const paceMinKm = logEntry.duration_min && logEntry.km ? logEntry.duration_min / logEntry.km : 0;
  const completionRate = logEntry.duration_min ? 1.0 : 0.8;

  const enrichedData: EnrichedEnvironmentalData = {
    temperature_c: logEntry.temperature,
    humidity_pct: logEntry.humidity ? Math.round(logEntry.humidity) : undefined,
    altitude_m: undefined,
    terrain_type: terrainType,
    time_of_day: timeOfDay,
    performance_metrics: {
      pace_min_km: paceMinKm,
      hr_avg: logEntry.hr_avg,
      perceived_effort: undefined,
      completion_rate: completionRate,
    },
  };

  return enrichedData;
}

export async function saveEnvironmentalTrainingData(
  logEntryId: string,
  enrichedData: EnrichedEnvironmentalData
): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId || !supabase) {
    console.warn('Cannot save environmental data: no user or supabase');
    return;
  }

  const record = {
    user_id: userId,
    log_entry_id: logEntryId,
    temperature_c: enrichedData.temperature_c,
    humidity_pct: enrichedData.humidity_pct,
    wind_kph: enrichedData.wind_kph,
    altitude_m: enrichedData.altitude_m,
    terrain_type: enrichedData.terrain_type,
    time_of_day: enrichedData.time_of_day,
    performance_metrics: enrichedData.performance_metrics,
  };

  const { error } = await supabase
    .from('environmental_training_data')
    .upsert(record, {
      onConflict: 'log_entry_id',
    });

  if (error) {
    console.error('Error saving environmental training data:', error);
  }
}

export async function backfillEnvironmentalData(limitEntries: number = 100): Promise<number> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId || !supabase) {
    console.warn('Cannot backfill: no user or supabase');
    return 0;
  }

  const { data: existingData } = await supabase
    .from('environmental_training_data')
    .select('log_entry_id')
    .eq('user_id', userId);

  const existingLogEntryIds = new Set((existingData || []).map(d => d.log_entry_id));

  const { data: logEntries, error } = await supabase
    .from('log_entries')
    .select('id, title, date, km, duration_min, hr_avg, elevation_gain, temperature, humidity')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(limitEntries);

  if (error || !logEntries) {
    console.error('Error fetching log entries for backfill:', error);
    return 0;
  }

  let enrichedCount = 0;

  for (const entry of logEntries) {
    if (existingLogEntryIds.has(entry.id)) continue;

    const enrichedData = await enrichLogEntryWithEnvironment(entry as DbLogEntry);
    await saveEnvironmentalTrainingData(entry.id, enrichedData);
    enrichedCount++;
  }

  return enrichedCount;
}

export async function getEnvironmentalDataForDateRange(
  startDate: string,
  endDate: string
): Promise<any[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId || !supabase) return [];

  const { data, error } = await supabase
    .from('environmental_training_data')
    .select('*, log_entries(date, km, duration_min)')
    .eq('user_id', userId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching environmental data:', error);
    return [];
  }

  return data || [];
}
