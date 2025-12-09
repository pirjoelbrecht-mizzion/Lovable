import { saveFitnessIndex, getFitnessHistory, saveWeeklyMetric } from './database';
import { calculateWeeklyMetrics } from './loadAnalysis';
import type { DbFitnessIndex } from './database';

export type FitnessFactors = {
  volume: number;
  consistency: number;
  intensity: number;
  recovery: number;
};

function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = d.getDay();
  // Calculate days to subtract to get to Monday (week start)
  // If Sunday (0), go back 6 days. Otherwise go back (dayOfWeek - 1) days
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysToMonday);
  return d.toISOString().slice(0, 10);
}

export async function calculateFitnessIndex(
  date: string,
  weeklyKm: number,
  previousFitness?: number
): Promise<number> {
  const baseline = previousFitness || 50;
  const volumeComponent = (weeklyKm / 50) * 0.1;

  // Calculate environmental adjustment factor
  const envAdjustment = await calculateEnvironmentalAdjustment(date);

  // Apply environmental stress penalty (reduces fitness gains or increases fitness decay)
  const newFitness = (baseline * 0.9 + volumeComponent * 100) * (1 - envAdjustment);

  return Math.max(0, Math.min(100, newFitness));
}

async function calculateEnvironmentalAdjustment(weekStartDate: string): Promise<number> {
  try {
    const { supabase } = await import('./supabase');
    const { getCurrentUserId } = await import('./supabase');

    const userId = await getCurrentUserId();
    if (!userId) return 0;

    // Get week end date
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Get all activities in this week
    const { data: activities } = await supabase
      .from('log_entries')
      .select('id, date')
      .eq('user_id', userId)
      .gte('date', weekStartDate)
      .lt('date', weekEnd.toISOString().slice(0, 10));

    if (!activities || activities.length === 0) return 0;

    // Get heat stress metrics for activities
    const activityIds = activities.map(a => a.id);
    const { data: heatMetrics } = await supabase
      .from('race_heat_stress_metrics')
      .select('heat_impact_score, overall_severity')
      .in('log_entry_id', activityIds);

    if (!heatMetrics || heatMetrics.length === 0) return 0;

    // Calculate average heat stress
    const avgHeatImpact = heatMetrics.reduce((sum, m) => sum + (m.heat_impact_score || 0), 0) / heatMetrics.length;

    // Convert to adjustment factor (0-0.15 penalty)
    // 0-30: 0% penalty (comfortable conditions)
    // 30-50: 0-5% penalty (moderate stress)
    // 50-75: 5-10% penalty (high stress)
    // 75+: 10-15% penalty (extreme stress)
    if (avgHeatImpact < 30) return 0;
    if (avgHeatImpact < 50) return (avgHeatImpact - 30) / 400; // 0-5%
    if (avgHeatImpact < 75) return 0.05 + (avgHeatImpact - 50) / 500; // 5-10%
    return 0.10 + Math.min((avgHeatImpact - 75) / 500, 0.05); // 10-15%
  } catch (error) {
    console.error('Error calculating environmental adjustment:', error);
    return 0;
  }
}

export async function updateFitnessForWeek(weekStartDate: string): Promise<boolean> {
  const history = await getFitnessHistory(7);
  const previousFitness = history.length > 0
    ? history[history.length - 1].fitness_score
    : 50;

  const metrics = await calculateWeeklyMetrics(weekStartDate);

  const fitnessScore = await calculateFitnessIndex(
    weekStartDate,
    metrics.total_km,
    previousFitness
  );

  const factors: FitnessFactors = {
    volume: metrics.total_km,
    consistency: metrics.total_km > 0 ? 1 : 0,
    intensity: 0.5,
    recovery: 1 - Math.max(0, Math.min(1, (metrics.progression_ratio - 1) / 0.5)),
  };

  const fitnessIndex: DbFitnessIndex = {
    date: weekStartDate,
    fitness_score: fitnessScore,
    factors,
  };

  const saved = await saveFitnessIndex(fitnessIndex);

  if (saved) {
    await saveWeeklyMetric({
      week_start_date: weekStartDate,
      total_km: metrics.total_km,
      avg_hr: metrics.avg_hr,
      avg_rpe: metrics.avg_rpe,
      progression_ratio: metrics.progression_ratio,
    });
  }

  return saved;
}

export async function getFitnessTrend(days = 84): Promise<{
  date: string;
  fitness_score: number;
}[]> {
  const history = await getFitnessHistory(days);
  return history.map(h => ({
    date: h.date,
    fitness_score: h.fitness_score,
  }));
}

export async function getCurrentFitness(): Promise<number> {
  const history = await getFitnessHistory(1);
  if (history.length === 0) return 50;
  return history[0].fitness_score;
}

export async function recalculateFitnessHistory(startDate: string, endDate: string): Promise<void> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const weeks: string[] = [];

  let current = new Date(start);
  while (current <= end) {
    weeks.push(getWeekStartDate(current));
    current.setDate(current.getDate() + 7);
  }

  for (const weekStart of weeks) {
    await updateFitnessForWeek(weekStart);
  }
}
