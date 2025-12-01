export type StartStrategy = 'conservative' | 'target' | 'aggressive';

export type SimulationOverrides = {
  temperature?: number;
  humidity?: number;
  elevation?: number;
  readiness?: number;
  surface?: 'road' | 'trail' | 'mixed';
  windSpeed?: number;
  precipitation?: number;
  altitude?: number;
  consistency?: number;
  longRunReadiness?: number;
  taperQuality?: number;
  startStrategy?: StartStrategy;
};

export type WhatIfScenario = {
  id?: string;
  userId?: string;
  raceId: string;
  name: string;
  overrides: SimulationOverrides;
  predictedTimeMin: number;
  notes?: string;
  createdAt?: string;
};

export type SimulationComparison = {
  baseline: {
    predictedTimeMin: number;
    avgPace: number;
    factors: {
      terrain: number;
      elevation: number;
      climate: number;
      fatigue: number;
    };
  };
  adjusted: {
    predictedTimeMin: number;
    avgPace: number;
    factors: {
      terrain: number;
      elevation: number;
      climate: number;
      fatigue: number;
    };
  };
  delta: {
    timeMin: number;
    timePct: number;
    pace: number;
  };
};

export type OverrideRange = {
  min: number;
  max: number;
  default: number;
  step: number;
  unit: string;
};

export const OVERRIDE_RANGES: Record<string, OverrideRange> = {
  temperature: { min: -10, max: 45, default: 20, step: 1, unit: '°C' },
  humidity: { min: 0, max: 100, default: 50, step: 5, unit: '%' },
  elevation: { min: 0, max: 5000, default: 0, step: 50, unit: 'm' },
  readiness: { min: 0, max: 100, default: 70, step: 1, unit: '' },
  windSpeed: { min: 0, max: 50, default: 10, step: 1, unit: 'kph' },
  precipitation: { min: 0, max: 50, default: 0, step: 1, unit: 'mm' },
  altitude: { min: 0, max: 5000, default: 0, step: 100, unit: 'm' },
  consistency: { min: 0, max: 100, default: 70, step: 5, unit: '%' },
  longRunReadiness: { min: 0, max: 100, default: 70, step: 5, unit: '%' },
  taperQuality: { min: 0, max: 100, default: 70, step: 5, unit: '%' },
};
