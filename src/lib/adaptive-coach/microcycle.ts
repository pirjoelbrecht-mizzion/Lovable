/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — MICROCYCLE GENERATOR
 *  Module 5 — Weekly Plan Engine
 * ======================================================================
 *
 * This module generates detailed weekly training plans (microcycles) by:
 * - Selecting appropriate workouts from the library
 * - Distributing workouts across the week
 * - Balancing hard/easy days
 * - Setting volume and vertical targets
 * - Respecting recovery ratios
 *
 * Weekly structure principles:
 * - 1-2 rest/recovery days
 * - Long run on weekend
 * - 1-2 key workouts (phase-dependent)
 * - Easy runs as filler
 * - Strength sessions 2x/week
 * - No back-to-back hard days
 */

import type {
  AthleteProfile,
  RaceEvent,
  WeeklyPlan,
  DailyPlan,
  Workout,
  TrainingPhase,
  MacrocycleWeek
} from './types';
import {
  queryWorkouts,
  getWorkoutById,
  meetsPrerequisites
} from './workout-library';
import type { TrainingConstraints } from './constraints';

//
// ─────────────────────────────────────────────────────────────
//   MICROCYCLE GENERATION INPUT
// ─────────────────────────────────────────────────────────────
//

export interface MicrocycleInput {
  weekNumber: number;
  macrocycleWeek: MacrocycleWeek;
  athlete: AthleteProfile;
  race: RaceEvent;
  isRecoveryWeek?: boolean;
  previousWeekMileage?: number;
  daysToRace?: number; // CRITICAL: Pass days to race for race week detection
  constraints?: TrainingConstraints; // CRITICAL: v1.1 Rest days from onboarding
}

//
// ─────────────────────────────────────────────────────────────
//   VOLUME PROGRESSION RULES
// ─────────────────────────────────────────────────────────────
//

const PROGRESSION_RULES = {
  MAX_WEEKLY_INCREASE: 0.10, // 10% rule
  RECOVERY_WEEK_REDUCTION: 0.20, // 20% drop
  BASE_VOLUME_MULTIPLIER: {
    Cat1: { min: 0.6, max: 1.0 },
    Cat2: { min: 0.8, max: 1.2 },
  },
};

//
// ─────────────────────────────────────────────────────────────
//   MAIN GENERATION FUNCTION
// ─────────────────────────────────────────────────────────────
//

/**
 * Generate a complete weekly training plan
 */
export function generateMicrocycle(input: MicrocycleInput): WeeklyPlan {
  const { weekNumber, macrocycleWeek, athlete, race, isRecoveryWeek, previousWeekMileage, constraints } = input;

  // Calculate target volume
  const targetMileage = calculateTargetMileage({
    athlete,
    phase: macrocycleWeek.phase,
    weekNumber,
    previousWeekMileage,
    isRecoveryWeek,
  });

  const targetVert = calculateTargetVert(race, macrocycleWeek.phase, targetMileage);

  // Select workouts for the week
  const workouts = selectWeekWorkouts({
    phase: macrocycleWeek.phase,
    athlete,
    race,
    targetMileage,
    isRecoveryWeek: isRecoveryWeek || false,
    constraints,
  });

  // Convert workout ranges to concrete values
  const concreteWorkouts = workouts.map(w => concretizeWorkout(w, targetMileage, workouts.length));

  console.log('[MicrocycleGenerator] Workouts selected:', workouts.map(w => ({ id: w.id, type: w.type, title: w.title })));
  console.log('[MicrocycleGenerator] Concrete workouts:', concreteWorkouts.map(w => ({
    id: w.id,
    type: w.type,
    title: w.title,
    km: w.distanceKm,
    min: w.durationMin,
    vert: w.verticalGain,
    vertRange: w.verticalRange
  })));

  // Distribute across days (respecting rest day constraints from onboarding)
  const days = distributeWorkouts(
    concreteWorkouts,
    macrocycleWeek.startDate,
    athlete,
    race,
    input.daysToRace,
    constraints
  );

  return {
    weekNumber,
    phase: macrocycleWeek.phase,
    targetMileage,
    targetVert,
    days,
  };
}

//
// ─────────────────────────────────────────────────────────────
//   WORKOUT CONCRETIZATION
// ─────────────────────────────────────────────────────────────
//

/**
 * Convert workout ranges (durationRange, distanceRange) into concrete values
 */
function concretizeWorkout(workout: Workout, targetMileage: number, totalWorkouts: number): Workout {
  const concrete = { ...workout };

  // Handle rest days first
  if (workout.type === 'rest') {
    concrete.distanceKm = 0;
    concrete.durationMin = 0;
    concrete.verticalGain = 0;
    return concrete;
  }

  // Convert duration range to concrete duration
  if (workout.durationRange && !workout.durationMin) {
    const [min, max] = workout.durationRange;
    concrete.durationMin = Math.round((min + max) / 2);
  }

  // Convert distance range to concrete distance
  if (workout.distanceRange && !workout.distanceKm) {
    const [min, max] = workout.distanceRange;
    concrete.distanceKm = Math.round(((min + max) / 2) * 10) / 10;
  }

  // Convert vertical range to concrete vertical
  if (workout.verticalRange && !workout.verticalGain) {
    const [min, max] = workout.verticalRange;
    concrete.verticalGain = Math.round((min + max) / 2);
  }

  // Fallback: If still no vertical gain, estimate from distance and workout type
  if (!concrete.verticalGain && concrete.distanceKm) {
    // Rough estimate: 10-20m vertical per km depending on workout type
    const vertPerKm = workout.type === 'long' ? 20 :
                      workout.type === 'hill_repeats' || workout.type === 'hill_sprints' ? 50 :
                      15; // default for easy/tempo/vo2
    concrete.verticalGain = Math.round(concrete.distanceKm * vertPerKm);
  }

  // If distance not set, estimate from duration
  if (!concrete.distanceKm && concrete.durationMin) {
    // Estimate at ~6:00/km pace for easy runs, ~5:00/km for harder workouts
    const paceMinPerKm = workout.type === 'easy' ? 6 : 5;
    concrete.distanceKm = Math.round((concrete.durationMin / paceMinPerKm) * 10) / 10;
  }

  // If duration not set, estimate from distance
  if (!concrete.durationMin && concrete.distanceKm) {
    // Estimate at ~6:00/km pace for easy runs, ~5:00/km for harder workouts
    const paceMinPerKm = workout.type === 'easy' ? 6 : 5;
    concrete.durationMin = Math.round(concrete.distanceKm * paceMinPerKm);
  }

  // If still no values, estimate from weekly target
  if (!concrete.distanceKm && !concrete.durationMin) {
    const avgPerWorkout = targetMileage / Math.max(totalWorkouts - 2, 1); // -2 for rest days
    concrete.distanceKm = Math.round(avgPerWorkout * 10) / 10;
    concrete.durationMin = Math.round(concrete.distanceKm * 6);
  }

  // Estimate vertical gain if not set (based on workout type and distance)
  if (!concrete.verticalGain && concrete.distanceKm > 0) {
    if (workout.type === 'hill_repeats' || workout.type === 'hill_sprints') {
      concrete.verticalGain = Math.round(concrete.distanceKm * 40); // ~40m per km for hill workouts
    } else if (workout.type === 'long') {
      concrete.verticalGain = Math.round(concrete.distanceKm * 15); // ~15m per km for long runs
    } else if (workout.type !== 'rest') {
      concrete.verticalGain = Math.round(concrete.distanceKm * 8); // ~8m per km for other workouts
    }
  }

  return concrete;
}

//
// ─────────────────────────────────────────────────────────────
//   TARGET MILEAGE CALCULATION
// ─────────────────────────────────────────────────────────────
//

function calculateTargetMileage(params: {
  athlete: AthleteProfile;
  phase: TrainingPhase;
  weekNumber: number;
  previousWeekMileage?: number;
  isRecoveryWeek?: boolean;
}): number {
  const { athlete, phase, previousWeekMileage, isRecoveryWeek } = params;

  let baseMileage = athlete.startMileage || 40;

  // Phase multipliers
  const phaseMultipliers: Record<TrainingPhase, number> = {
    transition: 0.5,
    base: 0.85,
    intensity: 0.95,
    specificity: 1.0,
    taper: 0.65,
    goal: 0.3, // Race week - very low
  };

  let targetMileage = baseMileage * phaseMultipliers[phase];

  // Apply category multiplier
  const catMultiplier = athlete.category === 'Cat2' ? 1.15 : 1.0;
  targetMileage *= catMultiplier;

  // Progressive overload if not recovery week
  if (!isRecoveryWeek && previousWeekMileage) {
    const maxIncrease = previousWeekMileage * (1 + PROGRESSION_RULES.MAX_WEEKLY_INCREASE);
    targetMileage = Math.min(targetMileage, maxIncrease);
  }

  // Recovery week reduction
  if (isRecoveryWeek && previousWeekMileage) {
    targetMileage = previousWeekMileage * (1 - PROGRESSION_RULES.RECOVERY_WEEK_REDUCTION);
  }

  // Cap at athlete's ceiling
  targetMileage = Math.min(targetMileage, athlete.volumeCeiling || 120);

  return Math.round(targetMileage);
}

//
// ─────────────────────────────────────────────────────────────
//   TARGET VERTICAL CALCULATION
// ─────────────────────────────────────────────────────────────
//

function calculateTargetVert(
  race: RaceEvent,
  phase: TrainingPhase,
  mileage: number
): number {
  // Vert per km varies by race type
  const vertPerKm = race.verticalGain > 1000 ? 40 : 20;

  let targetVert = mileage * vertPerKm;

  // Phase adjustments
  if (phase === 'specificity') {
    targetVert *= 1.3; // Peak vert in specificity
  } else if (phase === 'taper') {
    targetVert *= 0.5;
  }

  return Math.round(targetVert);
}

//
// ─────────────────────────────────────────────────────────────
//   WORKOUT SELECTION
// ─────────────────────────────────────────────────────────────
//

interface WorkoutSelectionInput {
  phase: TrainingPhase;
  athlete: AthleteProfile;
  race: RaceEvent;
  targetMileage: number;
  isRecoveryWeek: boolean;
  constraints?: TrainingConstraints;
}

function selectWeekWorkouts(input: WorkoutSelectionInput): Workout[] {
  const { phase, athlete, race, isRecoveryWeek, constraints } = input;

  console.log('[MicrocycleGenerator] Selecting workouts for:', {
    phase,
    athleteCategory: athlete.category,
    raceType: race.raceType,
    isRecoveryWeek
  });

  const workouts: Workout[] = [];

  // 1. Long run (always on weekend)
  let longRunResults = queryWorkouts({
    type: 'long',
    phase,
    category: athlete.category,
    raceType: race.raceType,
  });

  // Fallback: try without race type
  if (longRunResults.length === 0) {
    longRunResults = queryWorkouts({
      type: 'long',
      phase,
      category: athlete.category,
    });
  }

  // Fallback: try any long run
  if (longRunResults.length === 0) {
    longRunResults = queryWorkouts({
      type: 'long',
    });
  }

  const longRunEntry = longRunResults[0];
  console.log('[MicrocycleGenerator] Long run results:', longRunResults.length, longRunEntry?.id);
  if (longRunEntry && !isRecoveryWeek) {
    const longRunTemplate = { ...longRunEntry.template };

    // Adjust long run for taper: shorter duration and distance
    if (phase === 'taper') {
      longRunTemplate.durationRange = [60, 90];
      longRunTemplate.distanceRange = [10, 15];
      longRunTemplate.verticalRange = [150, 300]; // Reduced vertical for taper
      longRunTemplate.title = 'Taper Long Run';
      longRunTemplate.description = 'Shorter long run to maintain fitness while reducing fatigue before race.';
    } else {
      // Ensure long run has vertical gain if not already set
      if (!longRunTemplate.verticalRange) {
        longRunTemplate.verticalRange = [300, 600]; // Standard long run vertical
      }
    }

    // CRITICAL: Only add ONE long run per week (Saturday)
    workouts.push({ ...longRunTemplate, id: 'saturday_long' });
  }

  // 2. Key workouts based on phase
  if (phase === 'base') {
    // Hill sprints + easy with strides
    let hillSprintsResults = queryWorkouts({
      type: 'hill_sprints',
      phase: 'base',
      category: athlete.category,
    });

    if (hillSprintsResults.length === 0) {
      hillSprintsResults = queryWorkouts({ type: 'hill_sprints' });
    }

    if (hillSprintsResults[0]) {
      workouts.push({ ...hillSprintsResults[0].template, id: 'tuesday_hills' });
    }

    const stridesEntry = getWorkoutById('easy_with_strides');
    if (stridesEntry) {
      workouts.push({ ...stridesEntry.template, id: 'thursday_strides' });
    }
  } else if (phase === 'intensity') {
    // VO2 intervals + tempo
    let vo2Results = queryWorkouts({
      type: 'vo2',
      phase: 'intensity',
      category: athlete.category,
    });

    if (vo2Results.length === 0) {
      vo2Results = queryWorkouts({ type: 'vo2' });
    }

    if (vo2Results[0] && !isRecoveryWeek) {
      workouts.push({ ...vo2Results[0].template, id: 'tuesday_vo2' });
    }

    let tempoResults = queryWorkouts({
      type: 'tempo',
      phase: 'intensity',
      category: athlete.category,
    });

    if (tempoResults.length === 0) {
      tempoResults = queryWorkouts({ type: 'tempo' });
    }

    if (tempoResults[0] && !isRecoveryWeek) {
      workouts.push({ ...tempoResults[0].template, id: 'thursday_tempo' });
    }
  } else if (phase === 'specificity') {
    // Race-specific work
    let hillRepeatsResults = queryWorkouts({
      type: 'hill_repeats',
      phase: 'specificity',
      raceType: race.raceType,
    });

    if (hillRepeatsResults.length === 0) {
      hillRepeatsResults = queryWorkouts({ type: 'hill_repeats' });
    }

    if (hillRepeatsResults[0]) {
      workouts.push({ ...hillRepeatsResults[0].template, id: 'tuesday_hills' });
    }
  } else if (phase === 'taper') {
    // Taper: light sharpening workouts to maintain speed
    // Tuesday: Short strides or short tempo
    const stridesEntry = getWorkoutById('easy_with_strides');
    if (stridesEntry) {
      const taperStrides = { ...stridesEntry.template };
      taperStrides.durationRange = [30, 45];
      taperStrides.distanceRange = [5, 7];
      taperStrides.verticalRange = [50, 100]; // Minimal vertical
      taperStrides.title = 'Taper Sharpener';
      taperStrides.description = 'Short easy run with 6-8 strides to maintain leg speed.';
      workouts.push({ ...taperStrides, id: 'tuesday_sharpener' });
    }
  }

  // 3. Add ME Session (Wednesday ONLY - not Monday)
  // CRITICAL: ME sessions require 72-96 hours recovery between identical sessions
  // Hill ME targets frontier muscle fibers and should occur ONCE per week max
  // Wednesday is optimal: allows recovery from Tuesday's key workout + rest before Saturday long run
  const meWorkout: Workout = {
    type: 'muscular_endurance',
    title: 'ME Training',
    description: 'Muscular Endurance (ME) session. Focus on terrain-specific strength work.',
    distanceKm: 0,
    durationMin: 45,
    verticalGain: 0,
    intensityZones: [],
  };
  workouts.push({ ...meWorkout, id: 'me_wednesday' });

  // 4. Add Core Training Sessions (separate from ME)
  // Core = lighter stability work (anti-rotation, anti-extension, planks, carries)
  // Frequency varies by phase:
  // - Transition: 3x/week (20min each)
  // - Base: 2x/week (25min each)
  // - Intensity: 2x/week (15min each)
  // - Taper: 1x/week (10min activation)
  const coreFrequencyByPhase: Record<TrainingPhase, number> = {
    transition: 3,
    base: 2,
    intensity: 2,
    specificity: 2,
    taper: 1,
    goal: 0, // Race week - no core
  };

  const coreDurationByPhase: Record<TrainingPhase, number> = {
    transition: 20,
    base: 25,
    intensity: 15,
    specificity: 15,
    taper: 10,
    goal: 0,
  };

  const coreSessionsNeeded = isRecoveryWeek ? 1 : (coreFrequencyByPhase[phase] || 2);
  const coreDuration = coreDurationByPhase[phase] || 20;

  for (let i = 0; i < coreSessionsNeeded; i++) {
    const coreWorkout: Workout = {
      type: 'strength', // Use 'strength' type for core sessions
      title: 'Core Training',
      description: 'Anti-rotation, anti-extension, and stability exercises. Focus on control and quality.',
      distanceKm: 0,
      durationMin: coreDuration,
      verticalGain: 0,
      intensityZones: [],
    };
    workouts.push({ ...coreWorkout, id: `core_${i + 1}` });
  }

  // 5. Calculate how many training days we need (rest days handled by distribution)
  const daysPerWeek = constraints?.daysPerWeek || 6;
  const trainingDaysNeeded = daysPerWeek; // Total training days needed

  // 6. Fill with easy runs to reach target training days (use variety)
  const remainingDays = trainingDaysNeeded - workouts.length;

  // Get different easy workout types for variety
  const easyWorkouts = [
    getWorkoutById('easy_short'),      // Recovery run
    getWorkoutById('easy_medium'),     // Standard easy
    getWorkoutById('easy_with_strides') // Easy with strides (if not already added)
  ].filter((w): w is WorkoutLibraryEntry => w !== undefined);

  for (let i = 0; i < remainingDays; i++) {
    // Rotate through different easy workouts for variety
    const easyEntry = easyWorkouts[i % easyWorkouts.length];
    if (easyEntry) {
      // Adjust distance based on day in week and taper phase
      const template = { ...easyEntry.template };

      // Vary distances: shorter for taper, longer for base/intensity
      if (phase === 'taper') {
        // Taper: all easy runs should be shorter
        template.durationRange = [30, 50];
        template.distanceRange = [5, 8];
        template.verticalRange = [50, 100]; // Light vertical
      } else if (i === 0 || i === 2) {
        // Mid-week recovery: shorter
        template.durationRange = [40, 60];
        template.distanceRange = [6, 10];
        template.verticalRange = [80, 150]; // Moderate vertical
      } else {
        // Mid-week steady: medium
        template.durationRange = [50, 75];
        template.distanceRange = [8, 12];
        template.verticalRange = [120, 200]; // Good vertical
      }

      workouts.push({ ...template, id: `easy_${i}` });
    }
  }

  // 7. DO NOT add explicit rest workouts - distribution will handle rest days
  // Rest days are determined by distribution based on daysPerWeek constraint

  console.log('[MicrocycleGenerator] Total workouts selected:', workouts.length, workouts.map(w => w.id || w.type));

  return workouts;
}

//
// ─────────────────────────────────────────────────────────────
//   DAILY DISTRIBUTION
// ─────────────────────────────────────────────────────────────
//

function distributeWorkouts(
  workouts: Workout[],
  weekStartDate: string,
  athlete: AthleteProfile,
  race: RaceEvent,
  daysToRace?: number,
  constraints?: TrainingConstraints
): DailyPlan[] {
  const days: DailyPlan[] = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  console.log('[DistributeWorkouts] Starting distribution with workouts:', workouts.map(w => ({
    id: w.id,
    type: w.type,
    title: w.title
  })));

  /**
   * CRITICAL RULE: Rest days are hard constraints based on daysPerWeek.
   * Calculate which days should be rest days:
   * - Use constraints.restDays as the primary source
   * - If more rest days needed, add Monday/Friday as standard rest days
   */
  const daysPerWeek = constraints?.daysPerWeek || 6;
  const restDaysNeeded = 7 - daysPerWeek;

  // Start with explicitly blocked days from constraints
  const restDays = new Set(constraints?.restDays ?? []);

  // If we need more rest days beyond what's explicitly blocked, add standard rest days
  const standardRestDays = ['Mon', 'Fri', 'Wed', 'Thu', 'Tue'];
  let addedRestDays = 0;
  for (const day of standardRestDays) {
    if (restDays.size >= restDaysNeeded) break;
    if (!restDays.has(day as any)) {
      restDays.add(day as any);
      addedRestDays++;
    }
  }

  console.log('[DistributeWorkouts] Rest days configuration:', {
    daysPerWeek,
    restDaysNeeded,
    explicitRestDays: constraints?.restDays || [],
    finalRestDays: Array.from(restDays),
    addedRestDays
  });

  // Distribution pattern (hard/easy principle) - NO rest entries
  // CRITICAL ME SCHEDULING RULE: Only Wednesday gets ME
  // Core training sessions (lighter work) distributed on easy days
  // Monday = Easy run + optional Core (post-rest, good for stability work)
  // Wednesday = Easy run + ME session (multi-session day)
  // Thursday/Friday = Easy run + optional Core (recovery days)
  const pattern: { [key: string]: string } = {
    Mon: 'easy_run|core_1', // Easy recovery run FIRST, then core
    Tue: 'tuesday_vo2|tuesday_hills|tuesday_sharpener', // Key workout (intervals/hills)
    Wed: 'easy_run|me_wednesday', // Easy run + ME training (multi-session)
    Thu: 'thursday_tempo|thursday_strides|easy_run|core_2', // Moderate effort or core
    Fri: 'easy_run|core_3', // Easy run or core (prep for long run)
    Sat: 'saturday_long', // Long run (key workout)
    Sun: 'easy_run', // Recovery run (no core - pre-Monday rest)
  };

  // CRITICAL: Use local dates to avoid timezone shifts
  const startDate = new Date(weekStartDate + 'T00:00:00');

  // Helper function to get YYYY-MM-DD in local timezone
  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // CRITICAL: Calculate race date if this is race week
  let raceDateStr: string | null = null;
  if (race?.date && daysToRace !== undefined && daysToRace <= 7) {
    // Normalize race date format (YYYY-MM-DD) - already in correct format
    raceDateStr = race.date;
    console.log('🏁 [DistributeWorkouts] Race week detected! Race date:', raceDateStr);
    console.log('🏁 [DistributeWorkouts] Week starts:', toLocalDateString(startDate));
  }

  for (let i = 0; i < 7; i++) {
    const dayName = dayNames[i];
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = toLocalDateString(date); // Use local date string

    console.log(`[DistributeWorkouts] Day ${i} (${dayName}): ${dateStr} | Race: ${raceDateStr} | Match: ${dateStr === raceDateStr}`);

    // CRITICAL: If this day is race day, insert the race instead of normal workout
    if (raceDateStr && dateStr === raceDateStr) {
      console.log('🏁 [DistributeWorkouts] ✅ RACE INSERTED on', dayName, dateStr);

      // Use expected time if provided, otherwise calculate
      let durationMin: number;
      if (race.expectedTimeMin) {
        durationMin = Math.round(race.expectedTimeMin);
        console.log(`🏁 Using expected time: ${durationMin} min (${Math.floor(durationMin/60)}:${String(Math.floor(durationMin%60)).padStart(2,'0')})`);
      } else {
        // Conservative estimate: base pace + elevation penalty
        const basePaceMinKm = 6.0; // Conservative 6:00 min/km
        const elevationPenaltyMin = (race.verticalGain || 0) / 100 * 10; // 10 min per 100m
        durationMin = Math.round(race.distanceKm * basePaceMinKm + elevationPenaltyMin);
        console.log(`🏁 Calculated duration: ${durationMin} min`);
      }

      const raceWorkout: Workout = {
        type: 'simulation', // Use simulation type for race day
        title: `🏁 ${race.name}`,
        description: `Race day! ${race.distanceKm}km with ${race.verticalGain || 0}m elevation gain.`,
        distanceKm: race.distanceKm,
        durationMin,
        verticalGain: race.verticalGain || 0,
        intensityZones: ['Z4', 'Z5'], // Race effort
        origin: 'BASE_PLAN',  // Race is part of base plan
        locked: false,
        lockReason: undefined
      };

      days.push({
        day: dayName,
        date: dateStr,
        sessions: [raceWorkout],
      });

      // Mark race day index to handle post-race recovery
      const raceDayIndex = i;

      // CRITICAL: For A category races, remaining days in race week should be REST
      // Insert rest days for all remaining days after the race
      if (race.priority === 'A' || race.priority === 'a') {
        console.log('🏁 [DistributeWorkouts] A category race detected - inserting REST days post-race');
        for (let j = raceDayIndex + 1; j < 7; j++) {
          const restDayName = dayNames[j];
          const restDate = new Date(startDate);
          restDate.setDate(restDate.getDate() + j);
          const restDateStr = toLocalDateString(restDate);

          days.push({
            day: restDayName,
            date: restDateStr,
            sessions: [],  // Empty array for post-race rest days
          });
        }
        // All remaining days added, break the loop
        break;
      } else {
        // For B/C races, continue with normal workout distribution
        continue;
      }
    }

    // CRITICAL: Check if this day is a rest day (hard constraint)
    const isRestDay = restDays.has(dayName as any);

    if (isRestDay) {
      // Rest days have empty sessions array
      days.push({
        day: dayName,
        date: dateStr,
        sessions: [],  // Empty array for rest days
      });
    } else {
      // Find matching workouts for this day (can be multiple for multi-session days)
      const expectedIds = pattern[dayName]?.split('|') || [];
      const sessions: Workout[] = [];
      const usedWorkoutIds = new Set(days.flatMap(d => d.sessions.map(s => s.id)));

      // CRITICAL: Check pattern requirements
      const needsEasyRun = expectedIds.includes('easy_run');
      const needsCore = expectedIds.some(id => id.startsWith('core_'));
      const needsME = expectedIds.includes('me_wednesday');

      // Step 1: Find specific key workout (Tuesday/Thursday/Saturday specials)
      let keyWorkout = workouts.find(w =>
        expectedIds.some(id => w.id?.includes(id)) &&
        !w.id?.startsWith('easy_') &&
        !w.id?.startsWith('core_') &&
        w.id !== 'me_wednesday' && // ME handled separately
        !usedWorkoutIds.has(w.id)
      );

      console.log(`[DistributeWorkouts] ${dayName} - expectedIds: ${expectedIds.join(', ')} | keyWorkout: ${keyWorkout?.id || 'none'}`);

      // Step 2: Find easy run if needed
      let easyRun: Workout | undefined;
      if (needsEasyRun) {
        // Try to find an unused easy workout
        easyRun = workouts.find(w =>
          w.id?.startsWith('easy_') &&
          !usedWorkoutIds.has(w.id)
        );

        // If not found, create one
        if (!easyRun) {
          easyRun = {
            type: 'easy',
            title: 'Easy Run',
            description: 'Easy recovery run',
            distanceKm: dayName === 'Mon' || dayName === 'Sun' ? 6 : 8,
            durationMin: dayName === 'Mon' || dayName === 'Sun' ? 36 : 48,
            verticalGain: 100,
            intensityZones: ['Z2'],
            id: `easy_${dayName.toLowerCase()}`,
            origin: 'BASE_PLAN',
            locked: false,
            lockReason: undefined
          };
        }
      }

      // Step 3: Find core workout if needed
      let coreWorkout: Workout | undefined;
      if (needsCore) {
        coreWorkout = workouts.find(w =>
          expectedIds.some(id => id.startsWith('core_') && w.id?.includes(id)) &&
          !usedWorkoutIds.has(w.id)
        );
      }

      // Step 4: Find ME workout if needed
      let meWorkout: Workout | undefined;
      if (needsME) {
        meWorkout = workouts.find(w => w.id === 'me_wednesday' && !usedWorkoutIds.has(w.id));
      }

      // Step 5: Assemble sessions for the day (order matters)
      // CRITICAL FIX: Multi-session days need BOTH easy run AND other sessions
      // Use separate conditionals, not else-if

      console.log(`[DistributeWorkouts] ${dayName} - Assembly phase:`, {
        hasKeyWorkout: !!keyWorkout,
        needsEasyRun,
        hasEasyRun: !!easyRun,
        needsCore,
        hasCoreWorkout: !!coreWorkout,
        needsME,
        hasMEWorkout: !!meWorkout
      });

      // Add key workout if available (Tue, Thu, Sat)
      if (keyWorkout) {
        console.log(`[DistributeWorkouts] ${dayName} - Adding key workout: ${keyWorkout.id}`);
        sessions.push({
          ...keyWorkout,
          origin: 'BASE_PLAN',
          locked: false,
          lockReason: undefined
        });
      }

      // Add easy run if needed (Mon, Wed, Fri, Sun) - INDEPENDENT of key workout
      if (needsEasyRun && easyRun) {
        console.log(`[DistributeWorkouts] ${dayName} - Adding easy run: ${easyRun.id}`);
        sessions.push({
          ...easyRun,
          origin: 'BASE_PLAN',
          locked: false,
          lockReason: undefined
        });
      }

      // Add ME session if Wednesday
      if (meWorkout) {
        console.log(`[DistributeWorkouts] ${dayName} - Adding ME workout: ${meWorkout.id}`);
        sessions.push({
          ...meWorkout,
          origin: 'BASE_PLAN',
          locked: false,
          lockReason: undefined
        });
      }

      // Add core session if day supports it
      if (coreWorkout) {
        console.log(`[DistributeWorkouts] ${dayName} - Adding core workout: ${coreWorkout.id}`);
        sessions.push({
          ...coreWorkout,
          origin: 'BASE_PLAN',
          locked: false,
          lockReason: undefined
        });
      }

      if (sessions.length === 0) {
        // Default to rest (only on non-constrained days)
        console.warn(`[Microcycle] No workout found for ${dayName}`, {
          expectedIds,
          availableWorkouts: workouts.map(w => ({ id: w.id, type: w.type, title: w.title })),
          pattern: pattern[dayName]
        });
      }

      console.log(`[DistributeWorkouts] ${dayName} - final sessions: ${sessions.map(s => `${s.id}(${s.type})`).join(', ')}`);

      days.push({
        day: dayName,
        date: dateStr,
        sessions,
      });
    }
  }

  // CRITICAL VALIDATION: Verify rest days were respected and training days match constraints
  const restDaysCreated = days.filter(d => d.sessions.length === 0).map(d => d.day);
  const trainingDaysCreated = days.filter(d => d.sessions.length > 0).map(d => d.day);

  console.log('[DistributeWorkouts] Validation:', {
    expectedRestDays: Array.from(restDays),
    actualRestDays: restDaysCreated,
    trainingDaysCount: trainingDaysCreated.length,
    expectedTrainingDays: constraints?.daysPerWeek || 'not specified'
  });

  if (constraints && trainingDaysCreated.length !== constraints.daysPerWeek) {
    console.warn('[DistributeWorkouts] Training day count mismatch!', {
      expected: constraints.daysPerWeek,
      actual: trainingDaysCreated.length,
      trainingDays: trainingDaysCreated,
      finalRestDays: Array.from(restDays)
    });
  }

  return days;
}

//
// ─────────────────────────────────────────────────────────────
//   RECOVERY WEEK DETECTION
// ─────────────────────────────────────────────────────────────
//

/**
 * Determine if this should be a recovery week based on ratio
 */
export function isRecoveryWeek(
  weekNumber: number,
  phase: TrainingPhase,
  recoveryRatio: '2:1' | '3:1'
): boolean {
  // No recovery weeks in transition or taper
  if (phase === 'transition' || phase === 'taper' || phase === 'goal') {
    return false;
  }

  const ratio = recoveryRatio === '2:1' ? 3 : 4;
  return weekNumber % ratio === 0;
}

//
// ─────────────────────────────────────────────────────────────
//   PERSONALIZATION
// ─────────────────────────────────────────────────────────────
//

/**
 * Personalize workout distances/durations based on athlete fitness
 */
export function personalizeWorkout(
  workout: Workout,
  athlete: AthleteProfile,
  weekMileage: number
): Workout {
  const personalized = { ...workout };

  // Adjust ranges based on athlete
  if (workout.durationRange) {
    const [min, max] = workout.durationRange;
    if (athlete.category === 'Cat1') {
      personalized.durationMin = Math.round((min + max) / 2 * 0.85); // 15% lower
    } else {
      personalized.durationMin = Math.round((min + max) / 2 * 1.05); // 5% higher
    }
  }

  if (workout.distanceRange) {
    const [min, max] = workout.distanceRange;
    const avg = (min + max) / 2;
    personalized.distanceKm = Math.round(avg);
  }

  // Apply terrain-specific adaptations based on athlete's surface preference
  if (athlete.surfacePreference) {
    const { adaptWorkoutToSurface } = require('./workout-library');
    return adaptWorkoutToSurface(personalized, athlete.surfacePreference);
  }

  return personalized;
}

//
// ─────────────────────────────────────────────────────────────
//   ME SCHEDULING VALIDATION
// ─────────────────────────────────────────────────────────────
//

/**
 * Validate that ME/Strength sessions are properly spaced in weekly plan
 * Enforces minimum 72-hour recovery between identical ME sessions
 */
export function validateMEScheduling(weeklyPlan: WeeklyPlan): {
  isValid: boolean;
  conflicts: string[];
  warnings: string[];
} {
  const conflicts: string[] = [];
  const warnings: string[] = [];

  const meSessionDays: { day: string; dayIndex: number; type: string }[] = [];

  // Collect all ME/Strength sessions
  weeklyPlan.days.forEach((day, index) => {
    const meSession = day.sessions.find(
      s => s.type === 'strength' || s.type === 'muscular_endurance'
    );
    if (meSession) {
      meSessionDays.push({
        day: day.day,
        dayIndex: index,
        type: meSession.title || meSession.type || 'ME',
      });
    }
  });

  // Check for conflicts
  if (meSessionDays.length > 2) {
    warnings.push(`More than 2 ME sessions per week detected (${meSessionDays.length}). Risk of overtraining.`);
  }

  // Check spacing between ME sessions
  for (let i = 0; i < meSessionDays.length - 1; i++) {
    const current = meSessionDays[i];
    const next = meSessionDays[i + 1];
    const daysBetween = next.dayIndex - current.dayIndex;

    if (daysBetween < 3) {
      conflicts.push(
        `ME sessions on ${current.day} and ${next.day} are only ${daysBetween} days apart. ` +
        `Minimum 72 hours (3 days) required between identical ME sessions.`
      );
    }
  }

  // Specific check for Monday-Wednesday conflict (most common error)
  const mondayME = meSessionDays.find(s => s.day === 'Mon');
  const wednesdayME = meSessionDays.find(s => s.day === 'Wed');

  if (mondayME && wednesdayME) {
    conflicts.push(
      'CRITICAL: Hill ME scheduled on both Monday and Wednesday. ' +
      'This violates recovery principles. ME should occur ONCE per week on Wednesday only.'
    );
  }

  return {
    isValid: conflicts.length === 0,
    conflicts,
    warnings,
  };
}
