/**
 * Heat Impact Analysis Orchestrator
 *
 * Main entry point for analyzing heat and humidity impact on activities
 */

import { getWeatherForActivity, extractLocationFromPolyline, calculateDataQuality } from '../../services/historicalWeatherService';
import { generatePointByPointWeather } from './lapseRate';
import {
  identifyRiskZones,
  calculateTimeInZones,
  analyzeHumidityStrain,
  detectCoolingBenefits,
  identifyPeakHeatPeriod,
  calculateEnvironmentalStats
} from './heatMetrics';
import { analyzePhysiologicalStress } from './stressDetection';
import { correlateEnvironmentWithStress } from './correlationEngine';
import { calculateHeatImpactScore, generateRecommendations } from './impactScoring';
import { generateHeatImpactInsights, cacheInsightsInDatabase } from '../../services/llmInsightService';
import { supabase } from '../supabase';
import { fetchActivityStreams, getMidpointCoordinate } from './streamHelpers';
import type { LogEntry } from '../../types';

export interface HeatImpactAnalysisResult {
  success: boolean;
  error?: string;
  analysis?: {
    heat_impact_score: number;
    severity: string;
    summary: string;
    key_events: any[];
    recommendations: string[];
  };
}

/**
 * Main analysis function for activity heat impact
 */
export async function analyzeActivityHeatImpact(
  userId: string,
  logEntry: LogEntry
): Promise<HeatImpactAnalysisResult> {
  try {
    console.log(`[Heat Impact] Starting analysis for log entry ${logEntry.id}`);

    // Validate required data
    const validation = validateActivityData(logEntry);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Fetch activity streams from database (GPS, altitude, time, distance, HR, etc.)
    const streams = await fetchActivityStreams(logEntry.id);

    // Extract location - prioritize GPS streams over polyline
    let location = getMidpointCoordinate(streams.latlng);
    if (!location) {
      // Fallback to polyline if no GPS streams
      location = extractLocationFromPolyline(logEntry.mapPolyline || logEntry.mapSummaryPolyline || '');
    }

    if (!location) {
      return {
        success: false,
        error: 'Unable to extract location from activity (no GPS data)'
      };
    }

    console.log(`[Heat Impact] Using location: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)} ${streams.latlng ? '(from GPS streams)' : '(from polyline)'}`);

    // Fetch historical weather data
    const activityDate = new Date(logEntry.dateISO);
    const durationHours = (logEntry.durationMin || 0) / 60;

    const weatherData = await getWeatherForActivity(userId, logEntry.id, {
      lat: location.lat,
      lon: location.lon,
      date: activityDate.toISOString().split('T')[0],
      startTime: activityDate.toISOString(),
      duration_hours: durationHours
    });

    console.log(`[Heat Impact] Fetched ${weatherData.length} hourly weather points`);

    // Generate point-by-point weather with elevation correction
    const hourlyWeatherWithTimestamp = weatherData.map(w => ({
      ...w,
      timestamp: new Date(w.hour_timestamp)
    }));

    const adjustedWeather = generatePointByPointWeather(
      hourlyWeatherWithTimestamp,
      streams.elevation,
      streams.time,
      0 // Base elevation (weather station at ground level)
    );

    console.log(`[Heat Impact] Generated ${adjustedWeather.length} adjusted weather points`);

    // Save adjusted weather to database
    await saveAdjustedWeather(userId, logEntry.id, adjustedWeather, streams.distance);

    // Calculate environmental metrics
    const envStats = calculateEnvironmentalStats(adjustedWeather);
    const timeInZone = calculateTimeInZones(adjustedWeather);
    const humidityStrain = analyzeHumidityStrain(adjustedWeather, streams.distance);
    const coolingBenefit = detectCoolingBenefits(adjustedWeather, streams.distance);
    const peakHeatPeriod = identifyPeakHeatPeriod(adjustedWeather, streams.distance);
    const riskZones = identifyRiskZones(adjustedWeather, streams.distance);

    console.log('[Heat Impact] Calculated environmental metrics');

    // Analyze physiological stress
    const physiologicalStress = analyzePhysiologicalStress(
      streams.heartrate,
      streams.velocity,
      streams.elevation,
      streams.cadence,
      streams.time,
      streams.distance,
      streams.grade
    );

    console.log('[Heat Impact] Analyzed physiological stress');

    // Correlate environment with stress
    const correlation = correlateEnvironmentWithStress(
      adjustedWeather,
      streams.distance,
      physiologicalStress,
      streams.heartrate,
      streams.velocity,
      streams.cadence
    );

    console.log(`[Heat Impact] Correlation strength: ${(correlation.correlation_strength * 100).toFixed(0)}%`);

    // Calculate heat impact score
    const durationMinutes = logEntry.durationMin || 0;
    const heatImpactScore = calculateHeatImpactScore(
      physiologicalStress,
      timeInZone,
      humidityStrain,
      coolingBenefit,
      durationMinutes
    );

    console.log(`[Heat Impact] Overall score: ${heatImpactScore.overall_score}/100 (${heatImpactScore.severity})`);

    // Save metrics to database
    await saveHeatStressMetrics(userId, logEntry.id, {
      envStats,
      timeInZone,
      humidityStrain,
      coolingBenefit,
      peakHeatPeriod,
      physiologicalStress,
      heatImpactScore
    });

    // Generate LLM insights
    const insights = await generateHeatImpactInsights({
      activity_name: logEntry.name || 'Untitled Activity',
      distance_km: (logEntry.distance || 0) / 1000,
      duration_minutes: durationMinutes,
      weatherStream: adjustedWeather,
      physiologicalStress,
      correlation,
      heatImpactScore
    });

    console.log('[Heat Impact] Generated LLM insights');

    // Cache insights in database
    await cacheInsightsInDatabase(userId, logEntry.id, insights);

    return {
      success: true,
      analysis: {
        heat_impact_score: heatImpactScore.overall_score,
        severity: heatImpactScore.severity,
        summary: insights.summary,
        key_events: insights.key_events,
        recommendations: insights.recommendations
      }
    };
  } catch (error) {
    console.error('[Heat Impact] Analysis failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validates activity has required data for analysis
 */
function validateActivityData(logEntry: LogEntry): { valid: boolean; error?: string } {
  if (!logEntry.mapPolyline && !logEntry.mapSummaryPolyline) {
    return { valid: false, error: 'Activity missing GPS data' };
  }

  if (!logEntry.elevationGain && !logEntry.elevationStream) {
    return { valid: false, error: 'Activity missing elevation data' };
  }

  if ((logEntry.durationMin || 0) < 10) {
    return { valid: false, error: 'Activity too short for meaningful analysis' };
  }

  return { valid: true };
}

// Stream fetching now handled by streamHelpers.ts

/**
 * Saves adjusted weather data to database
 */
async function saveAdjustedWeather(
  userId: string,
  logEntryId: string,
  adjustedWeather: any[],
  distanceStream: number[]
): Promise<void> {
  // Delete existing data first
  await supabase
    .from('race_weather_adjusted')
    .delete()
    .eq('log_entry_id', logEntryId);

  const rows = adjustedWeather.map((weather, i) => ({
    user_id: userId,
    log_entry_id: logEntryId,
    stream_index: i,
    timestamp: weather.timestamp.toISOString(),
    elevation_m: weather.elevation_m,
    temperature_c: weather.temperature_c,
    humidity_percent: weather.humidity_percent,
    heat_index_c: weather.heat_index_c,
    dew_point_c: weather.dew_point_c,
    feels_like_c: weather.feels_like_c
  }));

  // Batch insert in chunks of 1000 to avoid payload limits
  const BATCH_SIZE = 1000;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('race_weather_adjusted').insert(batch);

    if (error) {
      console.error(`Failed to save weather batch ${i / BATCH_SIZE + 1}:`, error);
      throw error;
    }
  }

  console.log(`[Heat Impact] Saved ${rows.length} weather points in ${Math.ceil(rows.length / BATCH_SIZE)} batches`);
}

/**
 * Saves heat stress metrics to database
 */
async function saveHeatStressMetrics(userId: string, logEntryId: string, data: any): Promise<void> {
  const {
    envStats,
    timeInZone,
    humidityStrain,
    coolingBenefit,
    peakHeatPeriod,
    physiologicalStress,
    heatImpactScore
  } = data;

  const metrics = {
    user_id: userId,
    log_entry_id: logEntryId,

    // Heat Impact Scores
    heat_impact_score: heatImpactScore.overall_score,
    humidity_strain_score: heatImpactScore.humidity_strain_score,
    cooling_benefit_score: heatImpactScore.cooling_benefit_score,
    overall_severity: heatImpactScore.severity,

    // Temperature Stats
    avg_temperature_c: envStats.avg_temperature_c,
    max_temperature_c: envStats.max_temperature_c,
    min_temperature_c: envStats.min_temperature_c,
    avg_heat_index_c: envStats.avg_heat_index_c,
    max_heat_index_c: envStats.max_heat_index_c,

    // Humidity Stats
    avg_humidity_percent: envStats.avg_humidity_percent,
    max_humidity_percent: envStats.max_humidity_percent,
    time_above_80_humidity_minutes: humidityStrain.time_above_80_minutes,

    // Physiological Stress
    hr_drift_detected: physiologicalStress.hr_drift.detected,
    hr_drift_magnitude_bpm: physiologicalStress.hr_drift.magnitude_bpm,
    hr_drift_start_km: physiologicalStress.hr_drift.start_km,
    pace_degradation_detected: physiologicalStress.pace_degradation.detected,
    pace_degradation_percent: physiologicalStress.pace_degradation.degradation_percent,
    pace_degradation_start_km: physiologicalStress.pace_degradation.start_km,
    vam_decline_detected: physiologicalStress.vam_decline.detected,
    vam_decline_percent: physiologicalStress.vam_decline.decline_percent,
    cadence_drop_detected: physiologicalStress.cadence_drop.detected,
    cadence_drop_percent: physiologicalStress.cadence_drop.drop_percent,

    // Environmental Risk Zones
    time_in_danger_zone_minutes: timeInZone.danger_minutes + timeInZone.extreme_danger_minutes,
    time_in_extreme_danger_minutes: timeInZone.extreme_danger_minutes,
    peak_heat_period_start_km: peakHeatPeriod?.start_km,
    peak_heat_period_end_km: peakHeatPeriod?.end_km,

    // Analysis Metadata
    analysis_confidence: 0.8,
    data_completeness_score: 0.9,
    analyzed_at: new Date().toISOString()
  };

  const { error } = await supabase.from('race_heat_stress_metrics').upsert(metrics);

  if (error) {
    console.error('Failed to save heat stress metrics:', error);
    throw error;
  }
}
