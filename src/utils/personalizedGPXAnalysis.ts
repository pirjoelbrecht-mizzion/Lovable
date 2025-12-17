/**
 * Personalized GPX Analysis
 *
 * Helper utilities to integrate pace profiles with GPX route analysis.
 * Enhanced with ultra distance fatigue modeling and learning integration.
 */

import type { GPXPoint, PersonalizedPaceParams, GPXRouteAnalysis } from './gpxParser';
import { analyzeGPXRoute } from './gpxParser';
import { getOrCalculatePaceProfile } from '@/engine/historicalAnalysis/calculateUserPaceProfile';
import { analyzeUserActivities } from '@/engine/historicalAnalysis/analyzeActivityTerrain';
import {
  calculateUltraFatigue,
  estimateUltraFinishTime,
  getUltraDistanceCategory,
  type UltraFatigueResult,
} from '@/lib/ultra-distance/ultraFatigueModel';
import {
  generateDefaultAidStations,
  calculateTotalAidStationTime,
  estimateQuickAidStationTime,
  type RaceAidStationPlan,
} from '@/lib/ultra-distance/aidStationEstimation';
import { getCorrectionFactors, type CorrectionFactors } from '@/services/gpxCalibrationService';
import { getCurrentUserId } from '@/lib/supabase';

/**
 * Analyze GPX route with personalized pace if available
 *
 * This is the main entry point for GPX analysis with personalization.
 * It will automatically fetch/calculate the user's pace profile and use it
 * for more accurate time estimates.
 */
export async function analyzeGPXRoutePersonalized(
  points: GPXPoint[],
  userId?: string,
  fallbackPaceMinKm: number = 6.0
) {
  try {
    // First, ensure user's activities have been analyzed
    await analyzeUserActivities(userId);

    // Get or calculate pace profile
    const paceProfile = await getOrCalculatePaceProfile(userId);

    let personalizedParams: PersonalizedPaceParams | undefined;

    if (paceProfile && paceProfile.hasMinimumData) {
      // Convert pace profile to params format
      personalizedParams = {
        baseFlatPaceMinKm: paceProfile.baseFlatPaceMinKm,
        uphillAdjustmentFactor: paceProfile.uphillAdjustmentFactor,
        downhillAdjustmentFactor: paceProfile.downhillAdjustmentFactor,
        gradeBucketPaces: paceProfile.gradeBucketPaces,
      };
    }

    // Analyze with personalized params if available
    const analysis = analyzeGPXRoute(
      points,
      personalizedParams?.baseFlatPaceMinKm || fallbackPaceMinKm,
      personalizedParams
    );

    return {
      analysis,
      paceProfile,
      hasPersonalizedPace: !!personalizedParams,
    };
  } catch (err) {
    console.error('Error in personalized GPX analysis:', err);

    // Fallback to default analysis
    const analysis = analyzeGPXRoute(points, fallbackPaceMinKm);

    return {
      analysis,
      paceProfile: null,
      hasPersonalizedPace: false,
    };
  }
}

/**
 * Get time estimate with both default and personalized paces for comparison
 */
export async function compareGPXEstimates(
  points: GPXPoint[],
  userId?: string,
  defaultPaceMinKm: number = 6.0
) {
  try {
    // Get personalized analysis
    const { analysis: personalizedAnalysis, paceProfile } = await analyzeGPXRoutePersonalized(
      points,
      userId,
      defaultPaceMinKm
    );

    // Get default analysis
    const defaultAnalysis = analyzeGPXRoute(points, defaultPaceMinKm);

    // Calculate time difference
    const timeDifferenceMin = personalizedAnalysis.totalTimeEstimate - defaultAnalysis.totalTimeEstimate;
    const percentDifference = ((timeDifferenceMin / defaultAnalysis.totalTimeEstimate) * 100).toFixed(1);

    return {
      personalizedAnalysis,
      defaultAnalysis,
      paceProfile,
      comparison: {
        timeDifferenceMin: parseFloat(timeDifferenceMin.toFixed(2)),
        percentDifference: parseFloat(percentDifference),
        fasterWithPersonalized: timeDifferenceMin < 0,
        significantDifference: Math.abs(parseFloat(percentDifference)) > 5,
      },
    };
  } catch (err) {
    console.error('Error comparing GPX estimates:', err);
    return null;
  }
}

/**
 * Format pace confidence for display
 */
export function formatPaceConfidence(confidence: 'high' | 'medium' | 'low' | 'default'): string {
  switch (confidence) {
    case 'high':
      return 'High confidence - based on extensive historical data';
    case 'medium':
      return 'Medium confidence - based on moderate historical data';
    case 'low':
      return 'Low confidence - limited historical data available';
    case 'default':
      return 'Using default pace - no personalized data available';
  }
}

/**
 * Get a human-readable explanation of the pace calculation
 */
export function getPaceExplanation(
  usingPersonalizedPace: boolean,
  paceConfidence: 'high' | 'medium' | 'low' | 'default',
  sampleSize?: number,
  segmentCounts?: { uphill: number; downhill: number; flat: number }
): string {
  if (!usingPersonalizedPace) {
    return 'This estimate uses default pacing formulas. Track more activities with elevation data for personalized estimates.';
  }

  let explanation = `This estimate is personalized based on your ${sampleSize || 0} recent activities. `;

  if (segmentCounts) {
    explanation += `Analyzed ${segmentCounts.uphill} uphill, ${segmentCounts.downhill} downhill, and ${segmentCounts.flat} flat segments from your training. `;
  }

  switch (paceConfidence) {
    case 'high':
      explanation += 'High confidence prediction based on extensive terrain-matched data.';
      break;
    case 'medium':
      explanation += 'Moderate confidence prediction - more training data will improve accuracy.';
      break;
    case 'low':
      explanation += 'Initial prediction - track more activities for better accuracy.';
      break;
  }

  return explanation;
}

export interface UltraDistanceAnalysisParams {
  temperatureC?: number;
  humidity?: number;
  readinessScore?: number;
  athleteLongestUltraKm?: number;
  hasNightSection?: boolean;
  athleteExperienceLevel?: 'beginner' | 'intermediate' | 'experienced' | 'elite';
  customAidStationCount?: number;
  surfaceType?: 'road' | 'trail' | 'mixed' | 'mountain';
}

export interface UltraDistanceAnalysisResult {
  baseAnalysis: GPXRouteAnalysis;
  ultraAdjusted: {
    movingTimeMin: number;
    aidStationTimeMin: number;
    totalTimeMin: number;
    fatiguePenaltyMin: number;
    nightPenaltyMin: number;
    weatherPenaltyMin: number;
    totalAdjustmentPercent: number;
  };
  fatigue: UltraFatigueResult;
  aidStationPlan: RaceAidStationPlan;
  distanceCategory: ReturnType<typeof getUltraDistanceCategory>;
  learnedCorrections: CorrectionFactors | null;
  confidence: {
    overall: number;
    paceProfile: 'high' | 'medium' | 'low' | 'default';
    fatigueModel: number;
    hasLearnedCorrections: boolean;
  };
  breakdown: {
    baseMovingTime: number;
    fatiguePenalty: number;
    aidStations: number;
    nightPenalty: number;
    weatherPenalty: number;
    learnedAdjustment: number;
    total: number;
  };
  warnings: string[];
  recommendations: string[];
}

export async function analyzeGPXRouteForUltra(
  points: GPXPoint[],
  params: UltraDistanceAnalysisParams = {}
): Promise<UltraDistanceAnalysisResult> {
  const userId = await getCurrentUserId();

  const {
    temperatureC = 20,
    humidity = 50,
    readinessScore = 75,
    athleteLongestUltraKm,
    hasNightSection = false,
    athleteExperienceLevel = 'intermediate',
    customAidStationCount,
    surfaceType = 'trail',
  } = params;

  const { analysis: baseAnalysis, paceProfile, hasPersonalizedPace } =
    await analyzeGPXRoutePersonalized(points, userId || undefined);

  const distanceCategory = getUltraDistanceCategory(baseAnalysis.totalDistanceKm);

  let learnedCorrections: CorrectionFactors | null = null;
  if (userId) {
    learnedCorrections = await getCorrectionFactors(distanceCategory.category);
  }

  const userLongestUltra = athleteLongestUltraKm ||
    paceProfile?.longestActivityKm ||
    42.195;

  const fatigueResult = calculateUltraFatigue({
    distanceKm: baseAnalysis.totalDistanceKm,
    elapsedTimeHours: baseAnalysis.totalTimeEstimate / 60,
    elevationGainM: baseAnalysis.totalElevationGainM,
    temperatureC,
    humidity,
    readinessScore,
    athleteLongestUltraKm: userLongestUltra,
    isNightSection: hasNightSection,
  });

  const aidStations = generateDefaultAidStations(
    baseAnalysis.totalDistanceKm,
    baseAnalysis.totalElevationGainM
  );

  const aidStationPlan = calculateTotalAidStationTime(
    aidStations,
    baseAnalysis.totalDistanceKm,
    baseAnalysis.totalTimeEstimate,
    temperatureC,
    hasNightSection,
    athleteExperienceLevel
  );

  const actualAidStationCount = customAidStationCount ?? aidStations.length;
  const aidStationTimeMin = customAidStationCount
    ? estimateQuickAidStationTime(baseAnalysis.totalDistanceKm, athleteExperienceLevel) *
      (customAidStationCount / aidStations.length)
    : aidStationPlan.totalAidTimeMinutes;

  const ultraFinishEstimate = estimateUltraFinishTime(
    baseAnalysis.totalTimeEstimate,
    baseAnalysis.totalDistanceKm,
    baseAnalysis.totalElevationGainM,
    {
      temperatureC,
      humidity,
      readinessScore,
      athleteLongestUltraKm: userLongestUltra,
      hasNightSection,
      aidStationCount: actualAidStationCount,
    }
  );

  let learnedAdjustment = 0;
  if (learnedCorrections && learnedCorrections.calibrationCount > 0) {
    const terrainFactor = surfaceType === 'trail'
      ? learnedCorrections.terrainTrailFactor
      : surfaceType === 'mountain'
        ? learnedCorrections.terrainMountainFactor
        : learnedCorrections.terrainRoadFactor;

    const baseFatigueAdjustment =
      (learnedCorrections.baseFatigueFactor - 1) * baseAnalysis.totalTimeEstimate;
    const terrainAdjustment =
      (terrainFactor - 1) * baseAnalysis.totalTimeEstimate;
    const aidAdjustment =
      aidStationTimeMin * (learnedCorrections.aidStationTimeMultiplier - 1);

    let nightAdjustment = 0;
    if (hasNightSection) {
      nightAdjustment = baseAnalysis.totalTimeEstimate * 0.1 *
        (learnedCorrections.nightRunningFactor - 1);
    }

    let heatAdjustment = 0;
    if (temperatureC > 25) {
      heatAdjustment = baseAnalysis.totalTimeEstimate * 0.05 *
        (learnedCorrections.heatSensitivityFactor - 1);
    }

    learnedAdjustment = baseFatigueAdjustment + terrainAdjustment +
      aidAdjustment + nightAdjustment + heatAdjustment;
  }

  const totalTimeMin = ultraFinishEstimate.adjustedTimeMinutes + learnedAdjustment;
  const totalAdjustmentPercent =
    ((totalTimeMin - baseAnalysis.totalTimeEstimate) / baseAnalysis.totalTimeEstimate) * 100;

  const overallConfidence = calculateOverallConfidence(
    baseAnalysis.paceConfidence,
    fatigueResult.confidenceScore,
    learnedCorrections
  );

  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (baseAnalysis.totalDistanceKm > userLongestUltra * 1.5) {
    warnings.push(
      `This race is ${((baseAnalysis.totalDistanceKm / userLongestUltra - 1) * 100).toFixed(0)}% longer than your longest ultra - predictions have higher uncertainty`
    );
    recommendations.push('Consider a stepping-stone race at intermediate distance');
  }

  if (fatigueResult.glycogenDepletionPercent > 70) {
    warnings.push('High glycogen depletion predicted - nutrition strategy critical');
    recommendations.push('Plan fueling at 60-80g carbs/hour from early in race');
  }

  if (fatigueResult.paceDecayPercent > 30) {
    warnings.push(`Significant pace decay (${fatigueResult.paceDecayPercent.toFixed(0)}%) expected in final third`);
    recommendations.push('Start conservatively - save energy for final 30%');
  }

  if (hasNightSection && !learnedCorrections?.nightRunningFactor) {
    recommendations.push('Practice night running before race to calibrate night pace');
  }

  if (temperatureC > 28) {
    warnings.push('Hot conditions predicted - heat adaptation essential');
    recommendations.push('Pre-cool before start, plan extra cooling at aid stations');
  }

  recommendations.push(...aidStationPlan.recommendations);

  return {
    baseAnalysis,
    ultraAdjusted: {
      movingTimeMin: ultraFinishEstimate.breakdown.baseTime + ultraFinishEstimate.breakdown.fatiguePenalty,
      aidStationTimeMin,
      totalTimeMin,
      fatiguePenaltyMin: ultraFinishEstimate.breakdown.fatiguePenalty,
      nightPenaltyMin: ultraFinishEstimate.breakdown.nightPenalty,
      weatherPenaltyMin: ultraFinishEstimate.breakdown.weatherPenalty,
      totalAdjustmentPercent,
    },
    fatigue: fatigueResult,
    aidStationPlan,
    distanceCategory,
    learnedCorrections,
    confidence: {
      overall: overallConfidence,
      paceProfile: baseAnalysis.paceConfidence,
      fatigueModel: fatigueResult.confidenceScore,
      hasLearnedCorrections: !!learnedCorrections && learnedCorrections.calibrationCount > 0,
    },
    breakdown: {
      baseMovingTime: baseAnalysis.totalTimeEstimate,
      fatiguePenalty: ultraFinishEstimate.breakdown.fatiguePenalty,
      aidStations: aidStationTimeMin,
      nightPenalty: ultraFinishEstimate.breakdown.nightPenalty,
      weatherPenalty: ultraFinishEstimate.breakdown.weatherPenalty,
      learnedAdjustment,
      total: totalTimeMin,
    },
    warnings,
    recommendations,
  };
}

function calculateOverallConfidence(
  paceConfidence: 'high' | 'medium' | 'low' | 'default',
  fatigueConfidence: number,
  learnedCorrections: CorrectionFactors | null
): number {
  const paceScore = {
    high: 90,
    medium: 70,
    low: 50,
    default: 40,
  }[paceConfidence];

  let confidence = (paceScore + fatigueConfidence) / 2;

  if (learnedCorrections && learnedCorrections.calibrationCount > 0) {
    const learningBonus = Math.min(15, learnedCorrections.calibrationCount * 3);
    confidence = Math.min(95, confidence + learningBonus);
  }

  return Math.round(confidence);
}

export function formatUltraTimeBreakdown(result: UltraDistanceAnalysisResult): string {
  const { breakdown } = result;
  const formatTime = (min: number) => {
    const hrs = Math.floor(min / 60);
    const mins = Math.round(min % 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  let explanation = `Base moving time: ${formatTime(breakdown.baseMovingTime)}\n`;
  explanation += `+ Fatigue penalty: ${formatTime(breakdown.fatiguePenalty)}\n`;
  explanation += `+ Aid stations: ${formatTime(breakdown.aidStations)}\n`;

  if (breakdown.nightPenalty > 0) {
    explanation += `+ Night running: ${formatTime(breakdown.nightPenalty)}\n`;
  }
  if (breakdown.weatherPenalty > 0) {
    explanation += `+ Weather impact: ${formatTime(breakdown.weatherPenalty)}\n`;
  }
  if (breakdown.learnedAdjustment !== 0) {
    const sign = breakdown.learnedAdjustment > 0 ? '+' : '';
    explanation += `${sign} Learned adjustment: ${formatTime(Math.abs(breakdown.learnedAdjustment))}\n`;
  }

  explanation += `= Total: ${formatTime(breakdown.total)}`;

  return explanation;
}

export function getUltraPredictionExplanation(result: UltraDistanceAnalysisResult): string {
  const { distanceCategory, confidence, fatigue, learnedCorrections } = result;

  let explanation = `This ${distanceCategory.label} prediction uses:\n`;
  explanation += `- Personalized pace profile (${confidence.paceProfile} confidence)\n`;
  explanation += `- Ultra distance fatigue modeling (${fatigue.paceDecayPercent.toFixed(0)}% pace decay)\n`;
  explanation += `- Aid station time estimation\n`;

  if (confidence.hasLearnedCorrections && learnedCorrections) {
    explanation += `- Learned corrections from ${learnedCorrections.calibrationCount} past races\n`;
  }

  explanation += `\nOverall prediction confidence: ${confidence.overall}%`;

  if (result.warnings.length > 0) {
    explanation += `\n\nWarnings:\n${result.warnings.map(w => `- ${w}`).join('\n')}`;
  }

  return explanation;
}
