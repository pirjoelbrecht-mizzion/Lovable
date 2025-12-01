/**
 * Personalized GPX Analysis
 *
 * Helper utilities to integrate pace profiles with GPX route analysis
 */

import type { GPXPoint, PersonalizedPaceParams } from './gpxParser';
import { analyzeGPXRoute } from './gpxParser';
import { getOrCalculatePaceProfile } from '@/engine/historicalAnalysis/calculateUserPaceProfile';
import { analyzeUserActivities } from '@/engine/historicalAnalysis/analyzeActivityTerrain';

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
