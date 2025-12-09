/**
 * Heat Acclimation Detection System
 *
 * Analyzes athlete's historical heat performance to calculate adaptation level
 */

import { supabase } from '../supabase';

export interface HeatAcclimationProfile {
  acclimationIndex: number; // 0-100 score
  recentHeatExposures: number; // Count of hot activities in last 30 days
  averageHeatTolerance: number; // Average heat stress score tolerated
  hrDriftImprovement: number; // Improvement in HR drift over time
  paceStabilityInHeat: number; // How well pace is maintained in heat
  lastUpdated: Date;
}

/**
 * Calculates heat acclimation index for an athlete
 *
 * Factors considered:
 * - Recent heat exposure frequency (last 30 days)
 * - HR drift magnitude trends
 * - Pace degradation patterns
 * - Historical heat performance
 *
 * @param userId - User ID
 * @returns Heat acclimation profile
 */
export async function calculateHeatAcclimationIndex(userId: string): Promise<HeatAcclimationProfile> {
  // Fetch recent activities with heat stress data (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: heatMetrics, error } = await supabase
    .from('race_heat_stress_metrics')
    .select(`
      log_entry_id,
      heat_impact_score,
      overall_severity,
      hr_drift_magnitude_bpm,
      pace_degradation_percent,
      avg_temperature_c,
      avg_humidity_percent,
      analyzed_at
    `)
    .eq('user_id', userId)
    .gte('analyzed_at', ninetyDaysAgo.toISOString())
    .order('analyzed_at', { ascending: true });

  if (error || !heatMetrics || heatMetrics.length === 0) {
    // No heat data available, return default moderate acclimation
    return {
      acclimationIndex: 50,
      recentHeatExposures: 0,
      averageHeatTolerance: 50,
      hrDriftImprovement: 0,
      paceStabilityInHeat: 50,
      lastUpdated: new Date()
    };
  }

  // Filter to significant heat exposures (temperature > 20C or high humidity)
  const significantHeatActivities = heatMetrics.filter(
    m => (m.avg_temperature_c || 0) > 20 || (m.avg_humidity_percent || 0) > 60
  );

  if (significantHeatActivities.length === 0) {
    return {
      acclimationIndex: 50,
      recentHeatExposures: 0,
      averageHeatTolerance: 50,
      hrDriftImprovement: 0,
      paceStabilityInHeat: 50,
      lastUpdated: new Date()
    };
  }

  // 1. Recent heat exposure frequency (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentHeatExposures = significantHeatActivities.filter(
    m => new Date(m.analyzed_at) >= thirtyDaysAgo
  ).length;

  // 2. Average heat tolerance (ability to handle high heat stress)
  const averageHeatTolerance = significantHeatActivities.reduce(
    (sum, m) => sum + (100 - (m.heat_impact_score || 50)),
    0
  ) / significantHeatActivities.length;

  // 3. HR drift improvement over time
  const hrDriftImprovement = calculateHRDriftTrend(significantHeatActivities);

  // 4. Pace stability in heat
  const paceStabilityInHeat = calculatePaceStability(significantHeatActivities);

  // Calculate composite acclimation index
  const acclimationIndex = calculateCompositeIndex({
    recentHeatExposures,
    averageHeatTolerance,
    hrDriftImprovement,
    paceStabilityInHeat
  });

  // Update user profile with new acclimation index
  await updateUserAcclimationIndex(userId, acclimationIndex);

  return {
    acclimationIndex,
    recentHeatExposures,
    averageHeatTolerance,
    hrDriftImprovement,
    paceStabilityInHeat,
    lastUpdated: new Date()
  };
}

/**
 * Calculates trend in HR drift magnitude (negative = improvement)
 */
function calculateHRDriftTrend(activities: any[]): number {
  if (activities.length < 2) return 0;

  const hrDrifts = activities
    .filter(a => a.hr_drift_magnitude_bpm !== null)
    .map(a => a.hr_drift_magnitude_bpm);

  if (hrDrifts.length < 2) return 0;

  // Compare first half vs second half
  const midpoint = Math.floor(hrDrifts.length / 2);
  const firstHalf = hrDrifts.slice(0, midpoint);
  const secondHalf = hrDrifts.slice(midpoint);

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  // Return improvement percentage (positive = better adaptation)
  if (avgFirst === 0) return 0;
  return ((avgFirst - avgSecond) / avgFirst) * 100;
}

/**
 * Calculates pace stability (lower degradation = better stability)
 */
function calculatePaceStability(activities: any[]): number {
  const paceDegradations = activities
    .filter(a => a.pace_degradation_percent !== null)
    .map(a => a.pace_degradation_percent);

  if (paceDegradations.length === 0) return 50;

  const avgDegradation = paceDegradations.reduce((a, b) => a + b, 0) / paceDegradations.length;

  // Convert degradation to stability score (lower degradation = higher score)
  // 0% degradation = 100, 20% degradation = 0
  return Math.max(0, Math.min(100, 100 - (avgDegradation / 20) * 100));
}

/**
 * Calculates composite acclimation index from factors
 */
function calculateCompositeIndex(factors: {
  recentHeatExposures: number;
  averageHeatTolerance: number;
  hrDriftImprovement: number;
  paceStabilityInHeat: number;
}): number {
  // Frequency score: 0-7+ exposures in last 30 days
  const frequencyScore = Math.min(100, (factors.recentHeatExposures / 7) * 100);

  // Tolerance score: already 0-100
  const toleranceScore = factors.averageHeatTolerance;

  // Improvement score: -50 to +50 range mapped to 0-100
  const improvementScore = Math.max(0, Math.min(100, 50 + factors.hrDriftImprovement));

  // Stability score: already 0-100
  const stabilityScore = factors.paceStabilityInHeat;

  // Weighted average
  const compositeIndex =
    frequencyScore * 0.3 +
    toleranceScore * 0.3 +
    improvementScore * 0.2 +
    stabilityScore * 0.2;

  return Math.round(Math.max(0, Math.min(100, compositeIndex)));
}

/**
 * Updates user profile with new heat acclimation index
 */
async function updateUserAcclimationIndex(userId: string, acclimationIndex: number): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ heat_acclimation_index: acclimationIndex })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update heat acclimation index:', error);
  } else {
    console.log(`[Heat Acclimation] Updated index for user ${userId}: ${acclimationIndex}/100`);
  }
}

/**
 * Fetches athlete's current heat acclimation index from profile
 */
export async function getAthleteHeatAcclimationIndex(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('heat_acclimation_index')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return 50; // Default moderate acclimation
  }

  return data.heat_acclimation_index || 50;
}
