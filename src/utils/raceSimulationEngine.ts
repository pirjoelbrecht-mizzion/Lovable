/**
 * Unified Race Simulation Engine
 *
 * Core simulation logic that processes RacePlan inputs and generates outputs.
 * Used by both Race Mode and What-If Simulator for consistent predictions.
 */

import type { RacePlan, SimulationFactors, SimulationOutputs } from '@/types/racePlanV2';
import { getLogEntriesByDateRange } from '@/lib/database';
import { calculateReadinessScore } from '@/utils/readiness';
import { findBestBaselineRace } from '@/utils/raceProjection';
import { getRaceWeatherForecast } from '@/utils/raceWeather';
import {
  calculateTrainingConsistency,
  analyzeLongRuns,
  calculateTaperQuality,
  applyPerformanceModifiers,
  createPerformanceFactor,
} from '@/utils/performanceFactors';
import { heatIndexC, heatPaceNudgePct } from '@/utils/weather';
import { getStartPaceFactor, getStrategyFatigueFactor } from '@/utils/startingStrategy';
import { getHeatToleranceProfile, predictPaceAdjustmentForTemp } from '@/lib/environmental-learning/heatTolerance';
import { getAltitudeProfile, predictPaceAdjustmentForAltitude } from '@/lib/environmental-learning/altitudeResponse';
import { getCurrentUserId } from '@/lib/supabase';

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);

  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function formatPace(paceMinPerKm: number): string {
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.floor((paceMinPerKm % 1) * 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// ============================================================================
// FACTOR CALCULATIONS
// ============================================================================

function calculateTerrainFactor(surfaceType: string): number {
  if (surfaceType === 'trail') return 1.12;
  if (surfaceType === 'mixed') return 1.06;
  return 1.0;
}

function calculateElevationFactor(elevationGain: number, distanceKm: number): number {
  if (!elevationGain || !distanceKm) return 1.0;

  const elevPerKm = elevationGain / distanceKm;

  if (elevPerKm < 10) return 1.0;
  if (elevPerKm < 20) return 1.02;
  if (elevPerKm < 30) return 1.05;
  if (elevPerKm < 50) return 1.10;
  return 1.15;
}

async function calculateClimateFactor(temperature: number, humidity: number): Promise<number> {
  const userId = await getCurrentUserId();

  if (userId) {
    const heatProfile = await getHeatToleranceProfile(userId);
    if (heatProfile && heatProfile.confidenceScore >= 50) {
      const adjustmentPct = predictPaceAdjustmentForTemp(heatProfile, temperature);
      return 1.0 + (adjustmentPct / 100);
    }
  }

  const heatIndex = heatIndexC(temperature, humidity);
  const paceNudge = heatPaceNudgePct(heatIndex);
  return 1.0 + paceNudge;
}

async function calculateAltitudeFactor(altitudeM: number): Promise<number> {
  const userId = await getCurrentUserId();

  if (userId) {
    const altitudeProfile = await getAltitudeProfile(userId);
    if (altitudeProfile && altitudeProfile.confidenceScore >= 50) {
      const adjustmentPct = predictPaceAdjustmentForAltitude(altitudeProfile, altitudeM);
      return 1.0 + (adjustmentPct / 100);
    }
  }

  if (altitudeM < 1000) return 1.0;
  return 1.0 + ((altitudeM - 1000) / 1000) * 0.03;
}

function calculateFatiguePenalty(readiness: number): number {
  return 1 + (100 - readiness) / 400;
}

function calculateStartStrategyFactor(
  startStrategy?: 'conservative' | 'target' | 'aggressive',
  distanceKm?: number
): number {
  if (!startStrategy || startStrategy === 'target' || !distanceKm) return 1.0;

  const avgProgress = 0.5;
  const paceAdj = getStartPaceFactor(startStrategy, avgProgress);
  const fatigueAdj = getStrategyFatigueFactor(startStrategy, avgProgress);

  return paceAdj * fatigueAdj;
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

function calculateConfidenceLevel(
  weeksToRace: number,
  fitnessLevel: number,
  readiness: number
): { level: 'high' | 'medium' | 'low'; score: number } {
  const timeScore = weeksToRace >= 4 && weeksToRace <= 16 ? 1.0 : 0.7;
  const fitnessScore = fitnessLevel;
  const readinessScore = readiness / 100;

  const overallScore = (timeScore + fitnessScore + readinessScore) / 3;

  let level: 'high' | 'medium' | 'low';
  if (overallScore >= 0.75) level = 'high';
  else if (overallScore >= 0.5) level = 'medium';
  else level = 'low';

  return { level, score: overallScore };
}

// ============================================================================
// MAIN SIMULATION ENGINE
// ============================================================================

export interface SimulationEngineOptions {
  useTrainingData?: boolean;
  useWeatherForecast?: boolean;
  usePerformanceFactors?: boolean;
}

/**
 * Run race simulation and populate outputs in RacePlan
 */
export async function runRaceSimulation(
  plan: RacePlan,
  options: SimulationEngineOptions = {}
): Promise<RacePlan> {
  const {
    useTrainingData = true,
    useWeatherForecast = true,
    usePerformanceFactors = true,
  } = options;

  try {
    // Get baseline race for projection
    const baseline = await findBestBaselineRace();
    if (!baseline) {
      throw new Error('No baseline race found for projection');
    }

    // Calculate base prediction using Riegel's formula
    const distanceRatio = plan.race.distanceKm / baseline.distanceKm;
    const basePrediction = baseline.timeMin * Math.pow(distanceRatio, 1.06);

    // Calculate simulation factors
    const terrainFactor = calculateTerrainFactor(plan.inputs.conditions.surfaceType);
    const elevationFactor = calculateElevationFactor(
      plan.inputs.conditions.elevationGain,
      plan.race.distanceKm
    );
    const climateFactor = calculateClimateFactor(
      plan.inputs.conditions.temperature,
      plan.inputs.conditions.humidity
    );
    const fatiguePenalty = calculateFatiguePenalty(plan.inputs.conditions.readiness);
    const startStrategyFactor = calculateStartStrategyFactor(
      plan.inputs.overrides?.startStrategy,
      plan.race.distanceKm
    );

    // Apply all factors
    let predictedTimeMin = basePrediction * terrainFactor * elevationFactor *
                           climateFactor * fatiguePenalty * startStrategyFactor;

    // Extended performance analysis (if enabled)
    let extendedFactors;
    let performanceFactors;

    if (usePerformanceFactors && useTrainingData) {
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 56);
      const entries = await getLogEntriesByDateRange(
        startDate.toISOString().slice(0, 10),
        endDate
      );

      const readinessScore = await calculateReadinessScore();
      const consistency = await calculateTrainingConsistency(entries, 8);
      const longRuns = await analyzeLongRuns(entries, plan.race.distanceKm);
      const taper = plan.race.dateISO
        ? await calculateTaperQuality(entries, plan.race.dateISO)
        : null;

      let weather;
      if (useWeatherForecast && plan.race.dateISO) {
        weather = await getRaceWeatherForecast({
          id: plan.race.id,
          name: plan.race.name,
          distanceKm: plan.race.distanceKm,
          dateISO: plan.race.dateISO,
        });
      }

      const performanceContext = {
        fitnessScore: readinessScore.value,
        consistency,
        longRuns,
        taper: taper || {
          daysToRace: 30,
          loadDecline: 0.2,
          taperQuality: 0.8,
          peakLoadWeek: 0,
          currentLoad: 0,
        },
        weather: weather || {
          temperature: plan.inputs.conditions.temperature,
          humidity: plan.inputs.conditions.humidity,
          windSpeed: plan.inputs.conditions.windSpeed || 10,
          precipitation: plan.inputs.conditions.precipitation || 0,
          heatIndex: heatIndexC(
            plan.inputs.conditions.temperature,
            plan.inputs.conditions.humidity
          ),
          conditions: 'Moderate',
          source: 'manual' as const,
        },
        altitude: {
          raceAltitude: plan.inputs.conditions.altitude || 0,
          trainingAltitude: 0,
          acclimatization: 0,
          altitudeFactor: 1.0,
        },
        course: {
          distanceKm: plan.race.distanceKm,
          elevationGain: plan.inputs.conditions.elevationGain,
          surface: plan.inputs.conditions.surfaceType,
        },
      };

      const { adjustedTime, factors } = applyPerformanceModifiers(
        basePrediction,
        performanceContext
      );

      predictedTimeMin = adjustedTime;
      extendedFactors = factors;

      // Build performance factors array
      performanceFactors = [
        createPerformanceFactor(
          'Fitness',
          factors.fitness,
          readinessScore.value >= 80 ? 'Strong fitness level' : 'Building fitness',
          `Current fitness: ${readinessScore.value}/100`,
          '💪',
          'calculated',
          'high'
        ),
        createPerformanceFactor(
          'Consistency',
          factors.consistency,
          consistency.consistencyScore > 0.7 ? 'Consistent training' : 'Variable training',
          `Training consistency: ${Math.round(consistency.consistencyScore * 100)}%`,
          '📊',
          'training',
          'high'
        ),
        createPerformanceFactor(
          'Long Runs',
          factors.longRun,
          longRuns.raceDistanceRatio >= 0.6 ? 'Well prepared' : 'Build long run volume',
          `Longest run: ${longRuns.maxLongRun.toFixed(1)}km`,
          '🏃',
          'training',
          'high'
        ),
        createPerformanceFactor(
          'Weather',
          factors.weather,
          weather ? weather.conditions : 'Estimated',
          `${plan.inputs.conditions.temperature}°C, ${plan.inputs.conditions.humidity}% humidity`,
          '🌡️',
          weather ? weather.source : 'manual',
          'medium'
        ),
      ];
    }

    // Calculate confidence
    const weeksToRace = plan.race.dateISO
      ? Math.floor((new Date(plan.race.dateISO).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
      : 8;

    const confidence = calculateConfidenceLevel(
      weeksToRace,
      plan.inputs.conditions.readiness / 100,
      plan.inputs.conditions.readiness
    );

    // Build factors object
    const factors: SimulationFactors = {
      terrainFactor,
      elevationFactor,
      climateFactor,
      fatiguePenalty,
      confidence: confidence.score,
    };

    // Calculate pace
    const avgPace = predictedTimeMin / plan.race.distanceKm;

    // Generate message
    const message = generateSimulationMessage(
      predictedTimeMin,
      plan.inputs.conditions.readiness,
      confidence.level
    );

    // Build outputs
    const outputs: SimulationOutputs = {
      predictedTimeMin,
      predictedTimeFormatted: formatTime(predictedTimeMin),
      avgPace,
      paceFormatted: formatPace(avgPace),
      factors,
      performance: performanceFactors && extendedFactors ? {
        combinedPenaltyPercent: ((predictedTimeMin / basePrediction) - 1) * 100,
        performanceFactors,
        extended: {
          trainingConsistency: extendedFactors.consistency,
          longRunQuality: extendedFactors.longRun,
          taperQuality: extendedFactors.taper,
          experience: 1.0,
          weatherImpact: extendedFactors.weather,
        },
      } : undefined,
    };

    // Return updated plan
    return {
      ...plan,
      outputs,
      ui: {
        ...plan.ui,
        message,
        confidence: confidence.level,
      },
      metadata: {
        ...plan.metadata,
        updated_at: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('Error in race simulation:', err);
    throw err;
  }
}

function generateSimulationMessage(
  predictedTimeMin: number,
  readiness: number,
  confidence: 'high' | 'medium' | 'low'
): string {
  const timeStr = formatTime(predictedTimeMin);

  if (readiness >= 80) {
    return `Peak form - projected ${timeStr} with ${confidence} confidence. Strong fitness and recovery.`;
  } else if (readiness >= 60) {
    return `Solid form - projected ${timeStr} with ${confidence} confidence. Manage fatigue in final weeks.`;
  } else {
    return `Building form - projected ${timeStr} with ${confidence} confidence. Prioritize recovery.`;
  }
}

/**
 * Quick simulation without training data (faster, for What-If scenarios)
 */
export async function runQuickSimulation(plan: RacePlan): Promise<RacePlan> {
  return runRaceSimulation(plan, {
    useTrainingData: false,
    useWeatherForecast: false,
    usePerformanceFactors: false,
  });
}
