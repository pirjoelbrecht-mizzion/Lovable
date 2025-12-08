/**
 * Performance Comparison Engine
 *
 * Compares activity performance against user's historical baseline to generate insights:
 * - Grade-specific pace improvements/regressions
 * - Aerobic decoupling calculation
 * - HR drift on sustained efforts
 * - Heat strain analysis
 * - Efficiency scoring
 */

import { supabase } from '@/lib/supabase';
import type { TerrainAnalysis } from './terrainAnalysis';

// =====================================================================
//  TYPE DEFINITIONS
// =====================================================================

export interface UserPaceProfile {
  flatPace: number | null;
  rollingPace: number | null;
  uphill510Pace: number | null;
  uphill1020Pace: number | null;
  uphill20PlusPace: number | null;
  downhill512Pace: number | null;
  downhillSteepPace: number | null;
  technicalityModifier: number;
  downhillBrakingBaseline: number;
  heatAdjustmentFactor: number;
  aerobicThresholdHr: number | null;
  lactateThresholdHr: number | null;
  maxHr: number | null;
  activitiesCount: number;
  lastRecalculated: string;
}

export interface PerformanceAnalysis {
  aerobicDecouplingPercent: number | null;
  hrDriftBpm: number | null;
  fatigueScore: number | null;
  heatStrainScore: number | null;
  heatHrPenaltyBpm: number | null;
  uphillEfficiencyScore: number | null;
  downhillEfficiencyScore: number | null;
  overallEfficiencyScore: number | null;
  flatPaceVsBaselinePercent: number | null;
  uphillPaceVsBaselinePercent: number | null;
  downhillPaceVsBaselinePercent: number | null;
  insights: PerformanceInsight[];
  recommendations: AdaptiveRecommendation[];
}

export interface PerformanceInsight {
  type: 'improvement' | 'regression' | 'warning' | 'neutral';
  message: string;
  priority: 'high' | 'medium' | 'low';
  metric?: string;
  value?: number;
}

export interface AdaptiveRecommendation {
  action: string;
  reason: string;
  adjustment?: number;
  priority: 'high' | 'medium' | 'low';
}

// =====================================================================
//  PACE COMPARISON
// =====================================================================

/**
 * Compare activity pace to user baseline and generate insights
 */
export async function comparePaceToBaseline(
  terrain: TerrainAnalysis,
  userId: string
): Promise<{
  flatDiff: number | null;
  uphillDiff: number | null;
  downhillDiff: number | null;
  insights: PerformanceInsight[];
}> {
  // Load user pace profile
  const profile = await loadUserPaceProfile(userId);

  if (!profile) {
    return {
      flatDiff: null,
      uphillDiff: null,
      downhillDiff: null,
      insights: []
    };
  }

  const insights: PerformanceInsight[] = [];

  // Compare flat pace
  let flatDiff: number | null = null;
  if (terrain.paceFlat && profile.flatPace) {
    flatDiff = ((terrain.paceFlat - profile.flatPace) / profile.flatPace) * 100;
    if (Math.abs(flatDiff) > 5) {
      insights.push({
        type: flatDiff < 0 ? 'improvement' : 'regression',
        message: `Flat terrain pace ${flatDiff < 0 ? 'improved' : 'regressed'} by ${Math.abs(flatDiff).toFixed(1)}% vs baseline`,
        priority: Math.abs(flatDiff) > 10 ? 'high' : 'medium',
        metric: 'flat_pace',
        value: flatDiff
      });
    }
  }

  // Compare uphill pace (averaging steep and very steep)
  let uphillDiff: number | null = null;
  if (terrain.paceSteepUphill && profile.uphill1020Pace) {
    uphillDiff = ((terrain.paceSteepUphill - profile.uphill1020Pace) / profile.uphill1020Pace) * 100;
    if (Math.abs(uphillDiff) > 5) {
      insights.push({
        type: uphillDiff < 0 ? 'improvement' : 'regression',
        message: `Uphill pace ${uphillDiff < 0 ? 'improved' : 'regressed'} by ${Math.abs(uphillDiff).toFixed(1)}% vs baseline`,
        priority: Math.abs(uphillDiff) > 12 ? 'high' : 'medium',
        metric: 'uphill_pace',
        value: uphillDiff
      });
    }
  }

  // Compare downhill pace
  let downhillDiff: number | null = null;
  if (terrain.paceRunnableDownhill && profile.downhill512Pace) {
    downhillDiff = ((terrain.paceRunnableDownhill - profile.downhill512Pace) / profile.downhill512Pace) * 100;
    if (Math.abs(downhillDiff) > 5) {
      insights.push({
        type: downhillDiff < 0 ? 'improvement' : 'regression',
        message: `Downhill pace ${downhillDiff < 0 ? 'improved' : 'regressed'} by ${Math.abs(downhillDiff).toFixed(1)}% vs baseline`,
        priority: 'medium',
        metric: 'downhill_pace',
        value: downhillDiff
      });
    }
  }

  return { flatDiff, uphillDiff, downhillDiff, insights };
}

// =====================================================================
//  AEROBIC DECOUPLING
// =====================================================================

/**
 * Calculate aerobic decoupling (HR drift relative to pace)
 * Compares first half vs second half of activity
 */
export function computeAerobicDecoupling(
  hrSeries: number[] | null,
  velocitySeries: number[] | null
): number | null {
  if (!hrSeries || !velocitySeries || hrSeries.length < 20) {
    return null;
  }

  const midPoint = Math.floor(hrSeries.length / 2);

  // First half
  const firstHalfHr = hrSeries.slice(0, midPoint).filter(hr => hr > 0);
  const firstHalfVel = velocitySeries.slice(0, midPoint).filter(v => v > 0);

  if (firstHalfHr.length === 0 || firstHalfVel.length === 0) return null;

  const firstHalfAvgHr = average(firstHalfHr);
  const firstHalfAvgVel = average(firstHalfVel);
  const firstHalfRatio = firstHalfAvgHr / firstHalfAvgVel;

  // Second half
  const secondHalfHr = hrSeries.slice(midPoint).filter(hr => hr > 0);
  const secondHalfVel = velocitySeries.slice(midPoint).filter(v => v > 0);

  if (secondHalfHr.length === 0 || secondHalfVel.length === 0) return null;

  const secondHalfAvgHr = average(secondHalfHr);
  const secondHalfAvgVel = average(secondHalfVel);
  const secondHalfRatio = secondHalfAvgHr / secondHalfAvgVel;

  // Decoupling percentage
  const decoupling = ((secondHalfRatio - firstHalfRatio) / firstHalfRatio) * 100;

  return Math.round(decoupling * 10) / 10; // Round to 1 decimal
}

// =====================================================================
//  HR DRIFT
// =====================================================================

/**
 * Calculate HR drift on sustained climbing efforts
 */
export function computeHRDrift(
  hrSeries: number[] | null,
  gradeSeries: number[] | null
): number | null {
  if (!hrSeries || !gradeSeries || hrSeries.length < 20) {
    return null;
  }

  // Find sustained climbing segments (grade > 5% for at least 2 minutes)
  const climbingSegments: number[][] = [];
  let currentSegment: number[] = [];

  gradeSeries.forEach((grade, i) => {
    if (grade > 5 && hrSeries[i] > 0) {
      currentSegment.push(i);
    } else {
      if (currentSegment.length >= 120) { // At least 2 minutes
        climbingSegments.push(currentSegment);
      }
      currentSegment = [];
    }
  });

  // Add last segment if valid
  if (currentSegment.length >= 120) {
    climbingSegments.push(currentSegment);
  }

  if (climbingSegments.length === 0) return null;

  // Calculate HR drift for longest climbing segment
  const longestSegment = climbingSegments.reduce((a, b) => a.length > b.length ? a : b);

  const firstQuarterEnd = Math.floor(longestSegment.length / 4);
  const lastQuarterStart = longestSegment.length - firstQuarterEnd;

  const firstQuarterHr = longestSegment.slice(0, firstQuarterEnd).map(i => hrSeries[i]);
  const lastQuarterHr = longestSegment.slice(lastQuarterStart).map(i => hrSeries[i]);

  const firstAvg = average(firstQuarterHr);
  const lastAvg = average(lastQuarterHr);

  return Math.round(lastAvg - firstAvg);
}

// =====================================================================
//  HEAT STRAIN
// =====================================================================

/**
 * Calculate heat strain score based on HR deviation vs expected
 */
export function computeHeatStrain(
  hrAvg: number | null,
  temperature: number | null,
  humidity: number | null,
  baselineHr: number | null
): { score: number; penalty: number } | null {
  if (!hrAvg || !temperature || !baselineHr) {
    return null;
  }

  // Expected HR increase per degree above 20°C
  const tempAbove20 = Math.max(0, temperature - 20);
  const expectedHrIncrease = tempAbove20 * 0.5; // Roughly 0.5 bpm per degree

  // Humidity adjustment (increases heat strain)
  const humidityFactor = humidity ? 1 + (humidity - 50) / 100 : 1;

  const expectedHr = baselineHr + (expectedHrIncrease * humidityFactor);
  const actualPenalty = hrAvg - expectedHr;

  // Score from 0 (no strain) to 100 (severe strain)
  const strainScore = Math.max(0, Math.min(100, actualPenalty * 5));

  return {
    score: Math.round(strainScore),
    penalty: Math.round(actualPenalty)
  };
}

// =====================================================================
//  EFFICIENCY SCORES
// =====================================================================

/**
 * Calculate efficiency scores compared to baseline
 */
export function computeEfficiencyScores(
  paceComparison: { flatDiff: number | null; uphillDiff: number | null; downhillDiff: number | null },
  downhillBrakingScore: number | null,
  baselineBraking: number
): {
  uphillEfficiency: number | null;
  downhillEfficiency: number | null;
  overallEfficiency: number | null;
} {
  // Uphill efficiency: inverse of pace difference (faster = better)
  const uphillEfficiency = paceComparison.uphillDiff !== null
    ? Math.max(0, Math.min(2, 1.0 - (paceComparison.uphillDiff / 100)))
    : null;

  // Downhill efficiency: combination of pace and braking
  let downhillEfficiency: number | null = null;
  if (paceComparison.downhillDiff !== null && downhillBrakingScore !== null) {
    const paceComponent = 1.0 - (paceComparison.downhillDiff / 100);
    const brakingComponent = 1.0 - (downhillBrakingScore - baselineBraking);
    downhillEfficiency = Math.max(0, Math.min(2, (paceComponent + brakingComponent) / 2));
  }

  // Overall efficiency: weighted average
  const efficiencies = [uphillEfficiency, downhillEfficiency].filter(e => e !== null) as number[];
  const overallEfficiency = efficiencies.length > 0
    ? average(efficiencies)
    : null;

  return {
    uphillEfficiency,
    downhillEfficiency,
    overallEfficiency
  };
}

// =====================================================================
//  MAIN ANALYSIS FUNCTION
// =====================================================================

/**
 * Perform complete performance analysis
 */
export async function analyzePerformance(
  logEntryId: string,
  terrain: TerrainAnalysis,
  streams: any,
  activityData: { hrAvg?: number; temperature?: number; humidity?: number }
): Promise<PerformanceAnalysis> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Load user profile
  const profile = await loadUserPaceProfile(user.id);

  // 1. Compare pace to baseline
  const paceComparison = await comparePaceToBaseline(terrain, user.id);
  const insights = [...paceComparison.insights];

  // 2. Calculate aerobic decoupling
  const aerobicDecoupling = computeAerobicDecoupling(
    streams.heartrate_series,
    streams.velocity_series
  );

  if (aerobicDecoupling !== null && aerobicDecoupling > 7) {
    insights.push({
      type: 'warning',
      message: `Aerobic decoupling of ${aerobicDecoupling.toFixed(1)}% indicates fatigue`,
      priority: aerobicDecoupling > 10 ? 'high' : 'medium',
      metric: 'aerobic_decoupling',
      value: aerobicDecoupling
    });
  }

  // 3. Calculate HR drift
  const hrDrift = computeHRDrift(streams.heartrate_series, streams.grade_series);

  if (hrDrift !== null && hrDrift > 8) {
    insights.push({
      type: 'warning',
      message: `HR drift of ${hrDrift} bpm on climbs suggests building fatigue`,
      priority: 'medium',
      metric: 'hr_drift',
      value: hrDrift
    });
  }

  // 4. Calculate heat strain
  const heatStrain = profile?.aerobicThresholdHr
    ? computeHeatStrain(activityData.hrAvg || null, activityData.temperature || null, activityData.humidity || null, profile.aerobicThresholdHr)
    : null;

  if (heatStrain && heatStrain.score > 50) {
    insights.push({
      type: 'warning',
      message: `High heat strain detected (${heatStrain.penalty} bpm HR penalty)`,
      priority: heatStrain.score > 70 ? 'high' : 'medium',
      metric: 'heat_strain',
      value: heatStrain.score
    });
  }

  // 5. Calculate efficiency scores
  const efficiency = computeEfficiencyScores(
    paceComparison,
    terrain.downhillBrakingScore,
    profile?.downhillBrakingBaseline || 0
  );

  if (efficiency.downhillEfficiency !== null && efficiency.downhillEfficiency < 0.8) {
    insights.push({
      type: 'neutral',
      message: 'Downhill efficiency could be improved with technique work',
      priority: 'low',
      metric: 'downhill_efficiency',
      value: efficiency.downhillEfficiency
    });
  }

  // 6. Generate adaptive recommendations
  const recommendations = generateRecommendations(insights, aerobicDecoupling, heatStrain);

  // 7. Calculate fatigue score (0-100)
  const fatigueScore = calculateFatigueScore(aerobicDecoupling, hrDrift, heatStrain);

  // Build complete analysis
  const analysis: PerformanceAnalysis = {
    aerobicDecouplingPercent: aerobicDecoupling,
    hrDriftBpm: hrDrift,
    fatigueScore,
    heatStrainScore: heatStrain?.score || null,
    heatHrPenaltyBpm: heatStrain?.penalty || null,
    uphillEfficiencyScore: efficiency.uphillEfficiency,
    downhillEfficiencyScore: efficiency.downhillEfficiency,
    overallEfficiencyScore: efficiency.overallEfficiency,
    flatPaceVsBaselinePercent: paceComparison.flatDiff,
    uphillPaceVsBaselinePercent: paceComparison.uphillDiff,
    downhillPaceVsBaselinePercent: paceComparison.downhillDiff,
    insights,
    recommendations
  };

  // Store analysis in database
  await storePerformanceAnalysis(logEntryId, analysis);

  return analysis;
}

// =====================================================================
//  RECOMMENDATIONS ENGINE
// =====================================================================

function generateRecommendations(
  insights: PerformanceInsight[],
  aerobicDecoupling: number | null,
  heatStrain: { score: number; penalty: number } | null
): AdaptiveRecommendation[] {
  const recommendations: AdaptiveRecommendation[] = [];

  // High aerobic decoupling → reduce tomorrow's intensity
  if (aerobicDecoupling !== null && aerobicDecoupling > 9) {
    recommendations.push({
      action: 'reduce_tomorrow_intensity',
      reason: 'High aerobic decoupling indicates significant fatigue',
      adjustment: -15,
      priority: 'high'
    });
  }

  // High heat strain → add heat adaptation protocol
  if (heatStrain && heatStrain.score > 60) {
    recommendations.push({
      action: 'add_heat_adaptation',
      reason: `Significant heat strain detected (HR penalty: ${heatStrain.penalty} bpm)`,
      priority: 'medium'
    });
  }

  // Downhill braking detected → schedule technique session
  const brakingInsight = insights.find(i => i.metric === 'downhill_efficiency' && i.type === 'neutral');
  if (brakingInsight) {
    recommendations.push({
      action: 'schedule_downhill_technique',
      reason: 'Downhill efficiency can be improved',
      priority: 'low'
    });
  }

  return recommendations;
}

function calculateFatigueScore(
  aerobicDecoupling: number | null,
  hrDrift: number | null,
  heatStrain: { score: number } | null
): number {
  let score = 0;

  if (aerobicDecoupling !== null) {
    score += Math.min(40, aerobicDecoupling * 3);
  }

  if (hrDrift !== null) {
    score += Math.min(30, hrDrift * 2);
  }

  if (heatStrain) {
    score += Math.min(30, heatStrain.score * 0.3);
  }

  return Math.min(100, Math.round(score));
}

// =====================================================================
//  DATABASE OPERATIONS
// =====================================================================

async function loadUserPaceProfile(userId: string): Promise<UserPaceProfile | null> {
  const { data, error } = await supabase
    .from('user_pace_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    flatPace: data.flat_pace,
    rollingPace: data.rolling_pace,
    uphill510Pace: data.uphill_5_10_pace,
    uphill1020Pace: data.uphill_10_20_pace,
    uphill20PlusPace: data.uphill_20_plus_pace,
    downhill512Pace: data.downhill_5_12_pace,
    downhillSteepPace: data.downhill_steep_pace,
    technicalityModifier: data.technicality_modifier || 1.0,
    downhillBrakingBaseline: data.downhill_braking_baseline || 0,
    heatAdjustmentFactor: data.heat_adjustment_factor || 1.0,
    aerobicThresholdHr: data.aerobic_threshold_hr,
    lactateThresholdHr: data.lactate_threshold_hr,
    maxHr: data.max_hr,
    activitiesCount: data.activities_count || 0,
    lastRecalculated: data.last_recalculated
  };
}

async function storePerformanceAnalysis(
  logEntryId: string,
  analysis: PerformanceAnalysis
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('activity_performance_analysis')
    .upsert({
      user_id: user.id,
      log_entry_id: logEntryId,
      aerobic_decoupling_percent: analysis.aerobicDecouplingPercent,
      hr_drift_bpm: analysis.hrDriftBpm,
      fatigue_score: analysis.fatigueScore,
      heat_strain_score: analysis.heatStrainScore,
      heat_hr_penalty_bpm: analysis.heatHrPenaltyBpm,
      uphill_efficiency_score: analysis.uphillEfficiencyScore,
      downhill_efficiency_score: analysis.downhillEfficiencyScore,
      overall_efficiency_score: analysis.overallEfficiencyScore,
      flat_pace_vs_baseline_percent: analysis.flatPaceVsBaselinePercent,
      uphill_pace_vs_baseline_percent: analysis.uphillPaceVsBaselinePercent,
      downhill_pace_vs_baseline_percent: analysis.downhillPaceVsBaselinePercent,
      insights: analysis.insights as any,
      recommendations: analysis.recommendations as any,
      analysis_version: '1.0',
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'log_entry_id'
    });

  if (error) {
    console.error('Error storing performance analysis:', error);
  }
}

// =====================================================================
//  UTILITY FUNCTIONS
// =====================================================================

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
