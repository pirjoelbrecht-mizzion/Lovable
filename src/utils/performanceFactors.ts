import type { LogEntry } from '@/types';
import type {
  TrainingConsistency,
  LongRunAnalysis,
  TaperQuality,
  WeatherConditions,
  AltitudeProfile,
  PerformanceContext,
  ExtendedSimulationFactors,
  PerformanceFactor,
  FactorWeights,
  DEFAULT_FACTOR_WEIGHTS,
  FACTOR_RANGES,
} from '@/types/performance';
import type { Race } from '@/utils/races';
import { heatIndexC, heatPaceNudgePct } from '@/utils/weather';

export async function calculateTrainingConsistency(
  entries: LogEntry[],
  weeks: number = 8
): Promise<TrainingConsistency> {
  if (entries.length === 0) {
    return {
      weeklyMileage: [],
      meanMileage: 0,
      stdDev: 0,
      consistencyScore: 0.5,
      weeks: 0,
    };
  }

  const sortedEntries = entries.slice().sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  const weeklyTotals: number[] = [];
  let currentWeekStart = sortedEntries[0].dateISO.slice(0, 10);
  let currentWeekTotal = 0;

  for (const entry of sortedEntries) {
    const entryDate = new Date(entry.dateISO);
    const weekStart = new Date(currentWeekStart);
    const daysDiff = Math.floor((entryDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff >= 7) {
      weeklyTotals.push(currentWeekTotal);
      currentWeekStart = entry.dateISO.slice(0, 10);
      currentWeekTotal = entry.km || 0;
    } else {
      currentWeekTotal += entry.km || 0;
    }
  }

  if (currentWeekTotal > 0) {
    weeklyTotals.push(currentWeekTotal);
  }

  const recentWeeks = weeklyTotals.slice(-weeks);
  const meanMileage = recentWeeks.reduce((sum, km) => sum + km, 0) / recentWeeks.length;

  const variance = recentWeeks.reduce((sum, km) => sum + Math.pow(km - meanMileage, 2), 0) / recentWeeks.length;
  const stdDev = Math.sqrt(variance);

  const coefficientOfVariation = meanMileage > 0 ? stdDev / meanMileage : 1;
  const consistencyScore = Math.max(0, 1 - coefficientOfVariation);

  return {
    weeklyMileage: recentWeeks,
    meanMileage,
    stdDev,
    consistencyScore,
    weeks: recentWeeks.length,
  };
}

export async function analyzeLongRuns(
  entries: LogEntry[],
  raceDistance: number
): Promise<LongRunAnalysis> {
  const longRunThreshold = Math.max(15, raceDistance * 0.3);

  const longRuns = entries
    .filter(e => e.km && e.km >= longRunThreshold)
    .map(e => e.km || 0)
    .sort((a, b) => b - a)
    .slice(0, 5);

  if (longRuns.length === 0) {
    return {
      recentLongRuns: [],
      averageLongRun: 0,
      maxLongRun: 0,
      raceDistanceRatio: 0,
      readinessScore: 0,
    };
  }

  const averageLongRun = longRuns.reduce((sum, km) => sum + km, 0) / longRuns.length;
  const maxLongRun = longRuns[0];
  const raceDistanceRatio = maxLongRun / raceDistance;

  let readinessScore = 0;
  if (raceDistanceRatio >= 0.7) {
    readinessScore = 1.0;
  } else if (raceDistanceRatio >= 0.6) {
    readinessScore = 0.9;
  } else if (raceDistanceRatio >= 0.5) {
    readinessScore = 0.75;
  } else if (raceDistanceRatio >= 0.4) {
    readinessScore = 0.6;
  } else {
    readinessScore = 0.4;
  }

  return {
    recentLongRuns: longRuns,
    averageLongRun,
    maxLongRun,
    raceDistanceRatio,
    readinessScore,
  };
}

export async function calculateTaperQuality(
  entries: LogEntry[],
  raceDateISO: string
): Promise<TaperQuality> {
  const raceDate = new Date(raceDateISO);
  const today = new Date();
  const daysToRace = Math.floor((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysToRace < 0) {
    return {
      daysToRace,
      loadDecline: 0,
      taperQuality: 0,
      peakLoadWeek: 0,
      currentLoad: 0,
    };
  }

  const sortedEntries = entries.slice().sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const last7Days = sortedEntries.slice(0, 7);
  const currentLoad = last7Days.reduce((sum, e) => sum + (e.km || 0), 0);

  const peakWeekStart = new Date(today);
  peakWeekStart.setDate(peakWeekStart.getDate() - 28);
  const peakWeekEntries = sortedEntries.filter(e => {
    const entryDate = new Date(e.dateISO);
    return entryDate >= peakWeekStart && entryDate < today;
  });

  let peakLoadWeek = 0;
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - ((i + 1) * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekLoad = peakWeekEntries
      .filter(e => {
        const d = new Date(e.dateISO);
        return d >= weekStart && d < weekEnd;
      })
      .reduce((sum, e) => sum + (e.km || 0), 0);

    peakLoadWeek = Math.max(peakLoadWeek, weekLoad);
  }

  const loadDecline = peakLoadWeek > 0 ? (peakLoadWeek - currentLoad) / peakLoadWeek : 0;

  let taperQuality = 0;
  if (daysToRace <= 7) {
    if (loadDecline >= 0.4 && loadDecline <= 0.6) {
      taperQuality = 1.0;
    } else if (loadDecline >= 0.3 && loadDecline <= 0.7) {
      taperQuality = 0.85;
    } else if (loadDecline >= 0.2) {
      taperQuality = 0.7;
    } else {
      taperQuality = 0.5;
    }
  } else if (daysToRace <= 14) {
    if (loadDecline >= 0.2 && loadDecline <= 0.4) {
      taperQuality = 0.8;
    } else if (loadDecline >= 0.1) {
      taperQuality = 0.6;
    } else {
      taperQuality = 0.4;
    }
  } else {
    taperQuality = 0.5;
  }

  return {
    daysToRace,
    loadDecline,
    taperQuality,
    peakLoadWeek,
    currentLoad,
  };
}

export function calculateWeatherFactor(weather: WeatherConditions): number {
  const heatPenalty = heatPaceNudgePct(weather.heatIndex);

  let windPenalty = 0;
  if (weather.windSpeed > 15) {
    windPenalty = (weather.windSpeed - 15) / 100 * 0.02;
  }

  let precipPenalty = 0;
  if (weather.precipitation > 5) {
    precipPenalty = 0.01;
  }
  if (weather.precipitation > 15) {
    precipPenalty = 0.03;
  }

  return 1 + heatPenalty + windPenalty + precipPenalty;
}

export function calculateAltitudeFactor(altitude: AltitudeProfile): number {
  if (altitude.raceAltitude < 1000) {
    return 1.0;
  }

  const baseAltitudePenalty = (altitude.raceAltitude / 1000) * 0.03;

  const acclimatizationBonus = altitude.acclimatization * 0.015;

  const netPenalty = Math.max(0, baseAltitudePenalty - acclimatizationBonus);

  return 1 + netPenalty;
}

export function calculateFitnessFactor(fitnessScore: number): number {
  const normalizedFitness = fitnessScore / 100;

  const optimalFitness = 0.85;
  const deviation = normalizedFitness - optimalFitness;

  if (deviation > 0) {
    return 1 - (deviation * 0.3);
  } else {
    return 1 - (deviation * 0.5);
  }
}

export function calculateConsistencyFactor(consistency: TrainingConsistency): number {
  if (consistency.weeklyMileage.length < 4) {
    return 1.05;
  }

  const coefficientOfVariation = consistency.meanMileage > 0
    ? consistency.stdDev / consistency.meanMileage
    : 1;

  if (coefficientOfVariation < 0.2) {
    return 1.0;
  } else if (coefficientOfVariation < 0.3) {
    return 1.02;
  } else if (coefficientOfVariation < 0.4) {
    return 1.04;
  } else {
    return 1.06;
  }
}

export function calculateLongRunFactor(longRuns: LongRunAnalysis, raceDistance: number): number {
  if (longRuns.raceDistanceRatio >= 0.7) {
    return 0.98;
  } else if (longRuns.raceDistanceRatio >= 0.6) {
    return 1.0;
  } else if (longRuns.raceDistanceRatio >= 0.5) {
    return 1.02;
  } else if (longRuns.raceDistanceRatio >= 0.4) {
    return 1.05;
  } else {
    return 1.08;
  }
}

export function calculateTaperFactor(taper: TaperQuality): number {
  if (taper.daysToRace > 14) {
    return 1.0;
  }

  if (taper.taperQuality >= 0.9) {
    return 0.95;
  } else if (taper.taperQuality >= 0.75) {
    return 0.97;
  } else if (taper.taperQuality >= 0.6) {
    return 0.99;
  } else {
    return 1.01;
  }
}

export function applyPerformanceModifiers(
  baseTime: number,
  context: PerformanceContext,
  weights?: Partial<FactorWeights>,
  skipTerrainFactors: boolean = false
): { adjustedTime: number; factors: ExtendedSimulationFactors } {
  const fitnessFactor = calculateFitnessFactor(context.fitnessScore);
  const consistencyFactor = calculateConsistencyFactor(context.consistency);
  const longRunFactor = calculateLongRunFactor(context.longRuns, context.course.distanceKm);
  const taperFactor = calculateTaperFactor(context.taper);
  const weatherFactor = calculateWeatherFactor(context.weather);
  const altitudeFactor = calculateAltitudeFactor(context.altitude);

  let courseFactor = 1.0;
  let terrainFactor = 1.0;

  if (!skipTerrainFactors) {
    courseFactor = 1 + (context.course.elevationGain / context.course.distanceKm / 100) * 0.02;

    if (context.course.surface === 'trail') {
      terrainFactor = 1.12;
    } else if (context.course.surface === 'mixed') {
      terrainFactor = 1.06;
    }
  }

  const totalFactor =
    fitnessFactor *
    consistencyFactor *
    longRunFactor *
    taperFactor *
    weatherFactor *
    courseFactor *
    altitudeFactor *
    terrainFactor;

  return {
    adjustedTime: baseTime * totalFactor,
    factors: {
      fitness: fitnessFactor,
      consistency: consistencyFactor,
      longRun: longRunFactor,
      taper: taperFactor,
      weather: weatherFactor,
      course: courseFactor,
      altitude: altitudeFactor,
      terrain: terrainFactor,
    },
  };
}

export function getFactorImpact(value: number): 'positive' | 'neutral' | 'negative' {
  if (value < 0.98) return 'positive';
  if (value > 1.02) return 'negative';
  return 'neutral';
}

export function getFactorColor(impact: 'positive' | 'neutral' | 'negative'): string {
  switch (impact) {
    case 'positive': return 'var(--good)';
    case 'negative': return 'var(--warning)';
    case 'neutral': return 'var(--muted)';
  }
}

export function createPerformanceFactor(
  name: string,
  value: number,
  description: string,
  tooltip: string,
  icon: string,
  dataSource: PerformanceFactor['dataSource'],
  confidence: PerformanceFactor['confidence'] = 'high'
): PerformanceFactor {
  const impact = getFactorImpact(value);
  const impactPct = ((value - 1) * 100);

  return {
    name,
    value,
    impact,
    impactPct,
    description,
    tooltip,
    icon,
    dataSource,
    confidence,
  };
}
