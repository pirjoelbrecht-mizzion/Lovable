/**
 * Workout Generator
 *
 * Generates individual workouts and weekly training plans
 * Integrates with plan templates and onboarding system
 * Supports both metric and imperial units
 */

import { loadUserProfile } from '@/state/userData';
import { calcHrZones, calcPaceZones } from '@/utils/stravaImport';
import { formatDistance } from '@/lib/planTemplates';

export type WorkoutType = 'recovery' | 'easy' | 'tempo' | 'intervals' | 'long' | 'fartlek' | 'hill' | 'easy+strength';

export type HealthStatus = 'ok' | 'returning' | 'sick' | 'fatigued';

export interface GeneratedWorkout {
  title: string;
  description: string;
  duration: string;
  paceRange: string;
  hrRange: string;
  zone: string;
  details: string;
  estimatedKm: number;
  estimatedDistance?: string;
  type: WorkoutType;
  intensity: 'easy' | 'moderate' | 'hard';
}

export interface WorkoutGeneratorConfig {
  useMiles?: boolean;
  healthStatus?: HealthStatus;
  fatigueScore?: number;
}

/**
 * Format pace as min:sec
 */
function formatPace(pace: number): string {
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace range with unit awareness
 */
function formatPaceRange(lo: number, hi: number, useMiles: boolean = false): string {
  const unit = useMiles ? 'mi' : 'km';
  return `${formatPace(lo)}–${formatPace(hi)}/${unit}`;
}

/**
 * Adjust workout intensity based on health/fatigue
 */
function adjustForHealth(
  baseKm: number,
  healthStatus: HealthStatus,
  fatigueScore?: number
): number {
  if (healthStatus === 'sick') return baseKm * 0.3;
  if (healthStatus === 'returning') return baseKm * 0.6;
  if (healthStatus === 'fatigued') return baseKm * 0.7;

  if (fatigueScore !== undefined) {
    if (fatigueScore > 8) return baseKm * 0.6;
    if (fatigueScore > 6) return baseKm * 0.8;
  }

  return baseKm;
}

/**
 * Generate individual workout based on type
 * Now with unit awareness and health adjustments
 */
export function generateWorkout(
  type: WorkoutType,
  config: WorkoutGeneratorConfig = {}
): GeneratedWorkout {
  const { useMiles = false, healthStatus = 'ok', fatigueScore } = config;
  const user = loadUserProfile();
  const hrZones = calcHrZones(user.hrMax || 180);
  const paceZones = calcPaceZones(user.paceBase);

  let workout: Omit<GeneratedWorkout, 'estimatedDistance' | 'type' | 'intensity'>;

  switch (type) {
    case 'recovery':
      workout = {
        title: 'Recovery Run',
        description: 'Easy recovery jog to promote active recovery',
        duration: '30–40 min',
        paceRange: formatPaceRange(paceZones.Z1[0], paceZones.Z1[1], useMiles),
        hrRange: `${hrZones.Z1[0]}–${hrZones.Z1[1]} bpm`,
        zone: 'Zone 1',
        details: 'Keep it conversational. Should feel very easy. Focus on form and relaxation.',
        estimatedKm: adjustForHealth(4, healthStatus, fatigueScore),
      };
      break;

    case 'easy':
      workout = {
        title: 'Easy Aerobic Run',
        description: 'Base-building endurance run',
        duration: '45–60 min',
        paceRange: formatPaceRange(paceZones.Z2[0], paceZones.Z2[1], useMiles),
        hrRange: `${hrZones.Z2[0]}–${hrZones.Z2[1]} bpm`,
        zone: 'Zone 2',
        details: 'Comfortable conversational pace. Build your aerobic base. Most important workout type.',
        estimatedKm: adjustForHealth(7, healthStatus, fatigueScore),
      };
      break;

    case 'tempo':
      workout = {
        title: 'Tempo Run',
        description: 'Sustained threshold effort',
        duration: '20–30 min @ tempo',
        paceRange: formatPaceRange(paceZones.Z3[0], paceZones.Z3[1], useMiles),
        hrRange: `${hrZones.Z3[0]}–${hrZones.Z3[1]} bpm`,
        zone: 'Zone 3',
        details: '10 min warm-up, 20–30 min steady tempo, 10 min cool-down. Comfortably hard, marathon-ish pace.',
        estimatedKm: adjustForHealth(8, healthStatus, fatigueScore),
      };
      break;

    case 'intervals':
      workout = {
        title: 'Interval Training',
        description: 'High-intensity interval session',
        duration: '5×3 min hard',
        paceRange: formatPaceRange(paceZones.Z4[0], paceZones.Z4[1], useMiles),
        hrRange: `${hrZones.Z4[0]}–${hrZones.Z4[1]} bpm`,
        zone: 'Zone 4–5',
        details: '15 min warm-up, 5×3 min @ threshold pace with 2 min easy jog recovery, 10 min cool-down.',
        estimatedKm: adjustForHealth(9, healthStatus, fatigueScore),
      };
      break;

    case 'long':
      workout = {
        title: 'Long Run',
        description: 'Endurance-building long run',
        duration: '75–120 min',
        paceRange: formatPaceRange(paceZones.Z2[0], paceZones.Z2[1], useMiles),
        hrRange: `${hrZones.Z2[0]}–${hrZones.Z2[1]} bpm`,
        zone: 'Zone 2',
        details: 'Easy conversational pace. Build endurance. Can include last 20% at tempo if feeling strong.',
        estimatedKm: adjustForHealth(15, healthStatus, fatigueScore),
      };
      break;

    case 'fartlek':
      workout = {
        title: 'Fartlek Run',
        description: 'Playful speed variations',
        duration: '40–50 min',
        paceRange: `${formatPaceRange(paceZones.Z2[0], paceZones.Z2[1], useMiles)} base`,
        hrRange: `${hrZones.Z2[0]}–${hrZones.Z4[1]} bpm`,
        zone: 'Zone 2–4',
        details: '10 min warm-up, 20–30 min fartlek (mix of 1–3 min pickups at Z3-Z4 with equal recovery), 10 min cool-down.',
        estimatedKm: adjustForHealth(8, healthStatus, fatigueScore),
      };
      break;

    case 'hill':
      workout = {
        title: 'Hill Repeats',
        description: 'Strength and power development',
        duration: '6–8×90 sec uphill',
        paceRange: 'Effort-based',
        hrRange: `${hrZones.Z4[0]}–${hrZones.Z5[1]} bpm`,
        zone: 'Zone 4–5',
        details: '15 min warm-up, 6–8×90 sec uphill @ hard effort, jog down recovery, 10 min cool-down.',
        estimatedKm: adjustForHealth(8, healthStatus, fatigueScore),
      };
      break;

    case 'easy+strength':
      workout = {
        title: 'Easy Run + Strength',
        description: 'Easy run followed by strength training',
        duration: '30–40 min run + 20 min strength',
        paceRange: formatPaceRange(paceZones.Z2[0], paceZones.Z2[1], useMiles),
        hrRange: `${hrZones.Z2[0]}–${hrZones.Z2[1]} bpm`,
        zone: 'Zone 2',
        details: 'Easy conversational run, then strength work: squats, lunges, core, hip stability.',
        estimatedKm: adjustForHealth(5, healthStatus, fatigueScore),
      };
      break;

    default:
      return generateWorkout('easy', config);
  }

  const estimatedDistance = formatDistance(workout.estimatedKm, useMiles);

  const intensity =
    type === 'recovery' ? 'easy' :
    ['easy', 'easy+strength', 'long'].includes(type) ? 'easy' :
    type === 'tempo' ? 'moderate' :
    'hard';

  return {
    ...workout,
    estimatedDistance,
    type,
    intensity,
  };
}

/**
 * Generate weekly plan based on volume and health status
 * Integrates with onboarding system for smart recommendations
 */
export function generateWeeklyPlan(
  weeklyKm: number,
  config: WorkoutGeneratorConfig = {}
): GeneratedWorkout[] {
  const { healthStatus = 'ok', fatigueScore, useMiles = false } = config;

  if (healthStatus === 'sick') {
    return [
      generateWorkout('recovery', config),
      generateWorkout('recovery', config),
    ];
  }

  if (fatigueScore !== undefined && fatigueScore > 8) {
    return [
      generateWorkout('recovery', config),
      generateWorkout('easy', config),
      generateWorkout('recovery', config),
    ];
  }

  if (healthStatus === 'returning' || weeklyKm < 20) {
    return [
      generateWorkout('easy', config),
      generateWorkout('recovery', config),
      generateWorkout('easy', config),
      generateWorkout('long', config),
    ];
  }

  if (weeklyKm < 30) {
    return [
      generateWorkout('easy', config),
      generateWorkout('easy+strength', config),
      generateWorkout('recovery', config),
      generateWorkout('easy', config),
      generateWorkout('long', config),
    ];
  }

  if (weeklyKm < 40) {
    return [
      generateWorkout('easy', config),
      generateWorkout('tempo', config),
      generateWorkout('recovery', config),
      generateWorkout('easy', config),
      generateWorkout('long', config),
    ];
  }

  if (weeklyKm < 60) {
    return [
      generateWorkout('recovery', config),
      generateWorkout('easy', config),
      generateWorkout('tempo', config),
      generateWorkout('easy+strength', config),
      generateWorkout('intervals', config),
      generateWorkout('recovery', config),
      generateWorkout('long', config),
    ];
  }

  return [
    generateWorkout('recovery', config),
    generateWorkout('easy', config),
    generateWorkout('tempo', config),
    generateWorkout('easy', config),
    generateWorkout('intervals', config),
    generateWorkout('easy+strength', config),
    generateWorkout('long', config),
  ];
}

/**
 * Map session type from plan templates to workout type
 * Enables integration between onboarding plan templates and workout generator
 */
export function mapSessionTypeToWorkoutType(sessionType: string): WorkoutType {
  const mapping: Record<string, WorkoutType> = {
    easy: 'easy',
    long: 'long',
    tempo: 'tempo',
    intervals: 'intervals',
    'easy+strength': 'easy+strength',
    recovery: 'recovery',
    fartlek: 'fartlek',
    hill: 'hill',
  };

  return mapping[sessionType.toLowerCase()] || 'easy';
}

/**
 * Generate detailed workout from plan template session
 * Bridges the gap between macro plan (from templates) and micro details (from generator)
 */
export function enrichSessionWithDetails(
  session: {
    type: string;
    distanceKm: number;
    description?: string;
  },
  config: WorkoutGeneratorConfig = {}
): GeneratedWorkout {
  const workoutType = mapSessionTypeToWorkoutType(session.type);
  const workout = generateWorkout(workoutType, config);

  return {
    ...workout,
    estimatedKm: session.distanceKm,
    estimatedDistance: formatDistance(session.distanceKm, config.useMiles || false),
    description: session.description || workout.description,
  };
}

/**
 * Calculate total weekly volume from workouts
 */
export function calculateWeeklyVolume(workouts: GeneratedWorkout[]): number {
  return workouts.reduce((sum, w) => sum + w.estimatedKm, 0);
}

/**
 * Get workout intensity distribution
 */
export function getIntensityDistribution(workouts: GeneratedWorkout[]): {
  easy: number;
  moderate: number;
  hard: number;
} {
  const total = workouts.length;
  const easy = workouts.filter(w => w.intensity === 'easy').length;
  const moderate = workouts.filter(w => w.intensity === 'moderate').length;
  const hard = workouts.filter(w => w.intensity === 'hard').length;

  return {
    easy: Math.round((easy / total) * 100),
    moderate: Math.round((moderate / total) * 100),
    hard: Math.round((hard / total) * 100),
  };
}

export const workoutTypeLabels: Record<WorkoutType, string> = {
  recovery: 'Recovery',
  easy: 'Easy Run',
  tempo: 'Tempo',
  intervals: 'Intervals',
  long: 'Long Run',
  fartlek: 'Fartlek',
  hill: 'Hill Repeats',
  'easy+strength': 'Easy + Strength',
};
