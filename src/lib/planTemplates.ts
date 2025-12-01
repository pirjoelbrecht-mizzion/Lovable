/**
 * Training Plan Templates Library
 *
 * Responsibilities:
 * - Store base metadata for each training plan template
 * - Generate initial plan and week structure in database
 * - Support both metric (km) and imperial (miles) units
 * - Provide clean, generic naming aligned with app architecture
 * - Future-proof structure for storing actual workouts
 */

import { supabase } from './supabase';
import type { GoalType } from '@/types/onboarding';

/**
 * Rounds distance to the nearest 0.5 (km or mi)
 * Examples: 5.3 → 5.5, 10.7 → 10.5
 */
function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/**
 * Converts kilometres to miles when needed
 */
function convertDistance(valueKm: number, useMiles: boolean): number {
  return useMiles ? valueKm * 0.621371 : valueKm;
}

/**
 * Formats distance text with correct unit and 0.5-step rounding
 * Examples: formatDistance(5, false) → "5km", formatDistance(5, true) → "3mi"
 */
export function formatDistance(valueKm: number, useMiles: boolean): string {
  const dist = roundHalf(convertDistance(valueKm, useMiles));
  const unit = useMiles ? 'mi' : 'km';
  return `${dist}${unit}`;
}

/**
 * Plan Template Definition
 */
export interface PlanTemplate {
  key: string;
  name: string;
  goalType: GoalType;
  weeks: number;
  focus: string;
  description: string;
  baseVolumeKm: number;
  progression: number;
  strengthBlocks: string[];
  aiCompatibility: 0 | 1 | 2;
}

/**
 * Template Catalogue
 * Clean, generic naming without external brand references
 */
const PLAN_TEMPLATES: Record<string, PlanTemplate> = {
  base_speed_6w: {
    key: 'base_speed_6w',
    name: 'Base + Speed (6 Weeks)',
    goalType: '5k',
    weeks: 6,
    focus: 'Build consistency and gentle speed',
    description:
      'An approachable six-week program combining easy runs, strides and short endurance sessions.',
    baseVolumeKm: 15,
    progression: 5,
    strengthBlocks: ['General Strength'],
    aiCompatibility: 0,
  },

  base_endurance_8w: {
    key: 'base_endurance_8w',
    name: 'Base Building (8 Weeks)',
    goalType: '10k',
    weeks: 8,
    focus: 'Aerobic foundation and consistency',
    description:
      'Eight weeks focused on building your aerobic base with easy running and progressive volume.',
    baseVolumeKm: 20,
    progression: 5,
    strengthBlocks: ['General Strength'],
    aiCompatibility: 0,
  },

  speed_boost_6w: {
    key: 'speed_boost_6w',
    name: 'Speed Builder (6 Weeks)',
    goalType: 'half',
    weeks: 6,
    focus: 'Speed-endurance development',
    description:
      'Compact six-week cycle focusing on threshold efforts and hill repetitions to improve efficiency.',
    baseVolumeKm: 40,
    progression: 8,
    strengthBlocks: ['Speed Legs'],
    aiCompatibility: 1,
  },

  half_marathon_10w: {
    key: 'half_marathon_10w',
    name: 'Half Marathon (10 Weeks)',
    goalType: 'half',
    weeks: 10,
    focus: 'Endurance and pace control',
    description:
      'Balanced 10-week half marathon plan with progressive long runs and tempo work.',
    baseVolumeKm: 45,
    progression: 7,
    strengthBlocks: ['Leg Strength', 'Core Stability'],
    aiCompatibility: 1,
  },

  marathon_standard: {
    key: 'marathon_standard',
    name: 'Marathon Training Plan',
    goalType: 'marathon',
    weeks: 12,
    focus: 'Endurance and aerobic economy',
    description:
      'A structured build toward the marathon distance with progressive long runs and balanced recovery.',
    baseVolumeKm: 55,
    progression: 8,
    strengthBlocks: ['Leg Strength', 'Core Stability'],
    aiCompatibility: 1,
  },

  marathon_advanced_16w: {
    key: 'marathon_advanced_16w',
    name: 'Marathon Advanced (16 Weeks)',
    goalType: 'marathon',
    weeks: 16,
    focus: 'Peak performance and race-day readiness',
    description:
      'Comprehensive 16-week marathon build with advanced periodization and HR-driven training.',
    baseVolumeKm: 70,
    progression: 6,
    strengthBlocks: ['Leg Strength', 'Core Stability', 'Power'],
    aiCompatibility: 2,
  },

  ultra_50m: {
    key: 'ultra_50m',
    name: '50 Mile Ultramarathon Plan',
    goalType: 'ultra',
    weeks: 12,
    focus: 'Trail endurance and strength',
    description:
      'Progressive trail-focused plan including back-to-back long runs, power climbs and recovery focus.',
    baseVolumeKm: 70,
    progression: 6,
    strengthBlocks: ['Mountain Legs', 'Core Stability'],
    aiCompatibility: 2,
  },

  ultra_100m: {
    key: 'ultra_100m',
    name: '100 Mile Plan',
    goalType: 'ultra',
    weeks: 14,
    focus: 'High-endurance and fatigue resistance',
    description:
      'Advanced build for long-distance trail events with smart load control and adaptive fatigue management.',
    baseVolumeKm: 80,
    progression: 5,
    strengthBlocks: ['Ultra Legs'],
    aiCompatibility: 2,
  },

  ultra_200m: {
    key: 'ultra_200m',
    name: '200 Mile Plan',
    goalType: 'ultra',
    weeks: 16,
    focus: 'Extreme endurance and multi-day resilience',
    description:
      'Long-term high-volume program emphasising hiking, sleep adaptation and recovery strategy.',
    baseVolumeKm: 90,
    progression: 4,
    strengthBlocks: ['Ultra Legs', 'Cross-Training'],
    aiCompatibility: 2,
  },
};

/**
 * Returns template metadata by key
 * @throws Error if template not found
 */
export function getPlanTemplateMetadata(key: string): PlanTemplate {
  const template = PLAN_TEMPLATES[key];
  if (!template) {
    throw new Error(`Unknown plan template: ${key}`);
  }
  return template;
}

/**
 * Lists all templates or those matching a goal type
 */
export function listAvailableTemplates(goalType?: GoalType): PlanTemplate[] {
  const all = Object.values(PLAN_TEMPLATES);
  return goalType ? all.filter((t) => t.goalType === goalType) : all;
}

/**
 * Configuration for creating a training plan
 */
export interface CreatePlanConfig {
  userId: string;
  template: string;
  startDate: string;
  aiLevel?: number;
  initialVolumeKm?: number;
  useMiles?: boolean;
}

/**
 * Creates training plan and weekly structure in database
 *
 * Process:
 * 1. Validate template exists
 * 2. Create training_plans record
 * 3. Generate weekly structure with progressive volume
 * 4. Insert all weeks with formatted distance targets
 *
 * @returns Created plan and weeks data
 */
export async function createTrainingPlan({
  userId,
  template,
  startDate,
  aiLevel = 0,
  initialVolumeKm = 10,
  useMiles = false,
}: CreatePlanConfig): Promise<{
  success: boolean;
  plan?: any;
  weeks?: any[];
  error?: string;
}> {
  try {
    const meta = getPlanTemplateMetadata(template);

    const { data: plan, error: planError } = await supabase
      .from('plan_weeks')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (planError && planError.code !== 'PGRST116') {
      throw planError;
    }

    const weeks: any[] = [];

    for (let i = 0; i < meta.weeks; i++) {
      const isRecoveryWeek = (i + 1) % 4 === 0;
      const isTaperWeek = i >= meta.weeks - 2;

      let weekMultiplier = 1 + (meta.progression / 100) * i;

      if (isRecoveryWeek && !isTaperWeek) {
        weekMultiplier *= 0.7;
      } else if (isTaperWeek) {
        weekMultiplier *= 0.5;
      }

      const weekKm = roundHalf(initialVolumeKm * weekMultiplier);
      const weekDistText = formatDistance(weekKm, useMiles);

      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(weekStartDate.getDate() + i * 7);

      let notes = '';
      if (i === 0) {
        notes = 'Start easy and enjoy the process!';
      } else if (isTaperWeek) {
        notes = `Taper week: Reduce volume, maintain intensity. Target around ${weekDistText}.`;
      } else if (isRecoveryWeek) {
        notes = `Recovery week: Lower volume to absorb training. Target around ${weekDistText}.`;
      } else {
        notes = `Target around ${weekDistText} this week.`;
      }

      const planData = generateWeekSessions(
        i + 1,
        weekKm,
        meta,
        useMiles
      );

      const { error: weekError } = await supabase
        .from('plan_weeks')
        .upsert(
          {
            user_id: userId,
            week_start_date: weekStartDate.toISOString().split('T')[0],
            plan_data: planData,
            intensity_scale: isTaperWeek ? 0.5 : isRecoveryWeek ? 0.7 : 1.0,
            adaptation_reason: notes,
          },
          {
            onConflict: 'user_id,week_start_date',
          }
        );

      if (weekError) throw weekError;

      weeks.push({
        week: i + 1,
        target_volume_display: weekDistText,
        notes,
        sessions: planData,
      });
    }

    return {
      success: true,
      plan: { template: meta, userId, startDate, aiLevel },
      weeks,
    };
  } catch (error) {
    console.error('Error creating training plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate daily training sessions for a week
 * Uses 80/20 principle: 80% easy/aerobic, 20% quality work
 */
function generateWeekSessions(
  weekNum: number,
  totalKm: number,
  meta: PlanTemplate,
  useMiles: boolean
): any[] {
  const daysPerWeek = Math.min(Math.max(3, Math.ceil(meta.weeks / 3)), 6);
  const sessions: any[] = [];
  const avgSessionKm = totalKm / daysPerWeek;

  for (let day = 0; day < daysPerWeek; day++) {
    const sessionType = determineSessionType(day, daysPerWeek, weekNum, meta);
    const distanceKm = calculateSessionDistance(sessionType, avgSessionKm, weekNum, meta);
    const distanceText = formatDistance(distanceKm, useMiles);

    sessions.push({
      day: day + 1,
      type: sessionType,
      distance: distanceText,
      distanceKm: roundHalf(distanceKm),
      description: getSessionDescription(sessionType, distanceText),
      intensity: getSessionIntensity(sessionType),
    });
  }

  return sessions;
}

/**
 * Determine session type based on day position and template
 */
function determineSessionType(
  dayIndex: number,
  daysPerWeek: number,
  weekNum: number,
  meta: PlanTemplate
): string {
  if (dayIndex === 0) return 'easy';

  if (daysPerWeek >= 4 && dayIndex === Math.floor(daysPerWeek / 2)) {
    return weekNum % 2 === 0 ? 'tempo' : 'intervals';
  }

  if (dayIndex === daysPerWeek - 1) return 'long';

  if (meta.strengthBlocks.length > 0 && dayIndex === 1) {
    return 'easy+strength';
  }

  return 'easy';
}

/**
 * Calculate session distance based on type and weekly average
 */
function calculateSessionDistance(
  sessionType: string,
  avgKm: number,
  weekNum: number,
  meta: PlanTemplate
): number {
  switch (sessionType) {
    case 'long':
      return avgKm * 1.5 * (1 + weekNum * 0.03);
    case 'tempo':
    case 'intervals':
      return avgKm * 0.8;
    case 'easy+strength':
      return avgKm * 0.6;
    case 'easy':
    default:
      return avgKm;
  }
}

/**
 * Get human-readable session description
 */
function getSessionDescription(sessionType: string, distance: string): string {
  switch (sessionType) {
    case 'easy':
      return `Easy ${distance} - conversational pace, Zone 2`;
    case 'long':
      return `Long run ${distance} - build endurance, practice fueling`;
    case 'tempo':
      return `Tempo ${distance} - 20min @ threshold pace after warmup`;
    case 'intervals':
      return `Intervals ${distance} - 6×800m @ 5K pace, 90s rest`;
    case 'easy+strength':
      return `Easy ${distance} + 20min strength work`;
    default:
      return `${distance} run`;
  }
}

/**
 * Get session intensity level
 */
function getSessionIntensity(sessionType: string): string {
  switch (sessionType) {
    case 'easy':
    case 'easy+strength':
      return 'easy';
    case 'long':
      return 'moderate';
    case 'tempo':
    case 'intervals':
      return 'hard';
    default:
      return 'easy';
  }
}

/**
 * Get all template keys
 */
export function getAllTemplateKeys(): string[] {
  return Object.keys(PLAN_TEMPLATES);
}

/**
 * Check if template exists
 */
export function templateExists(key: string): boolean {
  return key in PLAN_TEMPLATES;
}

/**
 * Export templates for external use
 */
export { PLAN_TEMPLATES };
