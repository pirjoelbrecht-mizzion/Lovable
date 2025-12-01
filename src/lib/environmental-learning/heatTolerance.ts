import { getSupabase, getCurrentUserId } from '@/lib/supabase';

export interface HeatToleranceProfile {
  optimalTempC: number;
  heatThresholdC: number;
  paceAdjustmentCurve: { temp: number; adjustmentPct: number }[];
  acclimatizationRate: number;
  confidenceScore: number;
}

interface TemperaturePerformancePoint {
  temperature: number;
  pace: number;
  hr?: number;
  date: string;
}

function simpleLinearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } {
  if (points.length < 2) return { slope: 0, intercept: 0 };

  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

function detectAcclimatization(
  sortedData: TemperaturePerformancePoint[]
): number {
  const windowDays = 14;
  const improvements: number[] = [];

  for (let i = windowDays; i < sortedData.length; i++) {
    const recentWindow = sortedData.slice(i - windowDays, i);
    const previousWindow = sortedData.slice(Math.max(0, i - windowDays * 2), i - windowDays);

    if (previousWindow.length < 5 || recentWindow.length < 5) continue;

    const recentAvgPace = recentWindow.reduce((sum, p) => sum + p.pace, 0) / recentWindow.length;
    const previousAvgPace = previousWindow.reduce((sum, p) => sum + p.pace, 0) / previousWindow.length;

    const recentAvgTemp = recentWindow.reduce((sum, p) => sum + p.temperature, 0) / recentWindow.length;
    const previousAvgTemp = previousWindow.reduce((sum, p) => sum + p.temperature, 0) / previousWindow.length;

    if (recentAvgTemp > previousAvgTemp && recentAvgPace < previousAvgPace) {
      const improvement = (previousAvgPace - recentAvgPace) / previousAvgPace;
      improvements.push(improvement);
    }
  }

  if (improvements.length === 0) return 14;

  const avgImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
  const acclimatizationDays = Math.max(7, Math.min(21, 14 * (1 - avgImprovement * 10)));

  return Math.round(acclimatizationDays);
}

export async function learnHeatTolerance(
  userId: string
): Promise<HeatToleranceProfile> {
  const supabase = getSupabase();

  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const { data, error } = await supabase
    .from('environmental_training_data')
    .select('temperature_c, performance_metrics, log_entries(date)')
    .eq('user_id', userId)
    .not('temperature_c', 'is', null)
    .order('created_at', { ascending: true });

  if (error || !data || data.length < 10) {
    return {
      optimalTempC: 15,
      heatThresholdC: 25,
      paceAdjustmentCurve: [],
      acclimatizationRate: 14,
      confidenceScore: 0,
    };
  }

  const performancePoints: TemperaturePerformancePoint[] = data
    .filter(d => d.temperature_c && d.performance_metrics?.pace_min_km)
    .map(d => ({
      temperature: d.temperature_c!,
      pace: d.performance_metrics.pace_min_km,
      hr: d.performance_metrics.hr_avg,
      date: (d.log_entries as any)?.date || '',
    }));

  if (performancePoints.length < 10) {
    return {
      optimalTempC: 15,
      heatThresholdC: 25,
      paceAdjustmentCurve: [],
      acclimatizationRate: 14,
      confidenceScore: 0,
    };
  }

  const baselinePace = performancePoints
    .filter(p => p.temperature >= 10 && p.temperature <= 20)
    .reduce((sum, p, _, arr) => sum + p.pace / arr.length, 0);

  const normalizedPoints = performancePoints.map(p => ({
    x: p.temperature,
    y: ((p.pace - baselinePace) / baselinePace) * 100,
  }));

  const regression = simpleLinearRegression(normalizedPoints);

  const tempBuckets: { [key: number]: number[] } = {};
  performancePoints.forEach(p => {
    const bucket = Math.round(p.temperature / 5) * 5;
    if (!tempBuckets[bucket]) tempBuckets[bucket] = [];
    tempBuckets[bucket].push(((p.pace - baselinePace) / baselinePace) * 100);
  });

  const paceAdjustmentCurve = Object.keys(tempBuckets)
    .map(Number)
    .sort((a, b) => a - b)
    .map(temp => ({
      temp,
      adjustmentPct: tempBuckets[temp].reduce((sum, val) => sum + val, 0) / tempBuckets[temp].length,
    }));

  const optimalTempC = normalizedPoints.reduce((min, p) => p.y < min.y ? p : min, normalizedPoints[0]).x;

  const heatThresholdC = paceAdjustmentCurve.find(p => p.adjustmentPct > 5)?.temp || 25;

  const acclimatizationRate = detectAcclimatization(
    performancePoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  );

  const tempRange = Math.max(...performancePoints.map(p => p.temperature)) -
                    Math.min(...performancePoints.map(p => p.temperature));
  const confidenceScore = Math.min(
    100,
    (performancePoints.length / 50) * 50 + (tempRange / 30) * 50
  );

  const profile: HeatToleranceProfile = {
    optimalTempC: Math.round(optimalTempC),
    heatThresholdC: Math.round(heatThresholdC),
    paceAdjustmentCurve,
    acclimatizationRate,
    confidenceScore: Math.round(confidenceScore),
  };

  await saveHeatToleranceProfile(userId, profile);

  return profile;
}

export async function saveHeatToleranceProfile(
  userId: string,
  profile: HeatToleranceProfile
): Promise<void> {
  const supabase = getSupabase();

  if (!supabase) return;

  const { error } = await supabase
    .from('environmental_adaptations')
    .upsert({
      user_id: userId,
      adaptation_type: 'heat_tolerance',
      learned_coefficients: {
        optimalTempC: profile.optimalTempC,
        heatThresholdC: profile.heatThresholdC,
        paceAdjustmentCurve: profile.paceAdjustmentCurve,
        acclimatizationRate: profile.acclimatizationRate,
      },
      confidence_score: profile.confidenceScore,
      data_points_count: profile.paceAdjustmentCurve.length,
      last_updated: new Date().toISOString(),
    }, {
      onConflict: 'user_id,adaptation_type',
    });

  if (error) {
    console.error('Error saving heat tolerance profile:', error);
  }
}

export function predictPaceAdjustmentForTemp(
  profile: HeatToleranceProfile,
  targetTempC: number
): number {
  if (profile.paceAdjustmentCurve.length === 0) {
    if (targetTempC > 25) return ((targetTempC - 25) / 5) * 2;
    return 0;
  }

  const sortedCurve = [...profile.paceAdjustmentCurve].sort((a, b) => a.temp - b.temp);

  if (targetTempC <= sortedCurve[0].temp) {
    return sortedCurve[0].adjustmentPct;
  }

  if (targetTempC >= sortedCurve[sortedCurve.length - 1].temp) {
    return sortedCurve[sortedCurve.length - 1].adjustmentPct;
  }

  for (let i = 0; i < sortedCurve.length - 1; i++) {
    const lower = sortedCurve[i];
    const upper = sortedCurve[i + 1];

    if (targetTempC >= lower.temp && targetTempC <= upper.temp) {
      const ratio = (targetTempC - lower.temp) / (upper.temp - lower.temp);
      return lower.adjustmentPct + ratio * (upper.adjustmentPct - lower.adjustmentPct);
    }
  }

  return 0;
}

export async function getHeatToleranceProfile(userId: string): Promise<HeatToleranceProfile | null> {
  const supabase = getSupabase();

  if (!supabase) return null;

  const { data, error } = await supabase
    .from('environmental_adaptations')
    .select('*')
    .eq('user_id', userId)
    .eq('adaptation_type', 'heat_tolerance')
    .single();

  if (error || !data) {
    return null;
  }

  const coefficients = data.learned_coefficients as any;

  return {
    optimalTempC: coefficients.optimalTempC,
    heatThresholdC: coefficients.heatThresholdC,
    paceAdjustmentCurve: coefficients.paceAdjustmentCurve || [],
    acclimatizationRate: coefficients.acclimatizationRate,
    confidenceScore: data.confidence_score,
  };
}
