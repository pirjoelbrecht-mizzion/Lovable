/**
 * Race Plan Type Adapters
 *
 * Provides conversion functions between legacy types and the unified v2 structure.
 * These adapters enable gradual migration and backward compatibility.
 */

import type { RacePlan, RaceReference, SimulationInputs, SimulationOutputs, SimulationContext } from '@/types/racePlanV2';
import type { RaceSimulation } from '@/utils/raceSimulation';
import type { WhatIfScenario, SimulationOverrides } from '@/types/whatif';
import type { PacingStrategy } from '@/types/pacing';
import type { PhysiologicalInputs } from '@/types/physiology';
import type { Race } from '@/utils/races';

// ============================================================================
// LEGACY RACE SIMULATION → V2 RACE PLAN
// ============================================================================

/**
 * Convert legacy RaceSimulation to unified RacePlan v2
 */
export function raceSimulationToRacePlan(simulation: RaceSimulation): RacePlan {
  const race: RaceReference = {
    id: simulation.race.id || '',
    name: simulation.race.name,
    distanceKm: simulation.race.distanceKm,
    elevationM: simulation.race.elevationM,
    surface: simulation.race.surface,
    terrain: simulation.race.terrain,
    dateISO: simulation.race.dateISO,
    location: simulation.race.location,
  };

  return {
    race,
    inputs: {
      conditions: {
        temperature: 20,
        humidity: 50,
        elevationGain: simulation.race.elevationM || 0,
        readiness: simulation.readinessScore || 80,
        surfaceType: simulation.race.surface || 'road',
      },
      nutrition: {
        fuelingRate: 60,
        fluidIntake: 700,
        sodiumIntake: 800,
      },
      pacing: [],
    },
    outputs: {
      predictedTimeMin: simulation.predictedTimeMin,
      predictedTimeFormatted: simulation.predictedTimeFormatted,
      avgPace: simulation.avgPace,
      paceFormatted: simulation.paceFormatted,
      factors: {
        terrainFactor: simulation.factors.terrainFactor,
        elevationFactor: simulation.factors.elevationFactor,
        climateFactor: simulation.factors.climateFactor,
        fatiguePenalty: simulation.factors.fatiguePenalty,
        confidence: simulation.factors.confidenceScore,
      },
      performance: simulation.performanceFactors ? {
        combinedPenaltyPercent: 0,
        performanceFactors: simulation.performanceFactors.map((f, idx) => ({
          id: `factor-${idx}`,
          category: f.dataSource === 'training' ? 'Training' :
                    f.dataSource === 'weather' ? 'Environment' : 'Recovery',
          label: f.name,
          value: f.value,
          impact: f.impact,
          magnitude: f.confidence,
          description: f.description,
          color: '#3b82f6',
          percentChange: f.impactPct,
        })),
        extended: {
          trainingConsistency: simulation.extendedFactors?.consistency || 1.0,
          longRunQuality: simulation.extendedFactors?.longRun || 1.0,
          taperQuality: simulation.extendedFactors?.taper || 1.0,
          experience: 1.0,
          weatherImpact: simulation.extendedFactors?.weather || 1.0,
        },
      } : undefined,
    },
    context: {
      readiness: {
        score: simulation.readinessScore,
        category: simulation.readinessScore >= 80 ? 'high' :
                  simulation.readinessScore >= 60 ? 'moderate' : 'low',
      },
      training: {
        basePace: simulation.avgPace,
        baseDistance: simulation.race.distanceKm,
        fitnessLevel: simulation.readinessScore / 100,
      },
      weather: simulation.weatherDescription ? {
        temperature: 20,
        humidity: 50,
        conditions: simulation.weatherDescription,
        source: 'forecast',
      } : undefined,
    },
    ui: {
      message: simulation.message,
      confidence: simulation.confidence,
      tabs: ['Conditions', 'Nutrition', 'Strategy', 'Results'],
    },
    metadata: {
      schema_version: 2,
      scenario_type: 'race',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

// ============================================================================
// WHAT-IF SCENARIO → V2 RACE PLAN
// ============================================================================

/**
 * Convert WhatIfScenario to unified RacePlan v2
 */
export function whatIfScenarioToRacePlan(scenario: WhatIfScenario, race: Race): RacePlan {
  const raceRef: RaceReference = {
    id: race.id || scenario.raceId,
    name: race.name,
    distanceKm: race.distanceKm,
    elevationM: race.elevationM,
    surface: race.surface,
    terrain: race.terrain,
    dateISO: race.dateISO,
    location: race.location,
  };

  const overrides = scenario.overrides;

  return {
    race: raceRef,
    inputs: {
      conditions: {
        temperature: overrides.temperature ?? 20,
        humidity: overrides.humidity ?? 50,
        elevationGain: overrides.elevation ?? race.elevationM ?? 0,
        readiness: overrides.readiness ?? 80,
        surfaceType: overrides.surface ?? race.surface ?? 'road',
        windSpeed: overrides.windSpeed,
        precipitation: overrides.precipitation,
        altitude: overrides.altitude,
      },
      nutrition: {
        fuelingRate: 60,
        fluidIntake: 700,
        sodiumIntake: 800,
      },
      pacing: [],
      overrides: {
        startStrategy: overrides.startStrategy,
        consistency: overrides.consistency,
        longRunReadiness: overrides.longRunReadiness,
        taperQuality: overrides.taperQuality,
      },
    },
    outputs: {
      predictedTimeMin: scenario.predictedTimeMin,
      predictedTimeFormatted: '',
      avgPace: scenario.predictedTimeMin / race.distanceKm,
      paceFormatted: '',
      factors: {
        terrainFactor: 1.0,
        elevationFactor: 1.0,
        climateFactor: 1.0,
        fatiguePenalty: 1.0,
        confidence: 0.75,
      },
    },
    context: {
      readiness: {
        score: overrides.readiness ?? 80,
        category: 'moderate',
      },
      training: {
        basePace: 6.0,
        baseDistance: 10,
        fitnessLevel: 0.7,
      },
    },
    ui: {
      message: scenario.notes || '',
      confidence: 'medium',
      tabs: ['Conditions', 'Nutrition', 'Strategy', 'Results'],
    },
    metadata: {
      schema_version: 2,
      scenario_type: 'whatif',
      created_at: scenario.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

// ============================================================================
// V2 RACE PLAN → LEGACY TYPES (for backward compatibility)
// ============================================================================

/**
 * Convert v2 RacePlan to legacy SimulationOverrides for What-If simulator
 */
export function racePlanToSimulationOverrides(plan: RacePlan): SimulationOverrides {
  return {
    temperature: plan.inputs.conditions.temperature,
    humidity: plan.inputs.conditions.humidity,
    elevation: plan.inputs.conditions.elevationGain,
    readiness: plan.inputs.conditions.readiness,
    surface: plan.inputs.conditions.surfaceType,
    windSpeed: plan.inputs.conditions.windSpeed,
    precipitation: plan.inputs.conditions.precipitation,
    altitude: plan.inputs.conditions.altitude,
    startStrategy: plan.inputs.overrides?.startStrategy,
    consistency: plan.inputs.overrides?.consistency,
    longRunReadiness: plan.inputs.overrides?.longRunReadiness,
    taperQuality: plan.inputs.overrides?.taperQuality,
  };
}

/**
 * Convert v2 RacePlan to legacy PhysiologicalInputs
 */
export function racePlanToPhysiologicalInputs(plan: RacePlan): PhysiologicalInputs {
  return {
    fuelingRate: plan.inputs.nutrition.fuelingRate,
    fluidIntake: plan.inputs.nutrition.fluidIntake,
    sodiumIntake: plan.inputs.nutrition.sodiumIntake,
  };
}

/**
 * Convert v2 RacePlan to legacy PacingStrategy
 */
export function racePlanToPacingStrategy(plan: RacePlan): PacingStrategy {
  return {
    race_id: plan.race.id,
    name: `${plan.race.name} Pacing Strategy`,
    mode: plan.inputs.pacing.length > 0 ? 'manual' : 'auto',
    segments: plan.inputs.pacing.map(seg => ({
      distanceKm: seg.endKm,
      targetPace: seg.targetPace,
      targetHR: seg.targetHR,
      notes: seg.notes,
    })),
  };
}

// ============================================================================
// PACING STRATEGY → V2 RACE PLAN INPUTS
// ============================================================================

/**
 * Merge PacingStrategy into RacePlan inputs
 */
export function mergePacingStrategyIntoRacePlan(plan: RacePlan, strategy: PacingStrategy): RacePlan {
  const segments = strategy.segments.map((seg, idx) => ({
    startKm: idx === 0 ? 0 : strategy.segments[idx - 1].distanceKm,
    endKm: seg.distanceKm,
    targetPace: seg.targetPace,
    targetHR: seg.targetHR,
    notes: seg.notes,
  }));

  return {
    ...plan,
    inputs: {
      ...plan.inputs,
      pacing: segments,
    },
    metadata: {
      ...plan.metadata,
      pacingStrategyId: strategy.id,
      updated_at: new Date().toISOString(),
    },
  };
}

// ============================================================================
// DATABASE ROW → V2 RACE PLAN
// ============================================================================

/**
 * Convert database row to RacePlan (handles both v1 and v2 formats)
 */
export function dbRowToRacePlan(row: any): RacePlan | null {
  if (!row) return null;

  // If schema_version is 2 and race_plan exists, parse it
  if (row.schema_version === 2 && row.race_plan) {
    const plan = typeof row.race_plan === 'string'
      ? JSON.parse(row.race_plan)
      : row.race_plan;

    return {
      id: row.id,
      user_id: row.user_id,
      ...plan,
    };
  }

  // Otherwise, convert v1 flat structure to v2
  return {
    id: row.id,
    user_id: row.user_id,
    race: {
      id: row.race_id,
      name: row.race_name,
      distanceKm: row.race_distance_km,
      dateISO: row.race_date,
    },
    inputs: {
      conditions: {
        temperature: 20,
        humidity: 50,
        elevationGain: 0,
        readiness: row.readiness_score || 80,
        surfaceType: 'road',
      },
      nutrition: {
        fuelingRate: 60,
        fluidIntake: 700,
        sodiumIntake: 800,
      },
      pacing: [],
    },
    outputs: {
      predictedTimeMin: row.predicted_time_min,
      predictedTimeFormatted: '',
      avgPace: row.avg_pace,
      paceFormatted: '',
      factors: {
        terrainFactor: row.terrain_factor || 1.0,
        elevationFactor: row.elevation_factor || 1.0,
        climateFactor: row.climate_factor || 1.0,
        fatiguePenalty: row.fatigue_penalty || 1.0,
        confidence: row.confidence_score || 0.75,
      },
    },
    context: {
      readiness: {
        score: row.readiness_score || 80,
        category: row.confidence || 'medium',
      },
      training: {
        basePace: row.avg_pace || 6.0,
        baseDistance: row.race_distance_km || 10,
        fitnessLevel: 0.7,
      },
    },
    ui: {
      message: row.simulation_message || '',
      confidence: row.confidence || 'medium',
      tabs: ['Conditions', 'Nutrition', 'Strategy', 'Results'],
    },
    metadata: {
      schema_version: 2,
      scenario_type: row.scenario_type || 'race',
      parent_id: row.parent_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
}

/**
 * Convert RacePlan to database-ready object
 */
export function racePlanToDbRow(plan: RacePlan): any {
  return {
    race_id: plan.race.id,
    race_name: plan.race.name,
    race_distance_km: plan.race.distanceKm,
    race_date: plan.race.dateISO,
    schema_version: 2,
    scenario_type: plan.metadata.scenario_type,
    race_plan: plan,
    parent_id: plan.metadata.parent_id || null,
  };
}
