/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — WORKOUT LIBRARY
 *  Module 4 — Comprehensive Workout Database
 * ======================================================================
 *
 * This module contains the complete library of workout templates for
 * ultra training across all phases, categories, and race types.
 *
 * Workouts are organized by type and tagged with:
 * - Applicable training phases
 * - Athlete categories (Cat1/Cat2)
 * - Race types they support
 * - Prerequisites and variations
 */

import type {
  WorkoutType,
  Workout,
  WorkoutLibraryEntry,
  TrainingPhase,
  AthleteCategory,
  RaceType
} from './types';

//
// ─────────────────────────────────────────────────────────────
//   WORKOUT LIBRARY DATABASE
// ─────────────────────────────────────────────────────────────
//

export const WORKOUT_LIBRARY: WorkoutLibraryEntry[] = [
  // ============================================================
  // EASY & AEROBIC RUNS (Base Building)
  // ============================================================
  {
    id: 'easy_short',
    type: 'easy',
    phase: ['transition', 'base', 'intensity', 'specificity', 'taper'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M', '200M', 'Marathon', 'HalfMarathon', 'Skimo', 'Custom'],
    template: {
      type: 'easy',
      title: 'Easy Recovery Run',
      durationRange: [30, 45],
      intensityZones: ['Z1', 'Z2'],
      description: 'Short easy pace run for recovery or light training stimulus.',
      purpose: 'Active recovery and aerobic maintenance',
      isHard: false,
      crossTrainAlternative: '45 min easy bike or swim',
    },
  },
  {
    id: 'easy_medium',
    type: 'easy',
    phase: ['base', 'intensity', 'specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M', '200M', 'Marathon', 'Custom'],
    template: {
      type: 'easy',
      title: 'Easy Aerobic Run',
      durationRange: [45, 75],
      intensityZones: ['Z1', 'Z2'],
      description: 'Moderate-length easy run for aerobic development.',
      purpose: 'Build aerobic capacity and fat oxidation',
      isHard: false,
      crossTrainAlternative: '60-90 min easy cross-training',
    },
  },
  {
    id: 'easy_with_strides',
    type: 'easy',
    phase: ['base', 'intensity', 'specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M', 'Marathon', 'HalfMarathon', 'Custom'],
    template: {
      type: 'easy',
      title: 'Easy Run + Strides',
      durationRange: [45, 60],
      intensityZones: ['Z1', 'Z2'],
      structure: {
        warmup: 10,
        intervals: [{
          work: 0.33, // 20 seconds ~= 0.33 min
          rest: 2,
          reps: 6,
          intensity: 'Fast but relaxed (form focus)',
        }],
      },
      description: 'Easy run finishing with 6-8 strides for neuromuscular activation.',
      purpose: 'Maintain leg speed and running economy during base training',
      isHard: false,
    },
  },

  // ============================================================
  // HILL SPRINTS & POWER DEVELOPMENT
  // ============================================================
  {
    id: 'hill_sprints_short',
    type: 'hill_sprints',
    phase: ['base', 'intensity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M', '200M', 'Skimo', 'Custom'],
    template: {
      type: 'hill_sprints',
      title: 'Short Hill Sprints',
      durationRange: [30, 40],
      intensityZones: ['Z4', 'Z5'],
      structure: {
        warmup: 15,
        intervals: [{
          work: 0.33, // 20 seconds
          rest: 3,
          reps: 8,
          intensity: 'Maximum power (not speed)',
        }],
        cooldown: 10,
      },
      description: '8x20" uphill sprints at maximum power. Focus on powerful leg drive, not speed.',
      purpose: 'Build power and running economy without high-impact stress',
      isHard: false, // Minimal fatigue despite high intensity
    },
  },
  {
    id: 'hill_sprints_long',
    type: 'hill_sprints',
    phase: ['base', 'intensity'],
    category: ['Cat2'],
    raceTypes: ['50K', '100K', '100M', 'Skimo'],
    template: {
      type: 'hill_sprints',
      title: 'Extended Hill Sprints',
      durationMin: 45,
      intensityZones: ['Z4', 'Z5'],
      structure: {
        warmup: 15,
        intervals: [{
          work: 0.5, // 30 seconds
          rest: 3,
          reps: 10,
          intensity: 'Powerful uphill drive',
        }],
        cooldown: 10,
      },
      description: '10x30" hill sprints with full recovery between reps.',
      purpose: 'Advanced power development for mountain ultras',
      isHard: false,
    },
    prerequisites: {
      minWeeklyMileage: 40,
    },
  },

  // ============================================================
  // LONG RUNS (Primary endurance builder)
  // ============================================================
  {
    id: 'long_run_easy',
    type: 'long',
    phase: ['base', 'intensity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M', 'Marathon', 'HalfMarathon'],
    template: {
      type: 'long',
      title: 'Long Run - Easy Effort',
      durationRange: [90, 180],
      distanceRange: [15, 30],
      intensityZones: ['Z1', 'Z2'],
      description: 'Long steady run entirely at easy aerobic pace.',
      purpose: 'Build aerobic endurance and time-on-feet',
      isKeyWorkout: true,
      notes: 'Practice fueling every 30-40 minutes',
    },
  },
  {
    id: 'long_run_progression',
    type: 'long',
    phase: ['intensity', 'specificity'],
    category: ['Cat2'],
    raceTypes: ['50K', '50M', '100K', 'Marathon'],
    template: {
      type: 'long',
      title: 'Progressive Long Run',
      durationRange: [120, 180],
      intensityZones: ['Z2', 'Z3'],
      description: 'Long run starting easy, finishing with last 30-40 min at moderate-hard effort.',
      purpose: 'Train lactate clearing and sustained effort on fatigued legs',
      isKeyWorkout: true,
      isHard: true,
    },
    prerequisites: {
      minWeeklyMileage: 50,
      fitnessLevel: 'medium',
    },
  },
  {
    id: 'long_run_mountain',
    type: 'long',
    phase: ['specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['100K', '100M', '200M'],
    template: {
      type: 'long',
      title: 'Mountain Long Run',
      durationRange: [180, 360],
      verticalRange: [800, 2500],
      intensityZones: ['Z1', 'Z2', 'Z3'],
      description: 'Long trail run with significant vertical gain. Include hiking on steep climbs.',
      purpose: 'Build climbing endurance and specificity for mountain ultras',
      isKeyWorkout: true,
      notes: 'Power hike steep sections. Practice using poles if race allows.',
    },
  },

  // ============================================================
  // BACK-TO-BACK LONG RUNS (Weekend blocks)
  // ============================================================
  {
    id: 'back_to_back_moderate',
    type: 'backToBack',
    phase: ['specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M'],
    template: {
      type: 'backToBack',
      title: 'Back-to-Back Weekend (Sat+Sun)',
      description: 'Saturday: 3-4 hour long run. Sunday: 2-3 hour easy run on tired legs.',
      purpose: 'Train running on fatigue to simulate race conditions',
      isKeyWorkout: true,
      notes: 'Sunday run should feel harder due to Saturday fatigue - this is expected',
    },
  },
  {
    id: 'back_to_back_big',
    type: 'backToBack',
    phase: ['specificity'],
    category: ['Cat2'],
    raceTypes: ['100M', '200M'],
    template: {
      type: 'backToBack',
      title: 'Peak Weekend Block',
      description: 'Saturday: 5-8 hour run/hike with vert. Sunday: 3-5 hour moderate run.',
      purpose: 'Simulate multi-day ultra fatigue',
      isKeyWorkout: true,
      isHard: true,
      notes: 'This is the biggest training stimulus of the cycle. Take Monday off.',
    },
    prerequisites: {
      minWeeklyMileage: 80,
      minTrainingAge: 16,
    },
  },

  // ============================================================
  // TEMPO & THRESHOLD RUNS
  // ============================================================
  {
    id: 'tempo_short',
    type: 'tempo',
    phase: ['intensity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', 'Marathon', 'HalfMarathon'],
    template: {
      type: 'tempo',
      title: 'Tempo Run - 20 minutes',
      durationMin: 40,
      intensityZones: ['Z3'],
      structure: {
        warmup: 10,
        intervals: [{
          work: 20,
          rest: 0,
          reps: 1,
          intensity: 'Comfortably hard (marathon effort)',
        }],
        cooldown: 10,
      },
      description: '20 minutes at tempo pace (comfortably hard, conversational with effort).',
      purpose: 'Improve lactate threshold and aerobic efficiency',
      isHard: true,
      isKeyWorkout: true,
    },
  },
  {
    id: 'tempo_long',
    type: 'tempo',
    phase: ['intensity', 'specificity'],
    category: ['Cat2'],
    raceTypes: ['50K', 'Marathon'],
    template: {
      type: 'tempo',
      title: 'Extended Tempo',
      durationMin: 60,
      intensityZones: ['Z3'],
      structure: {
        warmup: 15,
        intervals: [{
          work: 30,
          rest: 0,
          reps: 1,
          intensity: 'Steady hard effort',
        }],
        cooldown: 15,
      },
      description: '30 minutes continuous at threshold effort.',
      purpose: 'Advanced lactate threshold training',
      isHard: true,
      isKeyWorkout: true,
    },
    prerequisites: {
      minWeeklyMileage: 60,
    },
  },

  // ============================================================
  // VO2MAX INTERVALS
  // ============================================================
  {
    id: 'vo2_3min',
    type: 'vo2',
    phase: ['intensity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', 'Marathon', 'HalfMarathon'],
    template: {
      type: 'vo2',
      title: 'VO2max Intervals - 3 minute',
      durationMin: 50,
      intensityZones: ['Z4', 'Z5'],
      structure: {
        warmup: 15,
        intervals: [{
          work: 3,
          rest: 3,
          reps: 6,
          intensity: '5K race effort',
        }],
        cooldown: 10,
      },
      description: '6x3min @ VO2max with 3min jog recovery.',
      purpose: 'Boost maximal aerobic power',
      isHard: true,
      isKeyWorkout: true,
    },
  },
  {
    id: 'billat_30_30',
    type: 'vo2',
    phase: ['intensity'],
    category: ['Cat2'],
    raceTypes: ['50K', 'Marathon'],
    template: {
      type: 'vo2',
      title: 'Billat 30/30s',
      durationMin: 45,
      intensityZones: ['Z5'],
      structure: {
        warmup: 15,
        intervals: [{
          work: 0.5,
          rest: 0.5,
          reps: 20,
          intensity: 'Fast (vVO2max)',
        }],
        cooldown: 10,
      },
      description: '20x 30s fast / 30s slow jog. Classic VO2max developer.',
      purpose: 'Efficient VO2max stimulus with manageable fatigue',
      isHard: true,
      isKeyWorkout: true,
    },
  },

  // ============================================================
  // HILL REPEATS (Longer intervals)
  // ============================================================
  {
    id: 'hill_repeats_medium',
    type: 'hill_repeats',
    phase: ['intensity', 'specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '100K', '100M', 'Skimo'],
    template: {
      type: 'hill_repeats',
      title: 'Hill Repeats - 3 minutes',
      durationMin: 60,
      intensityZones: ['Z4'],
      structure: {
        warmup: 15,
        intervals: [{
          work: 3,
          rest: 3,
          reps: 6,
          intensity: 'Hard uphill effort',
        }],
        cooldown: 10,
      },
      description: '6x3min uphill repeats at threshold-VO2 effort. Jog down for recovery.',
      purpose: 'Build climbing power and leg strength',
      isHard: true,
      isKeyWorkout: true,
    },
  },

  // ============================================================
  // MUSCULAR ENDURANCE (ME) SESSIONS
  // ============================================================
  {
    id: 'me_weighted_hike',
    type: 'muscular_endurance',
    phase: ['base', 'intensity', 'specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['100K', '100M', '200M', 'Skimo'],
    template: {
      type: 'muscular_endurance',
      title: 'Weighted Uphill Hike',
      durationRange: [45, 90],
      verticalRange: [300, 800],
      intensityZones: ['Z2', 'Z3'],
      description: 'Steep uphill hike carrying 10-15 lbs in vest or pack. Continuous uphill effort.',
      purpose: 'Build quad and glute endurance for mountain climbing',
      isHard: true,
      notes: 'Can substitute stair climber or treadmill at 15% grade if no hills available',
    },
  },
  {
    id: 'me_treadhill_double',
    type: 'muscular_endurance',
    phase: ['base', 'intensity', 'specificity'],
    category: ['Cat2'],
    raceTypes: ['100M', 'Skimo'],
    template: {
      type: 'muscular_endurance',
      title: 'Treadhill Double Session',
      durationMin: 30,
      verticalGain: 500,
      intensityZones: ['Z2', 'Z3'],
      description: 'Second workout of day: 30 min uphill treadmill hike at 12-15% grade.',
      purpose: 'Boost vertical capacity without additional impact',
      isHard: false,
      notes: 'Optional add-on session for building vert tolerance',
    },
    prerequisites: {
      minWeeklyMileage: 60,
    },
  },

  // ============================================================
  // STRENGTH WORKOUTS
  // ============================================================
  {
    id: 'strength_ultra_legs',
    type: 'strength',
    phase: ['base', 'intensity', 'specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M', '200M'],
    template: {
      type: 'strength',
      title: 'Ultra Legs Circuit',
      durationMin: 30,
      description: 'Bodyweight & light weight circuit: squats, lunges, step-ups, single-leg deadlifts, calf raises, core.',
      purpose: 'Build general strength and injury resilience',
      isHard: false,
      notes: 'Perform 2x per week during base/intensity phases',
    },
  },
  {
    id: 'strength_mountain_legs',
    type: 'strength',
    phase: ['intensity', 'specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['100K', '100M', 'Skimo'],
    template: {
      type: 'strength',
      title: 'Mountain Legs',
      durationMin: 40,
      description: 'Heavy leg strength: weighted step-ups, Bulgarian split squats, box jumps, weighted carries.',
      purpose: 'Build power for climbing and descending',
      isHard: true,
      notes: 'Last heavy session should be 2-3 weeks before race',
    },
  },

  // ============================================================
  // CROSS-TRAINING
  // ============================================================
  {
    id: 'cross_train_easy',
    type: 'cross_train',
    phase: ['transition', 'base', 'intensity', 'specificity', 'taper'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M', '200M', 'Marathon', 'Custom'],
    template: {
      type: 'cross_train',
      title: 'Easy Cross-Training',
      durationRange: [45, 90],
      intensityZones: ['Z1', 'Z2'],
      description: 'Bike, swim, elliptical, or row at easy aerobic effort.',
      purpose: 'Build aerobic base without running impact',
      isHard: false,
      notes: 'Good substitute for easy runs when legs need rest',
    },
  },

  // ============================================================
  // HIKING & BACKPACKING
  // ============================================================
  {
    id: 'hike_long',
    type: 'hike',
    phase: ['specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['100M', '200M'],
    template: {
      type: 'hike',
      title: 'Long Mountain Hike',
      durationRange: [240, 480],
      verticalRange: [1000, 3000],
      intensityZones: ['Z1', 'Z2'],
      description: 'Multi-hour mountain hike with significant elevation. Practice power hiking and pole use.',
      purpose: 'Build hiking-specific fitness for 100M/200M races',
      isKeyWorkout: true,
      notes: 'Can substitute a long run. Valuable for time-on-feet without run impact.',
    },
  },

  // ============================================================
  // SKIMO WORKOUTS
  // ============================================================
  {
    id: 'skimo_uphill_intervals',
    type: 'skimo',
    phase: ['intensity', 'specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['Skimo'],
    template: {
      type: 'skimo',
      title: 'Skimo Uphill Intervals',
      durationMin: 60,
      verticalGain: 800,
      intensityZones: ['Z4'],
      description: 'Skin uphill intervals at threshold+ effort with transitions and ski downs.',
      purpose: 'Build skimo-specific climbing power',
      isHard: true,
      isKeyWorkout: true,
    },
  },

  // ============================================================
  // REST & RECOVERY
  // ============================================================
  {
    id: 'rest',
    type: 'rest',
    phase: ['transition', 'base', 'intensity', 'specificity', 'taper', 'goal'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M', '200M', 'Marathon', 'HalfMarathon', 'Skimo', 'StageRace', 'Custom'],
    template: {
      type: 'rest',
      title: 'Complete Rest',
      description: 'Full day off from training. Focus on sleep, nutrition, and recovery.',
      purpose: 'Allow body to adapt to training stress',
      isHard: false,
    },
  },
  {
    id: 'shakeout',
    type: 'shakeout',
    phase: ['taper'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M', 'Marathon', 'HalfMarathon'],
    template: {
      type: 'shakeout',
      title: 'Pre-Race Shakeout',
      durationMin: 20,
      intensityZones: ['Z1', 'Z2'],
      structure: {
        intervals: [{
          work: 0.33,
          rest: 2,
          reps: 4,
          intensity: 'Fast but relaxed',
        }],
      },
      description: 'Short easy jog with 4 strides to stay loose before race.',
      purpose: 'Keep legs feeling fresh without adding fatigue',
      isHard: false,
    },
  },

  // ============================================================
  // RACE-SPECIFIC SIMULATIONS
  // ============================================================
  {
    id: 'race_simulation',
    type: 'simulation',
    phase: ['specificity'],
    category: ['Cat1', 'Cat2'],
    raceTypes: ['50K', '50M', '100K', '100M'],
    template: {
      type: 'simulation',
      title: 'Race Simulation',
      description: 'Practice race pacing, fueling, and gear for 2-4 hours at goal race effort.',
      purpose: 'Test race-day strategy in training',
      isKeyWorkout: true,
      isHard: true,
      notes: 'Treat as tune-up race or hard long run. Test everything!',
    },
  },
];

//
// ─────────────────────────────────────────────────────────────
//   WORKOUT LIBRARY QUERY FUNCTIONS
// ─────────────────────────────────────────────────────────────
//

/**
 * Get all workouts for a specific phase
 */
export function getWorkoutsForPhase(phase: TrainingPhase): WorkoutLibraryEntry[] {
  return WORKOUT_LIBRARY.filter(w => w.phase.includes(phase));
}

/**
 * Get all workouts for athlete category
 */
export function getWorkoutsForCategory(category: AthleteCategory): WorkoutLibraryEntry[] {
  return WORKOUT_LIBRARY.filter(w => w.category.includes(category));
}

/**
 * Get all workouts for race type
 */
export function getWorkoutsForRace(raceType: RaceType): WorkoutLibraryEntry[] {
  return WORKOUT_LIBRARY.filter(w => w.raceTypes.includes(raceType));
}

/**
 * Get workouts by type
 */
export function getWorkoutsByType(type: WorkoutType): WorkoutLibraryEntry[] {
  return WORKOUT_LIBRARY.filter(w => w.type === type);
}

/**
 * Get workout by ID
 */
export function getWorkoutById(id: string): WorkoutLibraryEntry | null {
  return WORKOUT_LIBRARY.find(w => w.id === id) || null;
}

/**
 * Get filtered workouts matching all criteria
 */
export function queryWorkouts(criteria: {
  phase?: TrainingPhase;
  category?: AthleteCategory;
  raceType?: RaceType;
  type?: WorkoutType;
  isHard?: boolean;
  isKeyWorkout?: boolean;
}): WorkoutLibraryEntry[] {
  return WORKOUT_LIBRARY.filter(workout => {
    if (criteria.phase && !workout.phase.includes(criteria.phase)) return false;
    if (criteria.category && !workout.category.includes(criteria.category)) return false;
    if (criteria.raceType && !workout.raceTypes.includes(criteria.raceType)) return false;
    if (criteria.type && workout.type !== criteria.type) return false;
    if (criteria.isHard !== undefined && workout.template.isHard !== criteria.isHard) return false;
    if (criteria.isKeyWorkout !== undefined && workout.template.isKeyWorkout !== criteria.isKeyWorkout) return false;
    return true;
  });
}

/**
 * Check if athlete meets workout prerequisites
 */
export function meetsPrerequisites(
  workout: WorkoutLibraryEntry,
  athleteStats: {
    weeklyMileage?: number;
    trainingAge?: number;
    fitnessLevel?: 'low' | 'medium' | 'high';
  }
): boolean {
  if (!workout.prerequisites) return true;

  const { minWeeklyMileage, minTrainingAge, fitnessLevel } = workout.prerequisites;

  if (minWeeklyMileage && (!athleteStats.weeklyMileage || athleteStats.weeklyMileage < minWeeklyMileage)) {
    return false;
  }

  if (minTrainingAge && (!athleteStats.trainingAge || athleteStats.trainingAge < minTrainingAge)) {
    return false;
  }

  if (fitnessLevel && athleteStats.fitnessLevel !== fitnessLevel) {
    const levels = ['low', 'medium', 'high'];
    const requiredIdx = levels.indexOf(fitnessLevel);
    const athleteIdx = levels.indexOf(athleteStats.fitnessLevel || 'low');
    if (athleteIdx < requiredIdx) return false;
  }

  return true;
}

/**
 * Adapt workout based on athlete's surface/terrain preference
 * Provides terrain-specific guidance and modifications
 */
export function adaptWorkoutToSurface(
  workout: Workout,
  surfacePreference?: "road" | "trail" | "treadmill" | "mixed"
): Workout {
  if (!surfacePreference || surfacePreference === "mixed") {
    return workout;
  }

  const adapted = { ...workout };

  switch (workout.type) {
    case 'long':
    case 'aerobic':
      if (surfacePreference === 'trail') {
        adapted.notes = `${adapted.notes || ''}\n\nTrail Running: ${getTrailSpecificGuidance(workout.type)}`.trim();
        if (workout.durationRange) {
          adapted.durationRange = [
            Math.round(workout.durationRange[0] * 1.15),
            Math.round(workout.durationRange[1] * 1.15)
          ];
        }
      } else if (surfacePreference === 'treadmill') {
        adapted.notes = `${adapted.notes || ''}\n\nTreadmill: ${getTreadmillGuidance(workout.type)}`.trim();
      }
      break;

    case 'tempo':
    case 'threshold':
      if (surfacePreference === 'trail') {
        adapted.notes = `${adapted.notes || ''}\n\nTrail: Effort-based pacing. Focus on sustained hard effort rather than specific pace. Adjust for terrain changes.`.trim();
      } else if (surfacePreference === 'treadmill') {
        adapted.notes = `${adapted.notes || ''}\n\nTreadmill: Use 1-2% incline to simulate outdoor effort. Stay mentally engaged with music or intervals.`.trim();
      }
      break;

    case 'hill_repeats':
    case 'hill_sprints':
      if (surfacePreference === 'treadmill') {
        adapted.title = workout.title.replace('Hill', 'Treadmill Hill');
        adapted.notes = `${adapted.notes || ''}\n\nTreadmill: Set to 6-12% grade. Focus on powerful uphill drive and controlled downhill recovery.`.trim();
        adapted.crossTrainAlternative = 'Stair climber or stadium stairs';
      } else if (surfacePreference === 'road') {
        adapted.notes = `${adapted.notes || ''}\n\nRoad: Find a moderate hill (4-8% grade). Parking garages or overpasses work well. Focus on form and power.`.trim();
      }
      break;

    case 'vo2':
    case 'threshold':
      if (surfacePreference === 'trail') {
        adapted.notes = `${adapted.notes || ''}\n\nTrail: Consider using a smoother fire road or groomed trail for intervals. Technical trails may limit intensity control.`.trim();
      }
      break;
  }

  return adapted;
}

function getTrailSpecificGuidance(workoutType: WorkoutType): string {
  const guidance: Record<string, string> = {
    long: 'Allow extra time for technical terrain. Focus on effort/time rather than distance. Practice fueling and navigation.',
    aerobic: 'Embrace varied terrain for strength gains. Slower pace is normal on trails - focus on consistent effort.',
    tempo: 'Use fire roads or smooth trails for sustained efforts. Technical sections = easy recovery.',
    easy: 'Perfect for trail recovery - softer surface reduces impact. Walk steep sections as needed.'
  };
  return guidance[workoutType] || 'Adapt pacing to terrain. Effort matters more than pace on trails.';
}

function getTreadmillGuidance(workoutType: WorkoutType): string {
  const guidance: Record<string, string> = {
    long: 'Break into segments. Vary incline (0-3%) every 15-20 min to engage different muscles. Use entertainment to stay engaged.',
    aerobic: 'Set 1% incline to simulate outdoor effort. Consider progressive incline increases for variety.',
    tempo: 'Steady effort on slight incline (1-2%). Lock in your pace and maintain focus.',
    easy: 'Perfect for form focus. Keep it conversational and relaxed. Try zero-drop if training for trails.'
  };
  return guidance[workoutType] || 'Maintain proper form. Use slight incline to match outdoor effort.';
}
