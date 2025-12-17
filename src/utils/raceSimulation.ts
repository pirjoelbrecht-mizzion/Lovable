// src/utils/raceSimulation.ts
import { getLogEntriesByDateRange } from '@/lib/database';
import { calculateReadinessScore } from '@/utils/readiness';
import { listRaces, getNextRace, type Race } from '@/utils/races';
import { findBestBaselineRace } from '@/utils/raceProjection';
import type { LogEntry } from '@/types';
import type { PerformanceContext, ExtendedSimulationFactors, PerformanceFactor } from '@/types/performance';
import {
  calculateTrainingConsistency,
  analyzeLongRuns,
  calculateTaperQuality,
  applyPerformanceModifiers,
  createPerformanceFactor,
  getFactorColor,
  calculateTaperFactor,
  calculateWeatherFactor,
} from '@/utils/performanceFactors';
import { getRaceWeatherForecast, getWeatherImpactDescription } from '@/utils/raceWeather';
import {
  calculateUltraFatigue,
  estimateUltraFinishTime,
  getUltraDistanceCategory,
} from '@/lib/ultra-distance/ultraFatigueModel';
import {
  estimateQuickAidStationTime,
} from '@/lib/ultra-distance/aidStationEstimation';

export type SimulationFactors = {
  terrainFactor: number;
  elevationFactor: number;
  climateFactor: number;
  fatiguePenalty: number;
  confidenceScore: number;
};

export type PaceBreakdown = {
  segment: number;
  pace: number;
  cumulativeFatigue: number;
  hrZone: number;
};

export type RaceSimulation = {
  race: Race;
  predictedTimeMin: number;
  predictedTimeFormatted: string;
  avgPace: number;
  paceFormatted: string;
  factors: SimulationFactors;
  paceBreakdown: PaceBreakdown[];
  message: string;
  readinessScore: number;
  weeksToRace: number;
  confidence: 'high' | 'medium' | 'low';
  calculationMethod: 'gpx' | 'manual' | 'projection' | 'default';
  calculationConfidence: 'very-high' | 'high' | 'medium' | 'low' | 'very-low';
  extendedFactors?: ExtendedSimulationFactors;
  performanceFactors?: PerformanceFactor[];
  weatherDescription?: string;
};

function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);
  
  if (hrs > 0) {
    return hrs + 'h ' + String(mins).padStart(2, '0') + 'm';
  }
  return mins + 'm ' + String(secs).padStart(2, '0') + 's';
}

function formatPace(paceMinPerKm: number): string {
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.floor((paceMinPerKm % 1) * 60);
  return mins + ':' + String(secs).padStart(2, '0');
}

async function getTrainingStats(): Promise<{
  basePace: number;
  baseDistance: number;
  fitnessLevel: number;
}> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 56);
  const entries = await getLogEntriesByDateRange(startDate.toISOString().slice(0, 10), endDate);
  
  if (entries.length === 0) {
    return { basePace: 6.0, baseDistance: 10, fitnessLevel: 0.5 };
  }
  
  const pacedRuns = entries.filter(e => e.km && e.durationMin && e.km >= 5);
  const avgPace = pacedRuns.length > 0
    ? pacedRuns.reduce((sum, e) => sum + (e.durationMin / e.km), 0) / pacedRuns.length
    : 6.0;
  
  const longest = Math.max(...entries.map(e => e.km || 0), 10);
  
  const totalKm = entries.reduce((sum, e) => sum + (e.km || 0), 0);
  const avgWeeklyKm = totalKm / 8;
  const fitnessLevel = Math.min(1.0, avgWeeklyKm / 50);
  
  return {
    basePace: avgPace,
    baseDistance: longest,
    fitnessLevel,
  };
}

function calculateTerrainFactor(race: Race): number {
  let factor = 1.0;
  
  if (race.surface === 'trail') {
    factor *= 1.12;
  } else if (race.surface === 'mixed') {
    factor *= 1.06;
  }
  
  return factor;
}

function calculateElevationFactor(race: Race): number {
  if (!race.elevationM || !race.distanceKm) {
    return 1.0;
  }
  
  const elevPerKm = race.elevationM / race.distanceKm;
  
  if (elevPerKm < 10) return 1.0;
  if (elevPerKm < 20) return 1.02;
  if (elevPerKm < 30) return 1.05;
  if (elevPerKm < 50) return 1.10;
  return 1.15;
}

function calculateClimateFactor(race: Race): number {
  const name = (race.name || '').toLowerCase();
  const location = (race.notes || '').toLowerCase();
  const text = name + ' ' + location;
  
  if (text.includes('thailand') || text.includes('singapore') || 
      text.includes('malaysia') || text.includes('summer')) {
    return 1.05;
  }
  
  if (text.includes('winter') || text.includes('spring') || 
      text.includes('fall') || text.includes('autumn')) {
    return 1.0;
  }
  
  return 1.02;
}

function generatePaceBreakdown(
  avgPace: number, 
  distance: number, 
  factors: SimulationFactors
): PaceBreakdown[] {
  const breakdown: PaceBreakdown[] = [];
  const segments = Math.ceil(distance);
  
  for (let i = 0; i < segments; i++) {
    const progress = i / segments;
    
    const cumulativeFatigue = distance > 42 
      ? Math.pow(progress, 1.5) * 0.4
      : Math.pow(progress, 1.2) * 0.2;
    
    const fatiguePaceAdjustment = 1 + (cumulativeFatigue * 0.3);
    const segmentPace = avgPace * fatiguePaceAdjustment;
    
    const baseZone = 3;
    const hrZone = Math.min(5, Math.round(baseZone + cumulativeFatigue * 1.5));
    
    breakdown.push({
      segment: i + 1,
      pace: segmentPace,
      cumulativeFatigue,
      hrZone,
    });
  }
  
  return breakdown;
}

function getConfidenceLevel(
  weeksToRace: number,
  fitnessLevel: number,
  readiness: number
): 'high' | 'medium' | 'low' {
  const timeScore = weeksToRace >= 4 && weeksToRace <= 16 ? 1.0 : 0.7;
  const fitnessScore = fitnessLevel;
  const readinessScore = readiness / 100;
  
  const overallScore = (timeScore + fitnessScore + readinessScore) / 3;
  
  if (overallScore >= 0.75) return 'high';
  if (overallScore >= 0.5) return 'medium';
  return 'low';
}

export async function simulateRace(raceId?: string): Promise<RaceSimulation | null> {
  let targetRace: Race | null = null;

  console.log('[simulateRace] Starting simulation with raceId:', raceId);

  if (raceId) {
    const allRaces = await listRaces();
    console.log('[simulateRace] All races:', allRaces);
    targetRace = allRaces.find(r => r.id === raceId) || null;
    console.log('[simulateRace] Found target race:', targetRace);
  } else {
    targetRace = await getNextRace();
    console.log('[simulateRace] Next race:', targetRace);
  }

  if (!targetRace || !targetRace.distanceKm) {
    console.log('[simulateRace] No target race or missing distance, returning null');
    return null;
  }

  console.log('[simulateRace] Looking for baseline race...');
  const baseline = await findBestBaselineRace();
  console.log('[simulateRace] Baseline race:', baseline);

  if (!baseline) {
    console.log('[simulateRace] NO BASELINE RACE FOUND - this is why simulation is returning null!');
    console.log('[simulateRace] To fix: Add a past race result to your log or training data');
    return null;
  }

  const stats = await getTrainingStats();
  const readiness = await calculateReadinessScore();

  const today = new Date();
  const raceDate = new Date(targetRace.dateISO);
  const daysToRace = Math.floor((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const weeksToRace = daysToRace / 7;

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 56);
  const entries = await getLogEntriesByDateRange(startDate.toISOString().slice(0, 10), endDate);

  const consistency = await calculateTrainingConsistency(entries, 8);
  const longRuns = await analyzeLongRuns(entries, targetRace.distanceKm);
  const taper = await calculateTaperQuality(entries, targetRace.dateISO);
  const weather = await getRaceWeatherForecast(targetRace);

  const performanceContext: PerformanceContext = {
    fitnessScore: readiness.value,
    consistency,
    longRuns,
    taper,
    weather: weather || {
      temperature: 20,
      humidity: 50,
      windSpeed: 10,
      precipitation: 0,
      heatIndex: 20,
      conditions: 'Moderate',
      source: 'manual',
    },
    altitude: {
      raceAltitude: targetRace.elevationM || 0,
      trainingAltitude: 0,
      acclimatization: 0,
      altitudeFactor: 1.0,
    },
    course: {
      distanceKm: targetRace.distanceKm,
      elevationGain: targetRace.elevationM || 0,
      surface: targetRace.surface || 'road',
    },
  };

  let basePrediction: number;
  let calculationMethod: 'gpx' | 'manual' | 'projection' | 'default' = 'default';
  let calculationConfidence: 'very-high' | 'high' | 'medium' | 'low' | 'very-low' = 'medium';
  let skipTerrainFactors = false;

  const isGPXValid = (analysis: any, raceDistanceKm: number): boolean => {
    if (!analysis || !analysis.totalTimeEstimate || analysis.totalTimeEstimate <= 0) {
      return false;
    }

    if (!analysis.totalDistanceKm || analysis.totalDistanceKm <= 0) {
      return false;
    }

    const distanceDiff = Math.abs(analysis.totalDistanceKm - raceDistanceKm) / raceDistanceKm;
    if (distanceDiff > 0.1) {
      console.warn('[simulateRace] GPX distance differs significantly from race distance:', analysis.totalDistanceKm, 'vs', raceDistanceKm);
      return false;
    }

    const avgPace = analysis.totalTimeEstimate / analysis.totalDistanceKm;
    if (avgPace < 3 || avgPace > 15) {
      console.warn('[simulateRace] GPX pace seems unrealistic:', avgPace, 'min/km');
      return false;
    }

    return true;
  };

  if (targetRace.routeAnalysis && isGPXValid(targetRace.routeAnalysis, targetRace.distanceKm)) {
    const gpxBaseTime = targetRace.routeAnalysis.totalTimeEstimate;
    const isUltraDistance = targetRace.distanceKm > 42;
    const alreadyHasUltraAdjustment = (targetRace.routeAnalysis as any).ultraAdjusted === true;

    if (isUltraDistance && !alreadyHasUltraAdjustment) {
      const distanceCategory = getUltraDistanceCategory(targetRace.distanceKm);
      const elevationGain = targetRace.routeAnalysis.totalElevationGainM || targetRace.elevationM || 0;

      const ultraEstimate = estimateUltraFinishTime(
        gpxBaseTime,
        targetRace.distanceKm,
        elevationGain,
        {
          temperatureC: weather?.temperature || 20,
          humidity: weather?.humidity || 50,
          readinessScore: readiness.value,
          hasNightSection: targetRace.distanceKm > 80,
          aidStationCount: Math.floor(targetRace.distanceKm / 10),
        }
      );

      basePrediction = ultraEstimate.adjustedTimeMinutes;

      console.log('[simulateRace] Ultra fatigue applied:', {
        gpxBaseTime,
        fatiguePenalty: ultraEstimate.fatiguePenaltyMinutes,
        aidStationTime: ultraEstimate.aidStationMinutes,
        nightPenalty: ultraEstimate.nightPenaltyMinutes,
        adjustedTime: basePrediction,
        totalAdjustmentPct: ultraEstimate.totalAdjustmentPercent,
        distanceCategory: distanceCategory.label,
      });
    } else {
      basePrediction = gpxBaseTime;
      if (alreadyHasUltraAdjustment) {
        console.log('[simulateRace] GPX already has ultra adjustments, using stored time:', gpxBaseTime);
      }
    }

    calculationMethod = 'gpx';
    skipTerrainFactors = true;

    if (targetRace.routeAnalysis.usingPersonalizedPace) {
      calculationConfidence = targetRace.routeAnalysis.paceConfidence === 'high' ? 'very-high' : 'high';
    } else {
      calculationConfidence = 'high';
    }

    console.log('[simulateRace] Using GPX-based time:', basePrediction, 'min');
    console.log('[simulateRace] GPX analysis:', {
      distance: targetRace.routeAnalysis.totalDistanceKm,
      elevation: targetRace.routeAnalysis.totalElevationGainM,
      personalized: targetRace.routeAnalysis.usingPersonalizedPace,
      confidence: targetRace.routeAnalysis.paceConfidence,
      isUltra: isUltraDistance,
      ultraAdjusted: alreadyHasUltraAdjustment,
    });
  } else if (targetRace.expectedTimeMin && targetRace.expectedTimeMin > 0) {
    basePrediction = targetRace.expectedTimeMin;
    calculationMethod = 'manual';
    calculationConfidence = 'medium';
    console.log('[simulateRace] Using manual expected time:', basePrediction, 'min');
  } else if (baseline) {
    const distanceRatio = targetRace.distanceKm / baseline.distanceKm;
    basePrediction = baseline.timeMin * Math.pow(distanceRatio, 1.06);
    calculationMethod = 'projection';

    const similarDistance = Math.abs(distanceRatio - 1.0) < 0.5;
    const similarTerrain = baseline.source === 'race';
    const isUltraDistance = targetRace.distanceKm > 50;

    if (isUltraDistance && !similarDistance) {
      calculationConfidence = 'very-low';
    } else if (isUltraDistance || !similarDistance) {
      calculationConfidence = 'low';
    } else if (similarDistance && similarTerrain) {
      calculationConfidence = 'medium';
    } else {
      calculationConfidence = 'low';
    }

    console.log('[simulateRace] Using Riegel projection:', basePrediction, 'min (confidence:', calculationConfidence, ')');
  } else {
    console.log('[simulateRace] No baseline data available');
    return null;
  }

  let adjustedTime: number;
  let extendedFactors: ExtendedSimulationFactors;

  if (calculationMethod === 'gpx') {
    const taperFactor = calculateTaperFactor(taper);
    const weatherFactor = calculateWeatherFactor(weather || performanceContext.weather);

    const readinessAdjustment = 1 + (80 - readiness.value) / 800;

    const gpxTotalFactor = taperFactor * weatherFactor * readinessAdjustment;
    adjustedTime = basePrediction * gpxTotalFactor;

    console.log('[simulateRace] GPX time adjustments:', {
      baseTime: basePrediction,
      taper: taperFactor,
      weather: weatherFactor,
      readiness: readinessAdjustment,
      totalFactor: gpxTotalFactor,
      adjustedTime
    });

    extendedFactors = {
      fitness: 1.0,
      consistency: 1.0,
      longRun: 1.0,
      taper: taperFactor,
      weather: weatherFactor,
      course: 1.0,
      altitude: 1.0,
      terrain: 1.0,
    };
  } else {
    const result = applyPerformanceModifiers(
      basePrediction,
      performanceContext,
      undefined,
      skipTerrainFactors
    );
    adjustedTime = result.adjustedTime;
    extendedFactors = result.factors;
  }

  const terrainFactor = calculateTerrainFactor(targetRace);
  const elevationFactor = calculateElevationFactor(targetRace);
  const climateFactor = calculateClimateFactor(targetRace);
  const fatiguePenalty = 1 + (100 - readiness.value) / 400;

  const confidence = getConfidenceLevel(weeksToRace, stats.fitnessLevel, readiness.value);
  const confidenceScore = confidence === 'high' ? 0.9 : confidence === 'medium' ? 0.75 : 0.6;

  const factors: SimulationFactors = {
    terrainFactor,
    elevationFactor,
    climateFactor,
    fatiguePenalty,
    confidenceScore,
  };

  const predictedTimeMin = adjustedTime;
  const avgPace = predictedTimeMin / targetRace.distanceKm;

  const paceBreakdown = generatePaceBreakdown(avgPace, targetRace.distanceKm, factors);

  const performanceFactors: PerformanceFactor[] = [
    createPerformanceFactor(
      'Fitness',
      extendedFactors.fitness,
      extendedFactors.fitness < 1.0 ? 'Strong fitness level' : 'Building fitness',
      `Current fitness: ${readiness.value}/100. Optimal range for peak performance.`,
      '💪',
      'calculated',
      'high'
    ),
    createPerformanceFactor(
      'Consistency',
      extendedFactors.consistency,
      consistency.consistencyScore > 0.7 ? 'Consistent training' : 'Variable training',
      `Training consistency: ${Math.round(consistency.consistencyScore * 100)}%. Based on ${consistency.weeks} weeks of data.`,
      '📊',
      'training',
      consistency.weeks >= 6 ? 'high' : 'medium'
    ),
    createPerformanceFactor(
      'Long Runs',
      extendedFactors.longRun,
      longRuns.raceDistanceRatio >= 0.6 ? 'Well prepared' : 'Build long run volume',
      `Longest run: ${longRuns.maxLongRun.toFixed(1)}km (${Math.round(longRuns.raceDistanceRatio * 100)}% of race distance)`,
      '🏃',
      'training',
      longRuns.recentLongRuns.length >= 3 ? 'high' : 'medium'
    ),
    createPerformanceFactor(
      'Taper',
      extendedFactors.taper,
      taper.daysToRace <= 14 ? `${taper.daysToRace} days to race` : 'Training phase',
      `Taper quality: ${Math.round(taper.taperQuality * 100)}%. Load decline: ${Math.round(taper.loadDecline * 100)}%`,
      '📉',
      'calculated',
      taper.daysToRace <= 14 ? 'high' : 'medium'
    ),
    createPerformanceFactor(
      'Weather',
      extendedFactors.weather,
      weather ? weather.conditions : 'Estimated',
      weather ? `${weather.temperature}°C, ${weather.humidity}% humidity. ${getWeatherImpactDescription(weather)}` : 'Weather estimate based on race location',
      '🌡️',
      weather ? weather.source : 'manual',
      weather && weather.source === 'forecast' ? 'high' : 'medium'
    ),
    createPerformanceFactor(
      'Course',
      extendedFactors.course,
      targetRace.elevationM ? `${targetRace.elevationM}m elevation` : 'Flat course',
      `${targetRace.elevationM || 0}m elevation gain over ${targetRace.distanceKm}km`,
      '⛰️',
      'manual',
      'high'
    ),
    createPerformanceFactor(
      'Altitude',
      extendedFactors.altitude,
      performanceContext.altitude.raceAltitude > 1000 ? 'High altitude' : 'Sea level',
      `Race altitude: ${performanceContext.altitude.raceAltitude}m`,
      '🏔️',
      'manual',
      'high'
    ),
  ];

  let message = '';
  if (readiness.value >= 80) {
    message = 'Peak form - projected ' + formatTime(predictedTimeMin) + ' with ' + confidence + ' confidence. Strong fitness and recovery.';
  } else if (readiness.value >= 60) {
    message = 'Solid form - projected ' + formatTime(predictedTimeMin) + ' with ' + confidence + ' confidence. Manage fatigue in final weeks.';
  } else {
    message = 'Building form - projected ' + formatTime(predictedTimeMin) + ' with ' + confidence + ' confidence. Prioritize recovery.';
  }

  return {
    race: targetRace,
    predictedTimeMin,
    predictedTimeFormatted: formatTime(predictedTimeMin),
    avgPace,
    paceFormatted: formatPace(avgPace),
    factors,
    paceBreakdown,
    message,
    readinessScore: readiness.value,
    weeksToRace,
    confidence,
    calculationMethod,
    calculationConfidence,
    extendedFactors,
    performanceFactors,
    weatherDescription: weather ? getWeatherImpactDescription(weather) : undefined,
  };
}
