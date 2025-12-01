/**
 * Unified Race Plan Type Definitions (V2)
 *
 * This file defines the unified data structure for Race Mode, What-If Simulator,
 * and Pacing Strategy. It replaces the fragmented types across multiple files
 * with a single, cohesive model.
 *
 * Architecture:
 * - RacePlan: Top-level unified interface
 * - Inputs: All user-configurable parameters (conditions, nutrition, pacing)
 * - Outputs: All computed simulation results
 * - Context: Environmental and training context data
 * - UI: User interface state and messaging
 * - Metadata: Versioning and tracking information
 */

// ============================================================================
// RACE REFERENCE
// ============================================================================

export interface RaceReference {
  id: string;
  name: string;
  distanceKm: number;
  elevationM?: number;
  surface?: 'road' | 'trail' | 'mixed';
  terrain?: 'flat' | 'hilly' | 'mountainous';
  dateISO?: string;
  location?: string;
}

// ============================================================================
// INPUTS - User-Configurable Parameters
// ============================================================================

export interface ConditionsInputs {
  temperature: number;          // °C
  humidity: number;             // %
  elevationGain: number;        // m
  readiness: number;            // 0-100
  surfaceType: 'road' | 'trail' | 'mixed';
  windSpeed?: number;           // kph
  precipitation?: number;       // mm
  altitude?: number;            // m above sea level
}

export interface NutritionInputs {
  fuelingRate: number;          // g/hr
  fluidIntake: number;          // ml/hr
  sodiumIntake: number;         // mg/hr
}

export interface PacingSegment {
  startKm: number;
  endKm: number;
  targetPace: number;           // min/km
  targetHR?: number;            // bpm
  effort?: 'easy' | 'moderate' | 'hard' | 'max';
  notes?: string;
}

export interface SimulationOverrides {
  // Start strategy
  startStrategy?: 'conservative' | 'target' | 'aggressive';

  // Physiological parameters
  vo2max?: number;
  lactateThreshold?: number;
  runningEconomy?: number;

  // Training context overrides
  consistency?: number;         // 0-100%
  longRunReadiness?: number;    // 0-100%
  taperQuality?: number;        // 0-100%
}

export interface SimulationInputs {
  conditions: ConditionsInputs;
  nutrition: NutritionInputs;
  pacing: PacingSegment[];
  overrides?: SimulationOverrides;
}

// ============================================================================
// OUTPUTS - Computed Simulation Results
// ============================================================================

export interface SimulationFactors {
  terrainFactor: number;
  elevationFactor: number;
  climateFactor: number;
  fatiguePenalty: number;
  confidence: number;           // 0-1, renamed from confidenceScore
}

export interface EnergyFatigueDynamics {
  distanceKm: number[];
  fatiguePercent: number[];
  energyPercent: number[];
}

export interface PhysiologicalSimulation {
  energyFatigueDynamics: EnergyFatigueDynamics;
  hydrationLevel: number;       // %
  sodiumBalance: number;        // mg
  giRisk: number;               // 0-100%
  perfPenalty: number;          // performance penalty %
  timeToExhaustionKm: number;
  adjustedFinishTimeMin: number;
  criticalMoments?: Array<{
    km: number;
    type: 'energy' | 'hydration' | 'fatigue';
    message: string;
  }>;
}

export interface PerformanceFactor {
  id: string;
  category: 'Training' | 'Recovery' | 'Environment';
  label: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: 'high' | 'medium' | 'low';
  description: string;
  color: string;
  percentChange: number;
}

export interface ExtendedPerformanceFactors {
  trainingConsistency: number;
  longRunQuality: number;
  taperQuality: number;
  experience: number;
  weatherImpact: number;
}

export interface PerformanceAnalysis {
  combinedPenaltyPercent: number;
  performanceFactors: PerformanceFactor[];
  extended: ExtendedPerformanceFactors;
}

export interface SimulationOutputs {
  predictedTimeMin: number;
  predictedTimeFormatted: string;
  avgPace: number;
  paceFormatted: string;
  factors: SimulationFactors;
  physiological?: PhysiologicalSimulation;
  performance?: PerformanceAnalysis;
}

// ============================================================================
// CONTEXT - Environmental and Training Data
// ============================================================================

export interface ReadinessScore {
  score: number;                // 0-100
  category: 'high' | 'moderate' | 'low';
  factors?: {
    sleep?: number;
    stress?: number;
    soreness?: number;
    mood?: number;
    hrv?: number;
  };
}

export interface TrainingStats {
  basePace: number;             // min/km
  baseDistance: number;         // km
  fitnessLevel: number;         // 0-1
  weeklyVolume?: number;        // km
  longestRun?: number;          // km
}

export interface WeatherForecast {
  temperature: number;          // °C
  humidity: number;             // %
  conditions: string;
  windSpeed?: number;           // kph
  precipitation?: number;       // mm
  impactFactor?: number;        // 0-1
  source?: 'forecast' | 'historical' | 'manual';
}

export interface SimulationContext {
  readiness: ReadinessScore;
  training: TrainingStats;
  weather?: WeatherForecast;
}

// ============================================================================
// UI - User Interface State
// ============================================================================

export interface SimulationUI {
  message: string;              // AI-generated advice or summary
  confidence: 'high' | 'medium' | 'low';
  tabs?: string[];              // e.g., ["Conditions", "Nutrition", "Strategy", "Results"]
}

// ============================================================================
// METADATA - Versioning and Tracking
// ============================================================================

export interface SimulationMetadata {
  schema_version: number;       // 2 for v2 unified structure
  scenario_type: 'race' | 'whatif' | 'training';
  pacingStrategyId?: string;
  parent_id?: string;           // Reference to parent simulation for comparison
  created_at: string;
  updated_at: string;
}

// ============================================================================
// UNIFIED RACE PLAN
// ============================================================================

export interface RacePlan {
  id?: string;
  user_id?: string;
  race: RaceReference;
  inputs: SimulationInputs;
  outputs: SimulationOutputs;
  context: SimulationContext;
  ui: SimulationUI;
  metadata: SimulationMetadata;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_CONDITIONS: ConditionsInputs = {
  temperature: 20,
  humidity: 50,
  elevationGain: 0,
  readiness: 80,
  surfaceType: 'road',
};

export const DEFAULT_NUTRITION: NutritionInputs = {
  fuelingRate: 60,
  fluidIntake: 700,
  sodiumIntake: 800,
};

export const DEFAULT_SIMULATION_INPUTS: Omit<SimulationInputs, 'pacing'> = {
  conditions: DEFAULT_CONDITIONS,
  nutrition: DEFAULT_NUTRITION,
};

export const DEFAULT_READINESS: ReadinessScore = {
  score: 80,
  category: 'moderate',
};

export const DEFAULT_TRAINING_STATS: TrainingStats = {
  basePace: 6.0,
  baseDistance: 10,
  fitnessLevel: 0.7,
};

// ============================================================================
// HELPER TYPES
// ============================================================================

export type ScenarioType = 'race' | 'whatif' | 'training';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type StartStrategy = 'conservative' | 'target' | 'aggressive';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a default RacePlan for a given race
 */
export function createDefaultRacePlan(race: RaceReference, scenarioType: ScenarioType = 'race'): RacePlan {
  return {
    race,
    inputs: {
      conditions: { ...DEFAULT_CONDITIONS },
      nutrition: { ...DEFAULT_NUTRITION },
      pacing: [],
    },
    outputs: {
      predictedTimeMin: 0,
      predictedTimeFormatted: '0:00:00',
      avgPace: 0,
      paceFormatted: '0:00',
      factors: {
        terrainFactor: 1.0,
        elevationFactor: 1.0,
        climateFactor: 1.0,
        fatiguePenalty: 1.0,
        confidence: 0.75,
      },
    },
    context: {
      readiness: { ...DEFAULT_READINESS },
      training: { ...DEFAULT_TRAINING_STATS },
    },
    ui: {
      message: '',
      confidence: 'medium',
      tabs: ['Conditions', 'Nutrition', 'Strategy', 'Results'],
    },
    metadata: {
      schema_version: 2,
      scenario_type: scenarioType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Validate a RacePlan structure
 */
export function validateRacePlan(plan: RacePlan): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate race reference
  if (!plan.race.id || !plan.race.name || !plan.race.distanceKm) {
    errors.push('Race reference must include id, name, and distanceKm');
  }

  // Validate conditions
  const { temperature, humidity, readiness } = plan.inputs.conditions;
  if (temperature < -20 || temperature > 45) {
    errors.push('Temperature must be between -20°C and 45°C');
  }
  if (humidity < 0 || humidity > 100) {
    errors.push('Humidity must be between 0% and 100%');
  }
  if (readiness < 0 || readiness > 100) {
    errors.push('Readiness must be between 0 and 100');
  }

  // Validate nutrition
  const { fuelingRate, fluidIntake, sodiumIntake } = plan.inputs.nutrition;
  if (fuelingRate < 0 || fuelingRate > 120) {
    errors.push('Fueling rate must be between 0 and 120 g/hr');
  }
  if (fluidIntake < 0 || fluidIntake > 1200) {
    errors.push('Fluid intake must be between 0 and 1200 ml/hr');
  }
  if (sodiumIntake < 0 || sodiumIntake > 1500) {
    errors.push('Sodium intake must be between 0 and 1500 mg/hr');
  }

  // Validate pacing segments
  if (plan.inputs.pacing.length > 0) {
    let prevEndKm = 0;
    plan.inputs.pacing.forEach((segment, idx) => {
      if (segment.startKm < prevEndKm) {
        errors.push(`Segment ${idx + 1}: Start must be >= previous segment end`);
      }
      if (segment.endKm <= segment.startKm) {
        errors.push(`Segment ${idx + 1}: End must be > start`);
      }
      if (segment.targetPace < 3.0 || segment.targetPace > 15.0) {
        errors.push(`Segment ${idx + 1}: Pace must be between 3:00 and 15:00 min/km`);
      }
      prevEndKm = segment.endKm;
    });

    const lastSegment = plan.inputs.pacing[plan.inputs.pacing.length - 1];
    if (lastSegment && lastSegment.endKm > plan.race.distanceKm) {
      errors.push('Last pacing segment exceeds race distance');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Clone a RacePlan (deep copy)
 */
export function cloneRacePlan(plan: RacePlan): RacePlan {
  return JSON.parse(JSON.stringify(plan));
}

/**
 * Check if two RacePlans are different
 */
export function isRacePlanModified(current: RacePlan, original: RacePlan): boolean {
  // Compare without metadata timestamps
  const strip = (p: RacePlan) => {
    const copy = cloneRacePlan(p);
    delete copy.metadata.updated_at;
    return copy;
  };
  return JSON.stringify(strip(current)) !== JSON.stringify(strip(original));
}
