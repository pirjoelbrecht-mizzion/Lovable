export type PerformanceFactor = {
  name: string;
  value: number;
  impact: 'positive' | 'neutral' | 'negative';
  impactPct: number;
  description: string;
  tooltip: string;
  icon: string;
  dataSource: 'calculated' | 'weather' | 'training' | 'manual';
  confidence: 'high' | 'medium' | 'low';
};

export type TrainingConsistency = {
  weeklyMileage: number[];
  meanMileage: number;
  stdDev: number;
  consistencyScore: number;
  weeks: number;
};

export type LongRunAnalysis = {
  recentLongRuns: number[];
  averageLongRun: number;
  maxLongRun: number;
  raceDistanceRatio: number;
  readinessScore: number;
};

export type TaperQuality = {
  daysToRace: number;
  loadDecline: number;
  taperQuality: number;
  peakLoadWeek: number;
  currentLoad: number;
};

export type WeatherConditions = {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  heatIndex: number;
  conditions: string;
  source: 'forecast' | 'historical' | 'manual';
};

export type AltitudeProfile = {
  raceAltitude: number;
  trainingAltitude: number;
  acclimatization: number;
  altitudeFactor: number;
};

export type PerformanceContext = {
  fitnessScore: number;
  consistency: TrainingConsistency;
  longRuns: LongRunAnalysis;
  taper: TaperQuality;
  weather: WeatherConditions;
  altitude: AltitudeProfile;
  course: {
    distanceKm: number;
    elevationGain: number;
    surface: string;
  };
};

export type ExtendedSimulationFactors = {
  fitness: number;
  consistency: number;
  longRun: number;
  taper: number;
  weather: number;
  course: number;
  altitude: number;
  terrain: number;
};

export type FactorWeights = {
  fitness: number;
  consistency: number;
  longRun: number;
  taper: number;
  weather: number;
  course: number;
  altitude: number;
};

export const DEFAULT_FACTOR_WEIGHTS: FactorWeights = {
  fitness: 0.25,
  consistency: 0.10,
  longRun: 0.10,
  taper: 0.15,
  weather: 0.15,
  course: 0.15,
  altitude: 0.10,
};

export type FactorImpactRange = {
  optimal: [number, number];
  acceptable: [number, number];
  warning: [number, number];
};

export const FACTOR_RANGES: Record<keyof ExtendedSimulationFactors, FactorImpactRange> = {
  fitness: {
    optimal: [0.95, 0.97],
    acceptable: [0.97, 1.02],
    warning: [1.02, 1.10],
  },
  consistency: {
    optimal: [0.98, 1.0],
    acceptable: [1.0, 1.02],
    warning: [1.02, 1.05],
  },
  longRun: {
    optimal: [0.97, 1.0],
    acceptable: [1.0, 1.03],
    warning: [1.03, 1.07],
  },
  taper: {
    optimal: [0.95, 0.97],
    acceptable: [0.97, 1.0],
    warning: [1.0, 1.03],
  },
  weather: {
    optimal: [0.97, 1.0],
    acceptable: [1.0, 1.05],
    warning: [1.05, 1.10],
  },
  course: {
    optimal: [0.95, 1.0],
    acceptable: [1.0, 1.05],
    warning: [1.05, 1.10],
  },
  altitude: {
    optimal: [0.97, 1.0],
    acceptable: [1.0, 1.05],
    warning: [1.05, 1.10],
  },
  terrain: {
    optimal: [1.0, 1.0],
    acceptable: [1.0, 1.06],
    warning: [1.06, 1.12],
  },
};
