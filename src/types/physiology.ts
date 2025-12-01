export type PhysiologicalInputs = {
  fuelingRate: number;
  fluidIntake: number;
  sodiumIntake: number;
};

export type EnergyState = {
  glycogenPct: number;
  fatiguePct: number;
  distanceKm: number;
};

export type HydrationState = {
  hydrationPct: number;
  sodiumBalanceMg: number;
  sweatRateMlPerHr: number;
};

export type GIRiskFactors = {
  fuelingRate: number;
  heatIndex: number;
  intensityPct: number;
  fluidIntake: number;
};

export type GIRiskAssessment = {
  riskPct: number;
  level: 'low' | 'moderate' | 'high' | 'very-high';
  message: string;
};

export type EnergyDynamics = {
  conservative: EnergyState[];
  target: EnergyState[];
  aggressive: EnergyState[];
  timeToExhaustion: {
    conservative: number;
    target: number;
    aggressive: number;
  };
  selectedStrategy?: 'conservative' | 'target' | 'aggressive';
};

export type PerformanceImpact = {
  totalPenaltyPct: number;
  baseTimeMin: number;
  adjustedTimeMin: number;
  timeDeltaMin: number;
  factors: {
    heat: number;
    hydration: number;
    fueling: number;
    fatigue: number;
  };
  status: 'optimal' | 'acceptable' | 'warning' | 'danger';
};

export type PhysiologicalSimulation = {
  inputs: PhysiologicalInputs;
  energyDynamics: EnergyDynamics;
  hydration: HydrationState;
  giRisk: GIRiskAssessment;
  performanceImpact: PerformanceImpact;
  insights: string[];
};

export const DEFAULT_PHYSIOLOGICAL_INPUTS: PhysiologicalInputs = {
  fuelingRate: 60,
  fluidIntake: 600,
  sodiumIntake: 800,
};

export const PHYSIOLOGICAL_RANGES = {
  fuelingRate: { min: 0, max: 120, default: 60, step: 5, unit: 'g/hr' },
  fluidIntake: { min: 0, max: 1200, default: 600, step: 50, unit: 'ml/hr' },
  sodiumIntake: { min: 0, max: 1500, default: 800, step: 50, unit: 'mg/hr' },
};
