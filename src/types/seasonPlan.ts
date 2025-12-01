/**
 * Season Plan Type Definitions
 *
 * Defines the data structures for training macrocycles and season planning.
 * Integrates with the unified RacePlan structure (V2) for storage.
 */

export type MacrocyclePhase =
  | 'base_building'
  | 'sharpening'
  | 'taper'
  | 'race'
  | 'recovery';

export interface Macrocycle {
  phase: MacrocyclePhase;
  displayName: string;
  startDate: string;
  endDate: string;
  durationWeeks: number;
  color: string;
  intensity: number;
  description?: string;
  isManual?: boolean;
  originalWeeks?: number;
  adjustedWeeks?: number;
  lockPhase?: boolean;
  raceId?: string;
}

export type RacePriority = 'A' | 'B' | 'C';

export interface MacrocycleGroup {
  raceId: string;
  raceName: string;
  raceDate: string;
  priority: RacePriority;
  macrocycles: Macrocycle[];
  tuneUpRaces?: Array<{
    id: string;
    name: string;
    date: string;
    priority: RacePriority;
    distanceKm?: number;
  }>;
}

export interface SeasonPlan {
  raceId: string;
  raceName: string;
  seasonStart: string;
  seasonEnd: string;
  totalWeeks: number;
  macrocycles: Macrocycle[];
  macrocycleGroups?: MacrocycleGroup[];
  isManual: boolean;
  isOutOfSync?: boolean;
  viewMode?: 'circular' | 'linear';
  lastGenerated: string;
}

export interface SeasonPlanInputs {
  raceDate: Date;
  raceType: 'marathon' | 'ultra';
  raceDistanceKm: number;
  currentDate?: Date;
  athleteReadiness?: number;
}

export const MACROCYCLE_COLORS: Record<MacrocyclePhase, string> = {
  base_building: '#00BFC2',
  sharpening: '#FBBF24',
  taper: '#EF4444',
  race: '#D1D5DB',
  recovery: '#10B981',
};

export const MACROCYCLE_NAMES: Record<MacrocyclePhase, string> = {
  base_building: 'Base Building',
  sharpening: 'Sharpening',
  taper: 'Taper',
  race: 'Race',
  recovery: 'Recovery',
};

export const MACROCYCLE_DESCRIPTIONS: Record<MacrocyclePhase, string> = {
  base_building: 'Build aerobic base and weekly mileage',
  sharpening: 'Add intensity and race-specific workouts',
  taper: 'Reduce volume while maintaining intensity',
  race: 'Peak performance window',
  recovery: 'Active recovery and regeneration',
};
