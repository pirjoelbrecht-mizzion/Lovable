import type { Race } from '@/utils/races';
import type { SimulationOverrides, SimulationComparison, StartStrategy } from '@/types/whatif';
import { heatIndexC, heatPaceNudgePct } from '@/utils/weather';
import { getStartPaceFactor, getStrategyFatigueFactor } from '@/utils/startingStrategy';

export function calculateOverriddenTerrainFactor(
  race: Race,
  overrides: SimulationOverrides
): number {
  const surface = overrides.surface || race.surface || 'road';

  if (surface === 'trail') {
    return 1.12;
  } else if (surface === 'mixed') {
    return 1.06;
  }

  return 1.0;
}

export function calculateOverriddenElevationFactor(
  race: Race,
  overrides: SimulationOverrides
): number {
  const elevationM = overrides.elevation !== undefined ? overrides.elevation : race.elevationM;

  if (!elevationM || !race.distanceKm) {
    return 1.0;
  }

  const elevPerKm = elevationM / race.distanceKm;

  if (elevPerKm < 10) return 1.0;
  if (elevPerKm < 20) return 1.02;
  if (elevPerKm < 30) return 1.05;
  if (elevPerKm < 50) return 1.10;
  return 1.15;
}

export function calculateOverriddenClimateFactor(
  race: Race,
  overrides: SimulationOverrides
): number {
  if (overrides.temperature !== undefined && overrides.humidity !== undefined) {
    const hiC = heatIndexC(overrides.temperature, overrides.humidity);
    const paceNudge = heatPaceNudgePct(hiC);
    return 1.0 + paceNudge;
  }

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

export function calculateOverriddenFatiguePenalty(
  currentReadiness: number,
  overrides: SimulationOverrides
): number {
  const readiness = overrides.readiness !== undefined ? overrides.readiness : currentReadiness;
  return 1 + (100 - readiness) / 400;
}

export function applyOverridesToSimulation(
  baselineTimeMin: number,
  baselineFactors: {
    terrain: number;
    elevation: number;
    climate: number;
    fatigue: number;
  },
  overriddenFactors: {
    terrain: number;
    elevation: number;
    climate: number;
    fatigue: number;
  },
  distanceKm?: number,
  startStrategy?: StartStrategy
): number {
  const baselineTotal = baselineFactors.terrain *
                        baselineFactors.elevation *
                        baselineFactors.climate *
                        baselineFactors.fatigue;

  const overriddenTotal = overriddenFactors.terrain *
                          overriddenFactors.elevation *
                          overriddenFactors.climate *
                          overriddenFactors.fatigue;

  let ratio = overriddenTotal / baselineTotal;

  if (startStrategy && startStrategy !== 'target' && distanceKm) {
    const avgProgress = 0.5;
    const paceAdjustment = getStartPaceFactor(startStrategy, avgProgress);
    const fatigueAdjustment = getStrategyFatigueFactor(startStrategy, avgProgress);
    ratio *= paceAdjustment * fatigueAdjustment;
  }

  return baselineTimeMin * ratio;
}

export function compareSimulations(
  baselinePrediction: number,
  adjustedPrediction: number,
  baselineFactors: {
    terrain: number;
    elevation: number;
    climate: number;
    fatigue: number;
  },
  adjustedFactors: {
    terrain: number;
    elevation: number;
    climate: number;
    fatigue: number;
  },
  distanceKm: number
): SimulationComparison {
  const baselinePace = baselinePrediction / distanceKm;
  const adjustedPace = adjustedPrediction / distanceKm;

  const timeDelta = adjustedPrediction - baselinePrediction;
  const timeDeltaPct = (timeDelta / baselinePrediction) * 100;
  const paceDelta = adjustedPace - baselinePace;

  return {
    baseline: {
      predictedTimeMin: baselinePrediction,
      avgPace: baselinePace,
      factors: {
        terrain: baselineFactors.terrain,
        elevation: baselineFactors.elevation,
        climate: baselineFactors.climate,
        fatigue: baselineFactors.fatigue,
      },
    },
    adjusted: {
      predictedTimeMin: adjustedPrediction,
      avgPace: adjustedPace,
      factors: {
        terrain: adjustedFactors.terrain,
        elevation: adjustedFactors.elevation,
        climate: adjustedFactors.climate,
        fatigue: adjustedFactors.fatigue,
      },
    },
    delta: {
      timeMin: timeDelta,
      timePct: timeDeltaPct,
      pace: paceDelta,
    },
  };
}

export function validateOverrides(overrides: SimulationOverrides): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (overrides.temperature !== undefined) {
    if (overrides.temperature < -20) {
      warnings.push('Temperature below -20°C is extremely cold');
    }
    if (overrides.temperature > 45) {
      warnings.push('Temperature above 45°C is dangerously hot');
    }
  }

  if (overrides.humidity !== undefined) {
    if (overrides.humidity < 0 || overrides.humidity > 100) {
      warnings.push('Humidity must be between 0-100%');
    }
  }

  if (overrides.elevation !== undefined) {
    if (overrides.elevation < 0) {
      warnings.push('Elevation cannot be negative');
    }
    if (overrides.elevation > 5000) {
      warnings.push('Elevation above 5000m is unrealistic for most races');
    }
  }

  if (overrides.readiness !== undefined) {
    if (overrides.readiness < 0 || overrides.readiness > 100) {
      warnings.push('Readiness must be between 0-100');
    }
  }

  return {
    valid: warnings.length === 0 || warnings.every(w => !w.includes('must be')),
    warnings,
  };
}

export function getPresetScenarios(): Array<{
  name: string;
  overrides: SimulationOverrides;
  description: string;
}> {
  return [
    {
      name: 'Ideal Conditions',
      overrides: {
        temperature: 15,
        humidity: 45,
        readiness: 90,
        startStrategy: 'target',
      },
      description: 'Perfect race day: cool, low humidity, peak readiness',
    },
    {
      name: 'Hot Race',
      overrides: {
        temperature: 32,
        humidity: 70,
        startStrategy: 'conservative',
      },
      description: 'Summer race conditions: hot and humid, conservative start recommended',
    },
    {
      name: 'Cold Race',
      overrides: {
        temperature: 5,
        humidity: 60,
      },
      description: 'Winter race conditions: cold and damp',
    },
    {
      name: 'Mountain Ultra',
      overrides: {
        elevation: 2000,
        surface: 'trail',
        startStrategy: 'conservative',
      },
      description: 'High elevation trail race, conservative pacing essential',
    },
    {
      name: 'Fatigued State',
      overrides: {
        readiness: 50,
        startStrategy: 'conservative',
      },
      description: 'Racing while not fully recovered, start conservatively',
    },
    {
      name: 'Peak Form',
      overrides: {
        readiness: 95,
        temperature: 18,
        humidity: 40,
        startStrategy: 'target',
      },
      description: 'Perfect form and perfect conditions',
    },
    {
      name: 'Aggressive PR Attempt',
      overrides: {
        readiness: 90,
        temperature: 15,
        humidity: 40,
        startStrategy: 'aggressive',
      },
      description: 'High risk PR attempt: fast start in ideal conditions',
    },
  ];
}
