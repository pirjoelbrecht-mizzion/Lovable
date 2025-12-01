/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — RACE-SPECIFIC LOGIC
 *  Module 8 — Race Type Customization
 * ======================================================================
 *
 * This module provides race-specific training adaptations for:
 * - 50K vs 100K vs 100M vs 200M differences
 * - Skimo (ski mountaineering) racing
 * - Stage races
 * - Technical terrain requirements
 * - Altitude/climate considerations
 *
 * Each race type requires different training emphasis, taper length,
 * vertical gain preparation, and specificity workouts.
 */

import type {
  RaceEvent,
  RaceType,
  AthleteProfile,
  TrainingPhase,
  WorkoutType
} from './types';

export interface RaceSpecificRequirements {
  minimumWeeks: number;
  optimalWeeks: number;
  taperWeeks: number;
  peakVolumeKm: { min: number; max: number };
  verticalGainWeekly: number;
  technicalSkillsRequired: string[];
  keyWorkouts: WorkoutType[];
  longRunMaxPercent: number;
  backToBackRequired: boolean;
  altitudeTraining?: boolean;
  recommendedGearTraining: string[];
}

export interface PhaseEmphasis {
  base: number;
  intensity: number;
  specificity: number;
  vertical: number;
  technical: number;
}

const RACE_TYPE_REQUIREMENTS: Record<RaceType, RaceSpecificRequirements> = {
  '50K': {
    minimumWeeks: 12,
    optimalWeeks: 16,
    taperWeeks: 2,
    peakVolumeKm: { min: 65, max: 100 },
    verticalGainWeekly: 1500,
    technicalSkillsRequired: ['hill_running', 'trail_navigation'],
    keyWorkouts: ['tempo', 'hill_repeats', 'long'],
    longRunMaxPercent: 35,
    backToBackRequired: false,
    recommendedGearTraining: ['hydration_vest', 'trail_shoes']
  },

  '50M': {
    minimumWeeks: 16,
    optimalWeeks: 20,
    taperWeeks: 2,
    peakVolumeKm: { min: 80, max: 120 },
    verticalGainWeekly: 2000,
    technicalSkillsRequired: ['hill_running', 'trail_navigation', 'night_running'],
    keyWorkouts: ['tempo', 'hill_repeats', 'long', 'back_to_back'],
    longRunMaxPercent: 35,
    backToBackRequired: true,
    recommendedGearTraining: ['hydration_vest', 'headlamp', 'nutrition_strategy']
  },

  '100K': {
    minimumWeeks: 20,
    optimalWeeks: 24,
    taperWeeks: 3,
    peakVolumeKm: { min: 100, max: 140 },
    verticalGainWeekly: 2500,
    technicalSkillsRequired: ['endurance_pacing', 'night_running', 'aid_station_management'],
    keyWorkouts: ['long', 'back_to_back', 'tempo', 'vertical'],
    longRunMaxPercent: 40,
    backToBackRequired: true,
    recommendedGearTraining: ['race_vest', 'headlamp', 'poles', 'nutrition_strategy']
  },

  '100M': {
    minimumWeeks: 24,
    optimalWeeks: 32,
    taperWeeks: 3,
    peakVolumeKm: { min: 110, max: 160 },
    verticalGainWeekly: 3000,
    technicalSkillsRequired: [
      'endurance_pacing',
      'night_running',
      'sleep_deprivation_management',
      'crew_coordination'
    ],
    keyWorkouts: ['long', 'back_to_back', 'vertical', 'tempo'],
    longRunMaxPercent: 45,
    backToBackRequired: true,
    altitudeTraining: true,
    recommendedGearTraining: ['race_vest', 'headlamp', 'poles', 'drop_bags', 'crew_support']
  },

  '200M': {
    minimumWeeks: 32,
    optimalWeeks: 40,
    taperWeeks: 4,
    peakVolumeKm: { min: 130, max: 180 },
    verticalGainWeekly: 3500,
    technicalSkillsRequired: [
      'multi_day_endurance',
      'sleep_deprivation',
      'extreme_weather',
      'self_sufficiency'
    ],
    keyWorkouts: ['long', 'back_to_back', 'multi_day', 'vertical'],
    longRunMaxPercent: 50,
    backToBackRequired: true,
    altitudeTraining: true,
    recommendedGearTraining: ['full_gear_setup', 'extreme_conditions', 'mental_resilience']
  },

  'Skimo': {
    minimumWeeks: 16,
    optimalWeeks: 20,
    taperWeeks: 2,
    peakVolumeKm: { min: 60, max: 100 },
    verticalGainWeekly: 4000,
    technicalSkillsRequired: [
      'ski_technique',
      'transition_speed',
      'altitude_training',
      'equipment_management'
    ],
    keyWorkouts: ['vertical', 'ski_specific', 'threshold', 'hill_sprints'],
    longRunMaxPercent: 30,
    backToBackRequired: false,
    altitudeTraining: true,
    recommendedGearTraining: ['skimo_equipment', 'transitions', 'avalanche_safety']
  },

  'StageRace': {
    minimumWeeks: 20,
    optimalWeeks: 28,
    taperWeeks: 2,
    peakVolumeKm: { min: 100, max: 150 },
    verticalGainWeekly: 2500,
    technicalSkillsRequired: [
      'daily_recovery',
      'cumulative_fatigue_management',
      'consistent_pacing'
    ],
    keyWorkouts: ['back_to_back', 'multi_day', 'tempo', 'recovery'],
    longRunMaxPercent: 35,
    backToBackRequired: true,
    recommendedGearTraining: ['compression', 'recovery_tools', 'nutrition']
  },

  'Marathon': {
    minimumWeeks: 12,
    optimalWeeks: 16,
    taperWeeks: 2,
    peakVolumeKm: { min: 65, max: 100 },
    verticalGainWeekly: 500,
    technicalSkillsRequired: ['pacing', 'race_strategy'],
    keyWorkouts: ['tempo', 'threshold', 'long', 'intervals'],
    longRunMaxPercent: 35,
    backToBackRequired: false,
    recommendedGearTraining: ['race_shoes', 'race_nutrition']
  },

  'HalfMarathon': {
    minimumWeeks: 10,
    optimalWeeks: 12,
    taperWeeks: 1,
    peakVolumeKm: { min: 50, max: 80 },
    verticalGainWeekly: 300,
    technicalSkillsRequired: ['pacing', 'speed_endurance'],
    keyWorkouts: ['tempo', 'threshold', 'intervals'],
    longRunMaxPercent: 30,
    backToBackRequired: false,
    recommendedGearTraining: ['race_shoes']
  },

  'Custom': {
    minimumWeeks: 12,
    optimalWeeks: 20,
    taperWeeks: 2,
    peakVolumeKm: { min: 60, max: 120 },
    verticalGainWeekly: 2000,
    technicalSkillsRequired: [],
    keyWorkouts: ['long', 'tempo', 'hill_repeats'],
    longRunMaxPercent: 40,
    backToBackRequired: false,
    recommendedGearTraining: []
  }
};

export function getRaceRequirements(race: RaceEvent): RaceSpecificRequirements {
  const baseRequirements = RACE_TYPE_REQUIREMENTS[race.raceType];

  const adjusted = { ...baseRequirements };

  if (race.verticalGain > 3000) {
    adjusted.verticalGainWeekly = Math.max(adjusted.verticalGainWeekly, 3000);
    adjusted.keyWorkouts = [...new Set([...adjusted.keyWorkouts, 'vertical' as WorkoutType])];
  }

  if (race.altitude && race.altitude > 2000) {
    adjusted.altitudeTraining = true;
  }

  if (race.climate === 'hot' || race.climate === 'humid') {
    adjusted.technicalSkillsRequired.push('heat_acclimatization');
  } else if (race.climate === 'cold') {
    adjusted.technicalSkillsRequired.push('cold_weather_management');
  }

  if (race.terrain === 'mountain' || race.technicalDifficulty === 'hard') {
    adjusted.technicalSkillsRequired.push('technical_terrain');
  }

  return adjusted;
}

export function calculatePhaseEmphasis(
  race: RaceEvent,
  phase: TrainingPhase
): PhaseEmphasis {
  const requirements = getRaceRequirements(race);

  const isLongDistance = ['100M', '200M', 'StageRace'].includes(race.raceType);
  const isVerticalHeavy = race.verticalGain > 2500 || race.raceType === 'Skimo';
  const isTechnical = race.terrain === 'mountain' || race.technicalDifficulty === 'hard';

  const emphasis: PhaseEmphasis = {
    base: 0,
    intensity: 0,
    specificity: 0,
    vertical: 0,
    technical: 0
  };

  switch (phase) {
    case 'base':
      emphasis.base = 100;
      emphasis.vertical = isVerticalHeavy ? 40 : 20;
      emphasis.technical = isTechnical ? 30 : 10;
      break;

    case 'intensity':
      emphasis.intensity = 100;
      emphasis.base = 60;
      emphasis.vertical = isVerticalHeavy ? 60 : 30;
      emphasis.technical = isTechnical ? 40 : 20;
      break;

    case 'specificity':
      emphasis.specificity = 100;
      emphasis.intensity = 70;
      emphasis.vertical = isVerticalHeavy ? 80 : 40;
      emphasis.technical = isTechnical ? 80 : 30;
      break;

    case 'taper':
      emphasis.specificity = 60;
      emphasis.intensity = 40;
      emphasis.vertical = 30;
      emphasis.technical = 40;
      break;

    default:
      emphasis.base = 50;
  }

  if (isLongDistance) {
    emphasis.base *= 1.2;
    emphasis.specificity *= 1.3;
  }

  return emphasis;
}

export function adjustVolumeForRaceType(
  baseVolume: number,
  race: RaceEvent,
  athlete: AthleteProfile
): number {
  const requirements = getRaceRequirements(race);

  let adjusted = baseVolume;

  const category = athlete.category || 'Cat1';
  const { min, max } = requirements.peakVolumeKm;

  if (category === 'Cat2') {
    adjusted = Math.min(adjusted, max);
  } else {
    adjusted = Math.min(adjusted, max * 0.8);
  }

  adjusted = Math.max(adjusted, min);

  if (athlete.age) {
    if (athlete.age >= 50) {
      adjusted *= 0.85;
    } else if (athlete.age >= 40) {
      adjusted *= 0.92;
    }
  }

  if (athlete.longestRaceCompletedKm < race.distanceKm * 0.5) {
    adjusted *= 0.9;
  }

  return Math.round(adjusted);
}

export function getKeyWorkoutsForPhase(
  race: RaceEvent,
  phase: TrainingPhase
): WorkoutType[] {
  const requirements = getRaceRequirements(race);
  const emphasis = calculatePhaseEmphasis(race, phase);

  const workouts: WorkoutType[] = [];

  switch (phase) {
    case 'base':
      workouts.push('easy', 'long');
      if (emphasis.vertical > 30) workouts.push('hill_repeats');
      if (emphasis.technical > 20) workouts.push('technical_trail');
      break;

    case 'intensity':
      workouts.push('tempo', 'threshold');
      if (emphasis.vertical > 50) workouts.push('vertical', 'hill_repeats');
      if (requirements.backToBackRequired) workouts.push('long');
      break;

    case 'specificity':
      workouts.push('long');
      if (requirements.backToBackRequired) workouts.push('back_to_back');
      if (emphasis.vertical > 70) workouts.push('vertical');
      if (race.raceType === 'Skimo') workouts.push('ski_specific');
      workouts.push('race_pace');
      break;

    case 'taper':
      workouts.push('easy', 'race_pace');
      if (emphasis.technical > 30) workouts.push('technical_trail');
      break;

    default:
      workouts.push('easy', 'recovery');
  }

  return workouts;
}

export function calculateLongRunDistance(
  race: RaceEvent,
  weeklyVolume: number,
  phase: TrainingPhase
): number {
  const requirements = getRaceRequirements(race);

  let longRunPercent = requirements.longRunMaxPercent;

  switch (phase) {
    case 'base':
      longRunPercent *= 0.7;
      break;
    case 'intensity':
      longRunPercent *= 0.85;
      break;
    case 'specificity':
      longRunPercent *= 1.0;
      break;
    case 'taper':
      longRunPercent *= 0.5;
      break;
  }

  let longRunDistance = (weeklyVolume * longRunPercent) / 100;

  const raceDistanceCap = race.distanceKm * 0.75;
  longRunDistance = Math.min(longRunDistance, raceDistanceCap);

  if (['100M', '200M'].includes(race.raceType) && phase === 'specificity') {
    longRunDistance = Math.min(longRunDistance, 55);
  }

  return Math.round(longRunDistance);
}

export function shouldIncludeBackToBack(
  race: RaceEvent,
  phase: TrainingPhase,
  athlete: AthleteProfile
): boolean {
  const requirements = getRaceRequirements(race);

  if (!requirements.backToBackRequired) return false;

  if (phase !== 'specificity' && phase !== 'intensity') return false;

  if (athlete.category === 'Cat1' && race.distanceKm < 80) return false;

  return true;
}

export function getVerticalGainTarget(
  race: RaceEvent,
  phase: TrainingPhase,
  weeklyVolume: number
): number {
  const requirements = getRaceRequirements(race);

  let baseVertical = requirements.verticalGainWeekly;

  const emphasis = calculatePhaseEmphasis(race, phase);
  const multiplier = emphasis.vertical / 100;

  let targetVertical = baseVertical * multiplier;

  if (phase === 'taper') {
    targetVertical *= 0.4;
  }

  const vertPerKm = race.verticalGain / race.distanceKm;
  if (vertPerKm > 50) {
    targetVertical *= 1.3;
  } else if (vertPerKm > 30) {
    targetVertical *= 1.15;
  }

  return Math.round(targetVertical);
}

export function getRaceSpecificNotes(
  race: RaceEvent,
  athlete: AthleteProfile
): string[] {
  const requirements = getRaceRequirements(race);
  const notes: string[] = [];

  if (requirements.altitudeTraining) {
    notes.push(`Altitude training recommended for race at ${race.altitude}m`);
  }

  if (race.climate === 'hot' || race.climate === 'humid') {
    notes.push('Heat acclimatization critical - train in similar conditions');
  } else if (race.climate === 'cold') {
    notes.push('Practice cold weather gear and nutrition strategy');
  }

  if (requirements.backToBackRequired) {
    notes.push('Back-to-back long runs essential for this distance');
  }

  if (race.technicalDifficulty === 'hard' || race.technicalDifficulty === 'extreme') {
    notes.push('Technical terrain practice crucial - seek similar trail conditions');
  }

  if (race.raceType === 'Skimo') {
    notes.push('Ski-specific training and transition practice mandatory');
  }

  if (['100M', '200M'].includes(race.raceType)) {
    notes.push('Night running practice essential - plan several headlamp training runs');
    notes.push('Practice race nutrition and aid station management');
  }

  if (race.distanceKm > athlete.longestRaceCompletedKm * 1.5) {
    notes.push(`Building to ${race.distanceKm}km is a significant step-up. Conservative progression recommended.`);
  }

  const weeksNeeded = requirements.optimalWeeks;
  notes.push(`Optimal training duration: ${weeksNeeded} weeks (minimum: ${requirements.minimumWeeks})`);

  return notes;
}

export function validateRaceReadiness(
  race: RaceEvent,
  athlete: AthleteProfile,
  weeksTrained: number
): { ready: boolean; gaps: string[]; score: number } {
  const requirements = getRaceRequirements(race);
  const gaps: string[] = [];
  let score = 100;

  if (weeksTrained < requirements.minimumWeeks) {
    gaps.push(`Insufficient training time (${weeksTrained}/${requirements.minimumWeeks} weeks)`);
    score -= 30;
  } else if (weeksTrained < requirements.optimalWeeks) {
    gaps.push(`Below optimal training time (${weeksTrained}/${requirements.optimalWeeks} weeks)`);
    score -= 10;
  }

  if (athlete.longestRaceCompletedKm < race.distanceKm * 0.6) {
    gaps.push(`Longest race completed (${athlete.longestRaceCompletedKm}km) is <60% of goal race`);
    score -= 20;
  }

  const avgMileage = athlete.averageMileage || 0;
  if (avgMileage < requirements.peakVolumeKm.min * 0.7) {
    gaps.push(`Average weekly mileage (${avgMileage}km) below recommended minimum`);
    score -= 15;
  }

  if (requirements.altitudeTraining && (!race.altitude || athlete.longestRaceCompletedKm < 50)) {
    gaps.push('Altitude training/experience recommended for this race');
    score -= 10;
  }

  if (race.raceType === 'Skimo' && !athlete.recentRaces.some(r => r.raceName.toLowerCase().includes('ski'))) {
    gaps.push('No ski mountaineering race experience detected');
    score -= 25;
  }

  return {
    ready: score >= 70,
    gaps,
    score: Math.max(0, score)
  };
}
