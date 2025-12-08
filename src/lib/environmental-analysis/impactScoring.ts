/**
 * Heat Impact Scoring Algorithm
 *
 * Quantifies environmental stress magnitude and severity
 */

import type { PhysiologicalStress } from './stressDetection';
import type { TimeInZone, HumidityStrain, CoolingBenefit } from './heatMetrics';

export type SeverityLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface HeatImpactScore {
  overall_score: number; // 0-100
  severity: SeverityLevel;
  heat_stress_component: number; // 0-100
  physiological_stress_component: number; // 0-100
  humidity_strain_score: number; // 0-100
  cooling_benefit_score: number; // 0-100 (reduces negative impact)
}

const WEIGHTS = {
  hr_drift: 0.25,
  pace_degradation: 0.25,
  vam_decline: 0.15,
  cadence_drop: 0.15,
  time_in_danger: 0.10,
  humidity_strain: 0.10
};

/**
 * Calculates comprehensive heat impact score
 */
export function calculateHeatImpactScore(
  physiologicalStress: PhysiologicalStress,
  timeInZone: TimeInZone,
  humidityStrain: HumidityStrain,
  coolingBenefit: CoolingBenefit,
  activityDuration_minutes: number
): HeatImpactScore {
  // Calculate physiological stress component
  const physioScore = calculatePhysiologicalScore(physiologicalStress, activityDuration_minutes);

  // Calculate heat stress component
  const heatScore = calculateHeatStressScore(timeInZone, activityDuration_minutes);

  // Calculate humidity strain score
  const humidityScore = calculateHumidityScore(humidityStrain, activityDuration_minutes);

  // Calculate cooling benefit score
  const coolingScore = calculateCoolingScore(coolingBenefit, activityDuration_minutes);

  // Weighted overall score
  const overallScore = Math.max(
    0,
    physioScore * 0.4 + heatScore * 0.4 + humidityScore * 0.2 - coolingScore * 0.1
  );

  // Determine severity level
  const severity = determineSeverity(overallScore);

  return {
    overall_score: Math.round(overallScore),
    severity,
    heat_stress_component: Math.round(heatScore),
    physiological_stress_component: Math.round(physioScore),
    humidity_strain_score: Math.round(humidityScore),
    cooling_benefit_score: Math.round(coolingScore)
  };
}

/**
 * Calculates physiological stress component score
 */
function calculatePhysiologicalScore(
  physiologicalStress: PhysiologicalStress,
  duration_minutes: number
): number {
  let score = 0;

  // HR drift contribution
  if (physiologicalStress.hr_drift.detected) {
    const driftScore = Math.min(100, (physiologicalStress.hr_drift.magnitude_bpm / 20) * 100);
    const sustainedMultiplier = physiologicalStress.hr_drift.sustained ? 1.2 : 1.0;
    score += driftScore * WEIGHTS.hr_drift * sustainedMultiplier;
  }

  // Pace degradation contribution
  if (physiologicalStress.pace_degradation.detected) {
    const paceScore = Math.min(100, physiologicalStress.pace_degradation.degradation_percent * 2);
    const gradeAdjustedMultiplier = physiologicalStress.pace_degradation.controlled_for_grade ? 1.2 : 1.0;
    score += paceScore * WEIGHTS.pace_degradation * gradeAdjustedMultiplier;
  }

  // VAM decline contribution
  if (physiologicalStress.vam_decline.detected) {
    const vamScore = Math.min(100, physiologicalStress.vam_decline.decline_percent * 2);
    score += vamScore * WEIGHTS.vam_decline;
  }

  // Cadence drop contribution
  if (physiologicalStress.cadence_drop.detected) {
    const cadenceScore = Math.min(100, physiologicalStress.cadence_drop.drop_percent * 5);
    score += cadenceScore * WEIGHTS.cadence_drop;
  }

  return Math.min(100, score);
}

/**
 * Calculates heat stress component score
 */
function calculateHeatStressScore(timeInZone: TimeInZone, duration_minutes: number): number {
  let score = 0;

  // Time in danger zones (heavily weighted)
  const dangerPercent = (timeInZone.danger_minutes + timeInZone.extreme_danger_minutes) / duration_minutes;
  score += dangerPercent * 100 * WEIGHTS.time_in_danger * 10; // 10x multiplier for danger zones

  // Time in caution zones
  const cautionPercent = (timeInZone.caution_minutes + timeInZone.extreme_caution_minutes) / duration_minutes;
  score += cautionPercent * 100 * WEIGHTS.time_in_danger * 2; // 2x multiplier for caution zones

  return Math.min(100, score);
}

/**
 * Calculates humidity strain score
 */
function calculateHumidityScore(humidityStrain: HumidityStrain, duration_minutes: number): number {
  const humidityPercent = humidityStrain.time_above_80_minutes / duration_minutes;
  const humidityScore = humidityPercent * 100;

  // Additional penalty for extreme humidity
  const extremeHumidityBonus = humidityStrain.peak_humidity_percent > 90 ? 20 : 0;

  return Math.min(100, humidityScore + extremeHumidityBonus);
}

/**
 * Calculates cooling benefit score
 */
function calculateCoolingScore(coolingBenefit: CoolingBenefit, duration_minutes: number): number {
  if (!coolingBenefit.detected) return 0;

  const coolingPercent = coolingBenefit.total_cooling_time_minutes / duration_minutes;
  const coolingScore = coolingPercent * 100;

  // Bonus for significant cooling
  const significantCooling = coolingBenefit.elevation_gains.filter(g => g.performance_benefit_estimated).length;
  const significantCoolingBonus = significantCooling * 10;

  return Math.min(100, coolingScore + significantCoolingBonus);
}

/**
 * Determines severity level from overall score
 */
function determineSeverity(overallScore: number): SeverityLevel {
  if (overallScore >= 75) return 'EXTREME';
  if (overallScore >= 50) return 'HIGH';
  if (overallScore >= 25) return 'MODERATE';
  return 'LOW';
}

/**
 * Generates normalized score for comparison across activities
 */
export function normalizeScoreByDistance(
  score: HeatImpactScore,
  distance_km: number
): number {
  // Longer activities naturally accumulate more heat stress
  // Normalize to 50km baseline for comparison
  const baselineDistance = 50;
  const distanceFactor = Math.sqrt(distance_km / baselineDistance);

  return score.overall_score / distanceFactor;
}

/**
 * Compares current heat impact to athlete's historical tolerance
 */
export function compareToHistoricalTolerance(
  currentScore: HeatImpactScore,
  historicalScores: HeatImpactScore[]
): {
  percentile: number; // 0-100 (where athlete ranks)
  interpretation: string;
} {
  if (historicalScores.length === 0) {
    return {
      percentile: 50,
      interpretation: 'No historical data available for comparison'
    };
  }

  const sortedScores = historicalScores.map(s => s.overall_score).sort((a, b) => a - b);
  const lowerThan = sortedScores.filter(s => s < currentScore.overall_score).length;
  const percentile = (lowerThan / sortedScores.length) * 100;

  let interpretation = '';
  if (percentile < 25) {
    interpretation = 'Minimal heat stress compared to your typical activities';
  } else if (percentile < 50) {
    interpretation = 'Below average heat stress for you';
  } else if (percentile < 75) {
    interpretation = 'Above average heat stress for you';
  } else {
    interpretation = 'Among your most challenging heat conditions';
  }

  return { percentile, interpretation };
}

/**
 * Generates recommendations based on heat impact score
 */
export function generateRecommendations(score: HeatImpactScore): string[] {
  const recommendations: string[] = [];

  if (score.severity === 'EXTREME' || score.severity === 'HIGH') {
    recommendations.push('Consider heat acclimation training before similar events');
    recommendations.push('Start activities earlier in the day when possible');
    recommendations.push('Increase fluid and electrolyte intake strategy');
  }

  if (score.humidity_strain_score > 60) {
    recommendations.push('Focus on hydration pacing - humidity impairs cooling');
    recommendations.push('Consider ice vests or cooling towels for pre-cooling');
  }

  if (score.cooling_benefit_score > 40) {
    recommendations.push('Leverage elevation gains for active cooling and recovery');
    recommendations.push('Plan aid station stops after major climbs to capitalize on cooling');
  }

  if (score.physiological_stress_component > 70) {
    recommendations.push('Adjust pace expectations in similar conditions');
    recommendations.push('Monitor HR more closely in hot/humid conditions');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue current heat management strategies');
  }

  return recommendations;
}
