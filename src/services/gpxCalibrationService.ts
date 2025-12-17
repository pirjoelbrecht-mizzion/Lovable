import { getSupabase, getCurrentUserId } from '@/lib/supabase';
import { getUltraDistanceCategory } from '@/lib/ultra-distance/ultraFatigueModel';
import { emit } from '@/lib/bus';

export interface GPXCalibrationInput {
  raceId?: string;
  raceName: string;
  raceDate: string;
  distanceKm: number;
  elevationGainM: number;
  surfaceType: 'road' | 'trail' | 'mixed' | 'mountain';
  gpxPredictedTimeMin: number;
  actualTimeMin: number;
  usedPersonalizedPace: boolean;
  paceProfileConfidence: 'low' | 'medium' | 'high';
  temperatureC?: number;
  humidityPct?: number;
  hadNightSection: boolean;
  aidStationPredictedMin?: number;
  aidStationActualMin?: number;
  fatigueFatorUsed: number;
  athleteNotes?: string;
  weatherConditions?: string;
  terrainDifficultyRating?: number;
}

export interface CorrectionFactors {
  distanceBand: string;
  baseFatigueFactor: number;
  elevationFactorAdjustment: number;
  heatSensitivityFactor: number;
  nightRunningFactor: number;
  aidStationTimeMultiplier: number;
  terrainRoadFactor: number;
  terrainTrailFactor: number;
  terrainMountainFactor: number;
  climbPaceFactor: number;
  descentPaceFactor: number;
  flatPaceFactor: number;
  calibrationCount: number;
  confidenceScore: number;
}

export interface CalibrationResult {
  success: boolean;
  calibrationId?: string;
  timeDeltaMin: number;
  timeDeltaPct: number;
  calibrationQuality: number;
  updatedFactors?: Partial<CorrectionFactors>;
  insights: string[];
  recommendations: string[];
}

export async function recordGPXCalibration(
  input: GPXCalibrationInput
): Promise<CalibrationResult> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return {
      success: false,
      timeDeltaMin: 0,
      timeDeltaPct: 0,
      calibrationQuality: 0,
      insights: ['Authentication required'],
      recommendations: [],
    };
  }

  const timeDeltaMin = input.actualTimeMin - input.gpxPredictedTimeMin;
  const timeDeltaPct = (timeDeltaMin / input.gpxPredictedTimeMin) * 100;

  const calibrationQuality = calculateCalibrationQuality(
    timeDeltaPct,
    input.distanceKm,
    input.usedPersonalizedPace,
    input.paceProfileConfidence
  );

  const actualFatigueFactor = estimateActualFatigueFactor(
    input.gpxPredictedTimeMin,
    input.actualTimeMin,
    input.fatigueFatorUsed,
    input.aidStationPredictedMin,
    input.aidStationActualMin
  );

  const { data: calibrationData, error: calibrationError } = await supabase
    .from('gpx_prediction_calibrations')
    .insert({
      user_id: userId,
      race_id: input.raceId,
      race_name: input.raceName,
      race_date: input.raceDate,
      distance_km: input.distanceKm,
      elevation_gain_m: input.elevationGainM,
      surface_type: input.surfaceType,
      gpx_predicted_time_min: input.gpxPredictedTimeMin,
      actual_time_min: input.actualTimeMin,
      prediction_method: 'gpx',
      used_personalized_pace: input.usedPersonalizedPace,
      pace_profile_confidence: input.paceProfileConfidence,
      temperature_c: input.temperatureC,
      humidity_pct: input.humidityPct,
      had_night_section: input.hadNightSection,
      aid_station_predicted_min: input.aidStationPredictedMin,
      aid_station_actual_min: input.aidStationActualMin,
      fatigue_factor_used: input.fatigueFatorUsed,
      fatigue_factor_actual: actualFatigueFactor,
      time_delta_min: timeDeltaMin,
      time_delta_pct: timeDeltaPct,
      calibration_quality: calibrationQuality,
      athlete_notes: input.athleteNotes,
      weather_conditions: input.weatherConditions,
      terrain_difficulty_rating: input.terrainDifficultyRating,
    })
    .select('id')
    .single();

  if (calibrationError) {
    console.error('Error recording GPX calibration:', calibrationError);
    return {
      success: false,
      timeDeltaMin,
      timeDeltaPct,
      calibrationQuality,
      insights: ['Failed to save calibration data'],
      recommendations: [],
    };
  }

  const distanceCategory = getUltraDistanceCategory(input.distanceKm);
  const updatedFactors = await updateCorrectionFactors(
    userId,
    distanceCategory.category,
    {
      timeDeltaPct,
      actualFatigueFactor,
      surfaceType: input.surfaceType,
      hadNightSection: input.hadNightSection,
      temperatureC: input.temperatureC,
      aidStationActualMin: input.aidStationActualMin,
      aidStationPredictedMin: input.aidStationPredictedMin,
    },
    calibrationQuality
  );

  const { insights, recommendations } = generateCalibrationInsights(
    timeDeltaPct,
    input,
    actualFatigueFactor
  );

  emit('gpx:calibration-recorded', {
    calibrationId: calibrationData?.id,
    distanceKm: input.distanceKm,
    timeDeltaPct,
    calibrationQuality,
  });

  return {
    success: true,
    calibrationId: calibrationData?.id,
    timeDeltaMin,
    timeDeltaPct,
    calibrationQuality,
    updatedFactors,
    insights,
    recommendations,
  };
}

function calculateCalibrationQuality(
  timeDeltaPct: number,
  distanceKm: number,
  usedPersonalizedPace: boolean,
  paceConfidence: string
): number {
  let quality = 0.7;

  const absTimeDelta = Math.abs(timeDeltaPct);
  if (absTimeDelta < 3) {
    quality = 0.95;
  } else if (absTimeDelta < 5) {
    quality = 0.90;
  } else if (absTimeDelta < 10) {
    quality = 0.80;
  } else if (absTimeDelta < 15) {
    quality = 0.70;
  } else if (absTimeDelta < 25) {
    quality = 0.60;
  } else {
    quality = 0.50;
  }

  if (distanceKm >= 100) {
    quality = Math.min(1.0, quality * 1.15);
  } else if (distanceKm >= 50) {
    quality = Math.min(1.0, quality * 1.05);
  }

  if (usedPersonalizedPace) {
    quality = Math.min(1.0, quality * 1.1);
  }

  if (paceConfidence === 'high') {
    quality = Math.min(1.0, quality * 1.05);
  } else if (paceConfidence === 'low') {
    quality *= 0.9;
  }

  return Math.max(0.3, Math.min(1.0, quality));
}

function estimateActualFatigueFactor(
  predictedTimeMin: number,
  actualTimeMin: number,
  usedFatigueFactor: number,
  aidPredictedMin?: number,
  aidActualMin?: number
): number {
  const aidDelta = (aidActualMin || 0) - (aidPredictedMin || 0);
  const movingTimeDelta = (actualTimeMin - predictedTimeMin) - aidDelta;

  const impliedFatigueMultiplier = (predictedTimeMin + movingTimeDelta) / predictedTimeMin;

  const rawFatigueFactor = usedFatigueFactor * impliedFatigueMultiplier;

  return Math.max(1.0, Math.min(2.0, rawFatigueFactor));
}

async function updateCorrectionFactors(
  userId: string,
  distanceBand: string,
  calibration: {
    timeDeltaPct: number;
    actualFatigueFactor: number;
    surfaceType: string;
    hadNightSection: boolean;
    temperatureC?: number;
    aidStationActualMin?: number;
    aidStationPredictedMin?: number;
  },
  calibrationQuality: number
): Promise<Partial<CorrectionFactors> | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;

  const { data: existingFactors } = await supabase
    .from('ultra_distance_correction_factors')
    .select('*')
    .eq('user_id', userId)
    .eq('distance_band', distanceBand)
    .maybeSingle();

  const alpha = Math.min(0.4, calibrationQuality / (existingFactors?.calibration_count || 0 + 2));

  const updates: Record<string, any> = {
    user_id: userId,
    distance_band: distanceBand,
    calibration_count: (existingFactors?.calibration_count || 0) + 1,
    last_calibration_date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  };

  const currentFatigue = existingFactors?.base_fatigue_factor || 1.0;
  updates.base_fatigue_factor = currentFatigue * (1 - alpha) +
    calibration.actualFatigueFactor * alpha;

  if (calibration.surfaceType === 'trail') {
    const currentTrail = existingFactors?.terrain_trail_factor || 1.0;
    const adjustment = calibration.timeDeltaPct > 0 ? 1.02 : 0.99;
    updates.terrain_trail_factor = currentTrail * (1 - alpha) +
      (currentTrail * adjustment) * alpha;
  } else if (calibration.surfaceType === 'mountain') {
    const currentMountain = existingFactors?.terrain_mountain_factor || 1.0;
    const adjustment = calibration.timeDeltaPct > 0 ? 1.03 : 0.98;
    updates.terrain_mountain_factor = currentMountain * (1 - alpha) +
      (currentMountain * adjustment) * alpha;
  }

  if (calibration.hadNightSection) {
    const currentNight = existingFactors?.night_running_factor || 1.0;
    const nightImpact = calibration.timeDeltaPct > 10 ? 1.05 : 1.0;
    updates.night_running_factor = currentNight * (1 - alpha) +
      (currentNight * nightImpact) * alpha;
  }

  if (calibration.temperatureC && calibration.temperatureC > 25) {
    const currentHeat = existingFactors?.heat_sensitivity_factor || 1.0;
    const heatImpact = calibration.timeDeltaPct > 5 ? 1.03 : 1.0;
    updates.heat_sensitivity_factor = currentHeat * (1 - alpha) +
      (currentHeat * heatImpact) * alpha;
  }

  if (calibration.aidStationActualMin && calibration.aidStationPredictedMin) {
    const aidRatio = calibration.aidStationActualMin / calibration.aidStationPredictedMin;
    const currentAid = existingFactors?.aid_station_time_multiplier || 1.0;
    updates.aid_station_time_multiplier = currentAid * (1 - alpha) + aidRatio * alpha;
  }

  const newConfidence = Math.min(95,
    (existingFactors?.confidence_score || 50) + (calibrationQuality * 5)
  );
  updates.confidence_score = newConfidence;

  const raceHistory = existingFactors?.race_history || [];
  raceHistory.push({
    date: new Date().toISOString(),
    timeDeltaPct: calibration.timeDeltaPct,
    quality: calibrationQuality,
  });
  updates.race_history = raceHistory.slice(-10);

  const { error } = await supabase
    .from('ultra_distance_correction_factors')
    .upsert(updates, { onConflict: 'user_id,distance_band' });

  if (error) {
    console.error('Error updating correction factors:', error);
    return undefined;
  }

  return updates as Partial<CorrectionFactors>;
}

function generateCalibrationInsights(
  timeDeltaPct: number,
  input: GPXCalibrationInput,
  actualFatigueFactor: number
): { insights: string[]; recommendations: string[] } {
  const insights: string[] = [];
  const recommendations: string[] = [];

  if (timeDeltaPct > 20) {
    insights.push(`Prediction was ${Math.abs(timeDeltaPct).toFixed(1)}% faster than actual - significant underestimate`);
    recommendations.push('Future predictions for similar distances will be adjusted upward');

    if (input.distanceKm > 80) {
      insights.push('Ultra distance fatigue accumulated faster than modeled');
      recommendations.push('Consider more conservative pacing in first half');
    }
  } else if (timeDeltaPct > 10) {
    insights.push(`Prediction was ${Math.abs(timeDeltaPct).toFixed(1)}% optimistic`);
    recommendations.push('Model will increase fatigue factor for this distance band');
  } else if (timeDeltaPct < -10) {
    insights.push(`You finished ${Math.abs(timeDeltaPct).toFixed(1)}% faster than predicted!`);
    recommendations.push('Model will adjust fatigue curve - you handle ultras well');
  } else {
    insights.push(`Prediction within ${Math.abs(timeDeltaPct).toFixed(1)}% - excellent accuracy`);
  }

  if (actualFatigueFactor > input.fatigueFatorUsed * 1.2) {
    insights.push('Actual fatigue was significantly higher than predicted');
    recommendations.push('Future predictions will use higher fatigue multiplier');
  }

  if (input.hadNightSection && timeDeltaPct > 15) {
    insights.push('Night section may have contributed to slower pace');
    recommendations.push('Night running factor will be increased');
  }

  if (input.temperatureC && input.temperatureC > 25 && timeDeltaPct > 10) {
    insights.push('Heat conditions likely impacted performance');
    recommendations.push('Heat sensitivity factor will be updated');
  }

  if (input.aidStationActualMin && input.aidStationPredictedMin) {
    const aidDeltaPct = ((input.aidStationActualMin - input.aidStationPredictedMin) /
      input.aidStationPredictedMin) * 100;

    if (aidDeltaPct > 30) {
      insights.push(`Aid station time was ${aidDeltaPct.toFixed(0)}% longer than estimated`);
      recommendations.push('Aid station time multiplier will be increased');
    } else if (aidDeltaPct < -20) {
      insights.push('Aid station efficiency better than predicted');
    }
  }

  return { insights, recommendations };
}

export async function getCorrectionFactors(
  distanceBand: string
): Promise<CorrectionFactors | null> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('ultra_distance_correction_factors')
    .select('*')
    .eq('user_id', userId)
    .eq('distance_band', distanceBand)
    .maybeSingle();

  if (error || !data) return null;

  return {
    distanceBand: data.distance_band,
    baseFatigueFactor: data.base_fatigue_factor,
    elevationFactorAdjustment: data.elevation_factor_adjustment,
    heatSensitivityFactor: data.heat_sensitivity_factor,
    nightRunningFactor: data.night_running_factor,
    aidStationTimeMultiplier: data.aid_station_time_multiplier,
    terrainRoadFactor: data.terrain_road_factor,
    terrainTrailFactor: data.terrain_trail_factor,
    terrainMountainFactor: data.terrain_mountain_factor,
    climbPaceFactor: data.climb_pace_factor,
    descentPaceFactor: data.descent_pace_factor,
    flatPaceFactor: data.flat_pace_factor,
    calibrationCount: data.calibration_count,
    confidenceScore: data.confidence_score,
  };
}

export async function getCalibrationHistory(
  limit: number = 10
): Promise<GPXCalibrationInput[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from('gpx_prediction_calibrations')
    .select('*')
    .eq('user_id', userId)
    .order('race_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching calibration history:', error);
    return [];
  }

  return data || [];
}

export async function getAverageAccuracyByDistance(): Promise<Map<string, { avgError: number; count: number }>> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) return new Map();

  const { data, error } = await supabase
    .from('gpx_prediction_calibrations')
    .select('distance_km, time_delta_pct')
    .eq('user_id', userId);

  if (error || !data) return new Map();

  const byDistance = new Map<string, { totalError: number; count: number }>();

  for (const row of data) {
    const category = getUltraDistanceCategory(row.distance_km).category;
    const existing = byDistance.get(category) || { totalError: 0, count: 0 };
    existing.totalError += Math.abs(row.time_delta_pct || 0);
    existing.count += 1;
    byDistance.set(category, existing);
  }

  const result = new Map<string, { avgError: number; count: number }>();
  for (const [key, value] of byDistance) {
    result.set(key, {
      avgError: value.totalError / value.count,
      count: value.count,
    });
  }

  return result;
}
