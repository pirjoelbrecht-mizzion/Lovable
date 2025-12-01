/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — MACROCYCLE PLANNER
 *  Module 3 — Phase Structure Generation
 * ======================================================================
 *
 * This module generates the macrocycle structure, allocating weeks to
 * training phases (Transition → Base → Intensity → Specificity → Taper → Goal)
 * based on the athlete's profile, race type, and timeline.
 *
 * Phases follow periodization principles:
 * - Transition: Post-race recovery (2-3 weeks)
 * - Base: Aerobic development (4-12+ weeks depending on deficiency)
 * - Intensity: Speed & threshold work (4-8 weeks)
 * - Specificity: Race-specific training (4-8 weeks)
 * - Taper: Pre-race freshening (1-3 weeks based on race distance)
 * - Goal: Race week
 */

import type {
  AthleteProfile,
  AthleteCategory,
  RaceEvent,
  RaceType,
  TrainingPhase,
  MacrocycleWeek
} from './types';
import { TAPER_DURATION_WEEKS } from './types';
import { assessAerobicDeficiency } from './athlete-profiler';

//
// ─────────────────────────────────────────────────────────────
//   PHASE DURATION RULES
// ─────────────────────────────────────────────────────────────
//

const PHASE_DURATION_RULES = {
  transition: {
    min: 1,
    default: 2,
    max: 4,
  },
  base: {
    min_cat1: 8,
    min_cat2: 6,
    default: 8,
    max: 16,
  },
  intensity: {
    min: 4,
    default: 6,
    max: 10,
  },
  specificity: {
    min: 4,
    default_50K: 5,
    default_100M: 7,
    default_200M: 8,
    max: 12,
  },
};

//
// ─────────────────────────────────────────────────────────────
//   MACROCYCLE INPUT
// ─────────────────────────────────────────────────────────────
//

export interface MacrocycleInput {
  athlete: AthleteProfile;
  race: RaceEvent;
  startDate?: string;         // ISO date (defaults to today)
  comingFromRace?: boolean;   // If true, include transition phase
}

export interface MacrocyclePlan {
  weeks: MacrocycleWeek[];
  totalWeeks: number;
  phaseBreakdown: Record<TrainingPhase, number>; // weeks per phase
  raceDate: string;
  startDate: string;
  notes: string[];
}

//
// ─────────────────────────────────────────────────────────────
//   MAIN MACROCYCLE GENERATION
// ─────────────────────────────────────────────────────────────
//

/**
 * Helper: Get Monday of the current week
 */
function getMondayOfWeek(date?: Date): string {
  const d = date || new Date();
  const dayOfWeek = d.getDay();
  // If Sunday (0), go back 6 days. Otherwise go back (dayOfWeek - 1) days
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysToMonday);
  return d.toISOString().slice(0, 10);
}

/**
 * Generate complete macrocycle plan from start date to race
 */
export function generateMacrocycle(input: MacrocycleInput): MacrocyclePlan {
  // Always start on Monday of current week
  const startDate = input.startDate ? getMondayOfWeek(new Date(input.startDate)) : getMondayOfWeek();
  const raceDate = input.race.date;

  // Calculate total available weeks
  const totalWeeks = calculateWeeksBetween(startDate, raceDate);

  if (totalWeeks < 8) {
    throw new Error(
      `Insufficient training time: ${totalWeeks} weeks. Minimum 8 weeks required for safe ultra preparation.`
    );
  }

  const notes: string[] = [];

  // Allocate weeks to phases
  const phaseAllocation = allocatePhases({
    totalWeeks,
    athlete: input.athlete,
    race: input.race,
    comingFromRace: input.comingFromRace,
  });

  // Build week-by-week schedule
  const weeks = buildWeekSchedule(startDate, raceDate, phaseAllocation);

  // Add contextual notes
  if (input.comingFromRace) {
    notes.push("Plan includes transition phase for post-race recovery");
  }

  if (input.athlete.category === "Cat1") {
    notes.push("Cat1 athlete: Conservative progression with frequent recovery weeks");
  }

  const aerobicAssessment = assessAerobicDeficiency(
    input.athlete.aerobicThreshold,
    input.athlete.lactateThreshold
  );
  if (aerobicAssessment.hasDeficiency) {
    notes.push(
      `Extended base phase to address ${aerobicAssessment.gapPercentage?.toFixed(1)}% AeT/LT gap`
    );
  }

  return {
    weeks,
    totalWeeks,
    phaseBreakdown: phaseAllocation,
    raceDate,
    startDate,
    notes,
  };
}

//
// ─────────────────────────────────────────────────────────────
//   PHASE ALLOCATION LOGIC
// ─────────────────────────────────────────────────────────────
//

interface AllocationInput {
  totalWeeks: number;
  athlete: AthleteProfile;
  race: RaceEvent;
  comingFromRace?: boolean;
}

/**
 * Allocate available weeks to training phases based on athlete needs and race type
 */
function allocatePhases(input: AllocationInput): Record<TrainingPhase, number> {
  const { totalWeeks, athlete, race, comingFromRace } = input;

  let remainingWeeks = totalWeeks;

  // Phase 1: Transition (optional, if coming from race)
  const transitionWeeks = comingFromRace
    ? PHASE_DURATION_RULES.transition.default
    : 0;
  remainingWeeks -= transitionWeeks;

  // Phase 2: Taper (fixed based on race type)
  const taperWeeks = getTaperDuration(race.raceType);
  remainingWeeks -= taperWeeks;

  // Phase 3: Goal week (race week - always 1)
  const goalWeeks = 1;
  remainingWeeks -= goalWeeks;

  // Now allocate remaining weeks to Base, Intensity, Specificity

  // Check for aerobic deficiency - may extend base
  const aerobicAssessment = assessAerobicDeficiency(
    athlete.aerobicThreshold,
    athlete.lactateThreshold
  );
  const baseExtension = aerobicAssessment.extendBasePhaseWeeks;

  // Determine minimum base for category
  const minBase = athlete.category === "Cat1"
    ? PHASE_DURATION_RULES.base.min_cat1
    : PHASE_DURATION_RULES.base.min_cat2;

  // Allocate based on race type and remaining time
  let baseWeeks: number;
  let intensityWeeks: number;
  let specificityWeeks: number;

  if (remainingWeeks < 12) {
    // Short timeline - compress phases
    baseWeeks = Math.max(minBase, Math.floor(remainingWeeks * 0.4));
    intensityWeeks = Math.max(PHASE_DURATION_RULES.intensity.min, Math.floor(remainingWeeks * 0.3));
    specificityWeeks = Math.max(PHASE_DURATION_RULES.specificity.min, remainingWeeks - baseWeeks - intensityWeeks);
  } else if (remainingWeeks < 20) {
    // Standard timeline
    baseWeeks = Math.max(minBase, Math.floor(remainingWeeks * 0.45)) + baseExtension;
    intensityWeeks = PHASE_DURATION_RULES.intensity.default;
    specificityWeeks = remainingWeeks - baseWeeks - intensityWeeks;
  } else {
    // Long timeline - can be more deliberate
    baseWeeks = Math.min(
      PHASE_DURATION_RULES.base.max,
      Math.max(minBase, Math.floor(remainingWeeks * 0.5)) + baseExtension
    );
    intensityWeeks = Math.min(
      PHASE_DURATION_RULES.intensity.max,
      Math.floor(remainingWeeks * 0.25)
    );
    specificityWeeks = remainingWeeks - baseWeeks - intensityWeeks;
  }

  // Adjust specificity based on race type
  specificityWeeks = adjustSpecificityForRace(specificityWeeks, race.raceType);

  // Final validation and adjustment
  if (baseWeeks + intensityWeeks + specificityWeeks !== remainingWeeks) {
    const diff = remainingWeeks - (baseWeeks + intensityWeeks + specificityWeeks);
    baseWeeks += diff; // Add any leftover to base
  }

  return {
    transition: transitionWeeks,
    base: baseWeeks,
    intensity: intensityWeeks,
    specificity: specificityWeeks,
    taper: taperWeeks,
    goal: goalWeeks,
  };
}

/**
 * Get taper duration for race type
 */
function getTaperDuration(raceType: RaceType): number {
  return TAPER_DURATION_WEEKS[raceType] || 2;
}

/**
 * Adjust specificity phase length based on race demands
 */
function adjustSpecificityForRace(baseSpecificity: number, raceType: RaceType): number {
  const adjustments: Partial<Record<RaceType, number>> = {
    "50K": 5,
    "100M": 7,
    "200M": 8,
  };

  const ideal = adjustments[raceType];
  if (ideal) {
    return Math.max(PHASE_DURATION_RULES.specificity.min, Math.min(baseSpecificity, ideal));
  }

  return baseSpecificity;
}

//
// ─────────────────────────────────────────────────────────────
//   WEEK SCHEDULE BUILDER
// ─────────────────────────────────────────────────────────────
//

/**
 * Build week-by-week schedule with dates
 */
function buildWeekSchedule(
  startDate: string,
  raceDate: string,
  phaseAllocation: Record<TrainingPhase, number>
): MacrocycleWeek[] {
  const weeks: MacrocycleWeek[] = [];
  let currentDate = new Date(startDate);
  let weekNumber = 1;

  const phases: TrainingPhase[] = ['transition', 'base', 'intensity', 'specificity', 'taper', 'goal'];

  for (const phase of phases) {
    const weeksInPhase = phaseAllocation[phase];
    if (weeksInPhase === 0) continue;

    for (let phaseWeek = 1; phaseWeek <= weeksInPhase; phaseWeek++) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      weeks.push({
        weekNumber,
        phase,
        startDate: weekStart.toISOString().slice(0, 10),
        endDate: weekEnd.toISOString().slice(0, 10),
        phaseWeek,
      });

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
      weekNumber++;
    }
  }

  return weeks;
}

//
// ─────────────────────────────────────────────────────────────
//   UTILITIES
// ─────────────────────────────────────────────────────────────
//

/**
 * Calculate number of weeks between two dates
 */
export function calculateWeeksBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
}

/**
 * Get phase info for a specific week
 */
export function getWeekPhase(macrocycle: MacrocyclePlan, weekNumber: number): MacrocycleWeek | null {
  return macrocycle.weeks.find(w => w.weekNumber === weekNumber) || null;
}

/**
 * Get current training week based on today's date
 */
export function getCurrentWeek(macrocycle: MacrocyclePlan): MacrocycleWeek | null {
  const today = new Date().toISOString().slice(0, 10);

  return macrocycle.weeks.find(week => {
    return today >= week.startDate && today <= week.endDate;
  }) || null;
}

/**
 * Check if athlete is in taper phase
 */
export function isInTaper(macrocycle: MacrocyclePlan): boolean {
  const currentWeek = getCurrentWeek(macrocycle);
  return currentWeek?.phase === 'taper';
}

/**
 * Get weeks remaining until race
 */
export function getWeeksToRace(macrocycle: MacrocyclePlan): number {
  const currentWeek = getCurrentWeek(macrocycle);
  if (!currentWeek) return 0;

  const raceWeek = macrocycle.weeks.find(w => w.phase === 'goal');
  if (!raceWeek) return 0;

  return raceWeek.weekNumber - currentWeek.weekNumber;
}

/**
 * Adjust macrocycle if athlete is behind or ahead
 */
export function adjustMacrocycle(
  original: MacrocyclePlan,
  adjustment: {
    extendBase?: number;      // weeks to add to base
    shortenIntensity?: number; // weeks to remove from intensity
    earlyTaper?: boolean;     // start taper early
  }
): MacrocyclePlan {
  // Clone phase breakdown
  const phaseBreakdown = { ...original.phaseBreakdown };

  if (adjustment.extendBase) {
    phaseBreakdown.base += adjustment.extendBase;
    // Take from intensity if possible
    if (phaseBreakdown.intensity > PHASE_DURATION_RULES.intensity.min) {
      const canTake = Math.min(
        adjustment.extendBase,
        phaseBreakdown.intensity - PHASE_DURATION_RULES.intensity.min
      );
      phaseBreakdown.intensity -= canTake;
    }
  }

  if (adjustment.shortenIntensity && phaseBreakdown.intensity > PHASE_DURATION_RULES.intensity.min) {
    const canShorten = Math.min(
      adjustment.shortenIntensity,
      phaseBreakdown.intensity - PHASE_DURATION_RULES.intensity.min
    );
    phaseBreakdown.intensity -= canShorten;
    phaseBreakdown.specificity += canShorten; // Give to specificity
  }

  if (adjustment.earlyTaper) {
    // Start taper 1 week early
    phaseBreakdown.taper += 1;
    if (phaseBreakdown.specificity > PHASE_DURATION_RULES.specificity.min) {
      phaseBreakdown.specificity -= 1;
    }
  }

  // Rebuild weeks
  const weeks = buildWeekSchedule(original.startDate, original.raceDate, phaseBreakdown);

  return {
    ...original,
    weeks,
    phaseBreakdown,
    notes: [
      ...original.notes,
      "Plan adjusted based on athlete progress",
    ],
  };
}
