import type { SimulationOverrides, StartStrategy } from './whatif';
import type { PacingSegment } from './pacing';
import type { PhysiologicalInputs, PhysiologicalSimulation } from './physiology';

export interface RacePlanConditions {
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
}

export interface RacePlanNutrition {
  fuelingRate: number;
  fluidIntake: number;
  sodiumIntake: number;
}

export interface RacePlanPacing {
  mode: 'manual' | 'auto' | 'none';
  segments: PacingSegment[];
}

export interface RacePlanSimulationResults {
  predictedTimeMin: number;
  avgPace: number;
  factors: {
    terrain: number;
    elevation: number;
    climate: number;
    fatigue: number;
  };
  physiological?: PhysiologicalSimulation;
}

export interface RacePlan {
  id?: string;
  raceId: string;
  raceName?: string;
  name: string;
  conditions: RacePlanConditions;
  nutrition: RacePlanNutrition;
  pacing: RacePlanPacing;
  simulation?: RacePlanSimulationResults;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

export const DEFAULT_RACE_PLAN_CONDITIONS: RacePlanConditions = {
  temperature: 20,
  humidity: 50,
  readiness: 80,
  surface: 'road',
  startStrategy: 'target',
};

export const DEFAULT_RACE_PLAN_NUTRITION: RacePlanNutrition = {
  fuelingRate: 60,
  fluidIntake: 600,
  sodiumIntake: 800,
};

export const DEFAULT_RACE_PLAN_PACING: RacePlanPacing = {
  mode: 'none',
  segments: [],
};

export function createDefaultRacePlan(raceId: string, raceName: string): RacePlan {
  return {
    raceId,
    raceName,
    name: `${raceName} Race Plan`,
    conditions: { ...DEFAULT_RACE_PLAN_CONDITIONS },
    nutrition: { ...DEFAULT_RACE_PLAN_NUTRITION },
    pacing: { ...DEFAULT_RACE_PLAN_PACING },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function racePlanToSimulationOverrides(plan: RacePlan): SimulationOverrides {
  return {
    ...plan.conditions,
  };
}

export function racePlanToPhysiologicalInputs(plan: RacePlan): PhysiologicalInputs {
  return {
    ...plan.nutrition,
  };
}

export function simulationOverridesToRacePlanConditions(
  overrides: SimulationOverrides
): RacePlanConditions {
  return {
    temperature: overrides.temperature,
    humidity: overrides.humidity,
    elevation: overrides.elevation,
    readiness: overrides.readiness,
    surface: overrides.surface,
    windSpeed: overrides.windSpeed,
    precipitation: overrides.precipitation,
    altitude: overrides.altitude,
    consistency: overrides.consistency,
    longRunReadiness: overrides.longRunReadiness,
    taperQuality: overrides.taperQuality,
    startStrategy: overrides.startStrategy,
  };
}

export function physiologicalInputsToRacePlanNutrition(
  inputs: PhysiologicalInputs
): RacePlanNutrition {
  return {
    fuelingRate: inputs.fuelingRate,
    fluidIntake: inputs.fluidIntake,
    sodiumIntake: inputs.sodiumIntake,
  };
}

export function validateRacePlan(plan: RacePlan, raceDistanceKm: number): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!plan.name?.trim()) {
    errors.push('Plan name is required');
  }

  if (plan.conditions.temperature !== undefined) {
    if (plan.conditions.temperature < -20 || plan.conditions.temperature > 45) {
      errors.push('Temperature must be between -20°C and 45°C');
    }
  }

  if (plan.conditions.humidity !== undefined) {
    if (plan.conditions.humidity < 0 || plan.conditions.humidity > 100) {
      errors.push('Humidity must be between 0% and 100%');
    }
  }

  if (plan.conditions.readiness !== undefined) {
    if (plan.conditions.readiness < 0 || plan.conditions.readiness > 100) {
      errors.push('Readiness must be between 0 and 100');
    }
  }

  if (plan.nutrition.fuelingRate < 0 || plan.nutrition.fuelingRate > 120) {
    errors.push('Fueling rate must be between 0 and 120 g/hr');
  }

  if (plan.nutrition.fluidIntake < 0 || plan.nutrition.fluidIntake > 1200) {
    errors.push('Fluid intake must be between 0 and 1200 ml/hr');
  }

  if (plan.nutrition.sodiumIntake < 0 || plan.nutrition.sodiumIntake > 1500) {
    errors.push('Sodium intake must be between 0 and 1500 mg/hr');
  }

  if (plan.pacing.segments.length > 0) {
    let prevDistance = 0;
    plan.pacing.segments.forEach((segment, idx) => {
      if (segment.distanceKm <= prevDistance) {
        errors.push(`Segment ${idx + 1}: Distance must be greater than previous segment`);
      }
      if (segment.distanceKm > raceDistanceKm) {
        errors.push(`Segment ${idx + 1}: Distance exceeds race distance`);
      }
      if (segment.targetPace < 3.0 || segment.targetPace > 15.0) {
        errors.push(`Segment ${idx + 1}: Pace must be between 3:00 and 15:00 min/km`);
      }
      if (segment.targetHR && (segment.targetHR < 100 || segment.targetHR > 220)) {
        errors.push(`Segment ${idx + 1}: Heart rate must be between 100 and 220 bpm`);
      }
      prevDistance = segment.distanceKm;
    });

    const lastSegment = plan.pacing.segments[plan.pacing.segments.length - 1];
    if (lastSegment && lastSegment.distanceKm < raceDistanceKm) {
      errors.push(`Last pacing segment must reach race distance (${raceDistanceKm} km)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isRacePlanModified(plan: RacePlan, original: RacePlan): boolean {
  return JSON.stringify(plan) !== JSON.stringify(original);
}

export function cloneRacePlan(plan: RacePlan): RacePlan {
  return JSON.parse(JSON.stringify(plan));
}
