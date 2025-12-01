import { getSupabase, getCurrentUserId } from '@/lib/supabase';

export interface AltitudeProfile {
  seaLevelBasePace: number;
  altitudeDegradationCurve: { altitudeM: number; paceAdjustmentPct: number }[];
  acclimatizationDays: number;
  maxTrainingAltitude: number;
  confidenceScore: number;
}

export async function learnAltitudeResponse(userId: string): Promise<AltitudeProfile> {
  const supabase = getSupabase();

  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const { data, error } = await supabase
    .from('environmental_training_data')
    .select('altitude_m, performance_metrics, log_entries(date)')
    .eq('user_id', userId)
    .not('altitude_m', 'is', null)
    .order('created_at', { ascending: true });

  if (error || !data || data.length < 10) {
    return {
      seaLevelBasePace: 6.0,
      altitudeDegradationCurve: [],
      acclimatizationDays: 14,
      maxTrainingAltitude: 0,
      confidenceScore: 0,
    };
  }

  const performancePoints = data
    .filter(d => d.altitude_m !== undefined && d.performance_metrics?.pace_min_km)
    .map(d => ({
      altitude: d.altitude_m!,
      pace: d.performance_metrics.pace_min_km,
      date: (d.log_entries as any)?.date || '',
    }));

  if (performancePoints.length < 10) {
    return {
      seaLevelBasePace: 6.0,
      altitudeDegradationCurve: [],
      acclimatizationDays: 14,
      maxTrainingAltitude: 0,
      confidenceScore: 0,
    };
  }

  const seaLevelRuns = performancePoints.filter(p => p.altitude < 200);
  const seaLevelBasePace = seaLevelRuns.length > 0
    ? seaLevelRuns.reduce((sum, p) => sum + p.pace, 0) / seaLevelRuns.length
    : performancePoints.reduce((sum, p) => sum + p.pace, 0) / performancePoints.length;

  const altitudeBuckets: { [key: number]: number[] } = {};
  performancePoints.forEach(p => {
    const bucket = Math.round(p.altitude / 500) * 500;
    if (!altitudeBuckets[bucket]) altitudeBuckets[bucket] = [];
    altitudeBuckets[bucket].push(((p.pace - seaLevelBasePace) / seaLevelBasePace) * 100);
  });

  const altitudeDegradationCurve = Object.keys(altitudeBuckets)
    .map(Number)
    .sort((a, b) => a - b)
    .map(altitude => ({
      altitudeM: altitude,
      paceAdjustmentPct: altitudeBuckets[altitude].reduce((sum, val) => sum + val, 0) / altitudeBuckets[altitude].length,
    }));

  const maxTrainingAltitude = Math.max(...performancePoints.map(p => p.altitude));

  const acclimatizationDays = estimateAcclimatizationPeriod(performancePoints);

  const altitudeRange = maxTrainingAltitude - Math.min(...performancePoints.map(p => p.altitude));
  const confidenceScore = Math.min(
    100,
    (performancePoints.length / 30) * 50 + (altitudeRange / 2000) * 50
  );

  const profile: AltitudeProfile = {
    seaLevelBasePace,
    altitudeDegradationCurve,
    acclimatizationDays,
    maxTrainingAltitude,
    confidenceScore: Math.round(confidenceScore),
  };

  await saveAltitudeProfile(userId, profile);

  return profile;
}

function estimateAcclimatizationPeriod(
  performancePoints: { altitude: number; pace: number; date: string }[]
): number {
  const highAltitudeRuns = performancePoints.filter(p => p.altitude > 1500);

  if (highAltitudeRuns.length < 3) return 14;

  const sortedByDate = highAltitudeRuns.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const improvements: number[] = [];

  for (let i = 1; i < sortedByDate.length; i++) {
    const daysDiff = (new Date(sortedByDate[i].date).getTime() - new Date(sortedByDate[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 0 && daysDiff < 30) {
      const paceImprovement = sortedByDate[i - 1].pace - sortedByDate[i].pace;
      if (paceImprovement > 0) {
        improvements.push(daysDiff);
      }
    }
  }

  if (improvements.length === 0) return 14;

  const avgDays = improvements.reduce((sum, days) => sum + days, 0) / improvements.length;
  return Math.max(7, Math.min(21, Math.round(avgDays)));
}

export async function saveAltitudeProfile(
  userId: string,
  profile: AltitudeProfile
): Promise<void> {
  const supabase = getSupabase();

  if (!supabase) return;

  const { error } = await supabase
    .from('environmental_adaptations')
    .upsert({
      user_id: userId,
      adaptation_type: 'altitude_response',
      learned_coefficients: {
        seaLevelBasePace: profile.seaLevelBasePace,
        altitudeDegradationCurve: profile.altitudeDegradationCurve,
        acclimatizationDays: profile.acclimatizationDays,
        maxTrainingAltitude: profile.maxTrainingAltitude,
      },
      confidence_score: profile.confidenceScore,
      data_points_count: profile.altitudeDegradationCurve.length,
      last_updated: new Date().toISOString(),
    }, {
      onConflict: 'user_id,adaptation_type',
    });

  if (error) {
    console.error('Error saving altitude profile:', error);
  }
}

export function predictPaceAdjustmentForAltitude(
  profile: AltitudeProfile,
  targetAltitudeM: number
): number {
  if (profile.altitudeDegradationCurve.length === 0) {
    if (targetAltitudeM < 1000) return 0;
    return ((targetAltitudeM - 1000) / 1000) * 3;
  }

  const sortedCurve = [...profile.altitudeDegradationCurve].sort((a, b) => a.altitudeM - b.altitudeM);

  if (targetAltitudeM <= sortedCurve[0].altitudeM) {
    return sortedCurve[0].paceAdjustmentPct;
  }

  if (targetAltitudeM >= sortedCurve[sortedCurve.length - 1].altitudeM) {
    const lastPoint = sortedCurve[sortedCurve.length - 1];
    const extrapolation = ((targetAltitudeM - lastPoint.altitudeM) / 1000) * 2;
    return lastPoint.paceAdjustmentPct + extrapolation;
  }

  for (let i = 0; i < sortedCurve.length - 1; i++) {
    const lower = sortedCurve[i];
    const upper = sortedCurve[i + 1];

    if (targetAltitudeM >= lower.altitudeM && targetAltitudeM <= upper.altitudeM) {
      const ratio = (targetAltitudeM - lower.altitudeM) / (upper.altitudeM - lower.altitudeM);
      return lower.paceAdjustmentPct + ratio * (upper.paceAdjustmentPct - lower.paceAdjustmentPct);
    }
  }

  return 0;
}

export function estimateAcclimatizationSchedule(
  currentAltitude: number,
  targetAltitude: number,
  arrivalDaysBeforeRace: number,
  profile: AltitudeProfile
): { isAdequate: boolean; recommendation: string } {
  const altitudeDiff = targetAltitude - currentAltitude;

  if (altitudeDiff < 1000) {
    return {
      isAdequate: true,
      recommendation: 'Minimal altitude gain - no special acclimatization needed.',
    };
  }

  const recommendedDays = profile.acclimatizationDays || 14;

  if (arrivalDaysBeforeRace >= recommendedDays) {
    return {
      isAdequate: true,
      recommendation: `Excellent! ${arrivalDaysBeforeRace} days allows full acclimatization (${recommendedDays} days recommended for your profile).`,
    };
  }

  if (arrivalDaysBeforeRace >= recommendedDays * 0.7) {
    return {
      isAdequate: true,
      recommendation: `Adequate. ${arrivalDaysBeforeRace} days should allow partial acclimatization. Consider arriving ${Math.ceil(recommendedDays - arrivalDaysBeforeRace)} days earlier for optimal performance.`,
    };
  }

  if (arrivalDaysBeforeRace < 3) {
    return {
      isAdequate: false,
      recommendation: `Warning: Only ${arrivalDaysBeforeRace} days may not be enough. Consider arriving ${recommendedDays} days early, or arrive 1-2 days before (too short to trigger altitude sickness but not enough to acclimatize).`,
    };
  }

  return {
    isAdequate: false,
    recommendation: `Risky: ${arrivalDaysBeforeRace} days is in the "danger zone" for altitude sickness. Recommend arriving ${recommendedDays}+ days early or <48 hours before the race.`,
  };
}

export async function getAltitudeProfile(userId: string): Promise<AltitudeProfile | null> {
  const supabase = getSupabase();

  if (!supabase) return null;

  const { data, error } = await supabase
    .from('environmental_adaptations')
    .select('*')
    .eq('user_id', userId)
    .eq('adaptation_type', 'altitude_response')
    .single();

  if (error || !data) {
    return null;
  }

  const coefficients = data.learned_coefficients as any;

  return {
    seaLevelBasePace: coefficients.seaLevelBasePace,
    altitudeDegradationCurve: coefficients.altitudeDegradationCurve || [],
    acclimatizationDays: coefficients.acclimatizationDays,
    maxTrainingAltitude: coefficients.maxTrainingAltitude,
    confidenceScore: data.confidence_score,
  };
}
