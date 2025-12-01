/**
 * AI Rules Engine
 * Decision logic for onboarding → plan generation
 *
 * This module contains the intelligence for:
 * - Determining user flow complexity
 * - Selecting appropriate plan templates
 * - Setting AI adaptation levels
 * - Inferring experience from activity
 * - Calculating initial training volume
 */

import type { UserProfile, GoalType, ExperienceLevel } from '@/types/onboarding';

/**
 * Determine the complexity flow based on goal type
 * Beginner: 5K, 10K (simpler progressions)
 * Intermediate: Half Marathon (balanced approach)
 * Advanced: Marathon, Ultra (complex periodization)
 */
export function determineFlow(goalType: GoalType): 'beginner' | 'intermediate' | 'advanced' {
  if (['5k', '10k'].includes(goalType)) return 'beginner';
  if (goalType === 'half') return 'intermediate';
  return 'advanced';
}

/**
 * Select the appropriate plan template based on goal, focus, and experience
 * Templates map to actual training plan structures
 */
export function pickTemplate(
  goalType: GoalType,
  focus?: 'speed' | 'endurance' | 'ultra',
  experience?: ExperienceLevel
): string {
  switch (goalType) {
    case '5k':
      return 'base_speed_6w';

    case '10k':
      return experience === 'beginner' ? 'base_endurance_8w' : 'base_speed_6w';

    case 'half':
      return focus === 'speed' ? 'speed_boost_6w' : 'half_marathon_10w';

    case 'marathon':
      return experience === 'advanced' || experience === 'expert'
        ? 'marathon_advanced_16w'
        : 'marathon_standard';

    case 'ultra':
      if (experience === 'expert') return 'ultra_200m';
      if (experience === 'advanced') return 'ultra_100m';
      return 'ultra_50m';

    default:
      return 'base_speed_6w';
  }
}

/**
 * Determine AI adaptation level based on profile
 * Level 0: Fun/feel-based (no device, or beginner)
 * Level 1: Adaptive (device connected, intermediate)
 * Level 2: Full AI + HR driven (device connected, advanced)
 */
export function determineAdaptation(profile: Partial<UserProfile>): 0 | 1 | 2 {
  if (!profile.deviceConnected) return 0;
  if (profile.experienceLevel === 'beginner') return 0;
  if (profile.experienceLevel === 'intermediate') return 1;
  return 2;
}

/**
 * Infer experience level from activity description
 * Maps user-friendly activity descriptions to experience levels
 */
export function inferExperienceFromActivity(activityLevel: string): ExperienceLevel {
  const map: Record<string, ExperienceLevel> = {
    sedentary: 'beginner',
    inactive: 'beginner',
    walker: 'beginner',
    walk: 'beginner',
    jogger: 'beginner',
    jog: 'beginner',
    regular: 'intermediate',
    run: 'intermediate',
    experienced: 'advanced',
    expert: 'expert',
  };

  return map[activityLevel.toLowerCase()] ?? 'beginner';
}

/**
 * Calculate initial weekly training volume (km/week)
 * Based on goal type and experience level
 * Conservative estimates to prevent injury
 */
export function calculateInitialVolume(goalType: GoalType, experience: ExperienceLevel): number {
  const volumeMatrix: Record<ExperienceLevel, Record<GoalType, number>> = {
    beginner: {
      '5k': 10,
      '10k': 15,
      'half': 25,
      'marathon': 35,
      'ultra': 40,
    },
    intermediate: {
      '5k': 20,
      '10k': 25,
      'half': 40,
      'marathon': 55,
      'ultra': 60,
    },
    advanced: {
      '5k': 30,
      '10k': 40,
      'half': 60,
      'marathon': 80,
      'ultra': 90,
    },
    expert: {
      '5k': 40,
      '10k': 50,
      'half': 80,
      'marathon': 100,
      'ultra': 120,
    },
  };

  return volumeMatrix[experience]?.[goalType] ?? 20;
}

/**
 * Calculate recommended days per week based on goal and experience
 */
export function recommendDaysPerWeek(goalType: GoalType, experience: ExperienceLevel): number {
  if (experience === 'beginner') {
    return goalType === 'ultra' ? 4 : 3;
  }

  if (experience === 'intermediate') {
    if (goalType === '5k' || goalType === '10k') return 4;
    if (goalType === 'half') return 5;
    return 5;
  }

  // Advanced/Expert
  if (goalType === '5k' || goalType === '10k') return 5;
  if (goalType === 'half' || goalType === 'marathon') return 6;
  return 6; // Ultra
}

/**
 * Determine strength training preference based on goal
 */
export function recommendStrength(goalType: GoalType, experience: ExperienceLevel): 'none' | 'base' | 'mountain' | 'ultra' {
  if (experience === 'beginner') return 'none';

  if (goalType === 'ultra') return 'ultra';
  if (goalType === 'marathon' || goalType === 'half') return 'mountain';
  return 'base';
}

/**
 * Get plan duration in weeks based on goal and experience
 */
export function getPlanDuration(goalType: GoalType, experience: ExperienceLevel): number {
  const durationMatrix: Record<ExperienceLevel, Record<GoalType, number>> = {
    beginner: {
      '5k': 8,
      '10k': 10,
      'half': 12,
      'marathon': 16,
      'ultra': 20,
    },
    intermediate: {
      '5k': 6,
      '10k': 8,
      'half': 10,
      'marathon': 14,
      'ultra': 18,
    },
    advanced: {
      '5k': 6,
      '10k': 8,
      'half': 10,
      'marathon': 12,
      'ultra': 16,
    },
    expert: {
      '5k': 6,
      '10k': 8,
      'half': 10,
      'marathon': 12,
      'ultra': 16,
    },
  };

  return durationMatrix[experience]?.[goalType] ?? 12;
}

/**
 * Validate profile completeness for plan generation
 */
export function validateProfileForPlanCreation(profile: Partial<UserProfile>): {
  valid: boolean;
  missing: string[];
} {
  const required = ['goalType', 'experienceLevel', 'daysPerWeek'];
  const missing = required.filter(field => !profile[field as keyof UserProfile]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Generate a personalized plan summary for user confirmation
 */
export function generatePlanSummary(profile: Partial<UserProfile>): string {
  const template = pickTemplate(
    profile.goalType!,
    undefined,
    profile.experienceLevel
  );

  const volume = profile.avgMileage || calculateInitialVolume(
    profile.goalType!,
    profile.experienceLevel || 'beginner'
  );

  const duration = getPlanDuration(
    profile.goalType!,
    profile.experienceLevel || 'beginner'
  );

  const adaptationLevel = determineAdaptation(profile);
  const adaptationText = ['feel-based', 'adaptive', 'AI + HR driven'][adaptationLevel];

  return `${duration}-week ${profile.goalType?.toUpperCase()} plan • ${profile.daysPerWeek} days/week • ${volume}km/week starting volume • ${adaptationText} training`;
}

/**
 * Get motivational message based on goal and experience
 */
export function getMotivationalMessage(profile: Partial<UserProfile>): string {
  const { goalType, experienceLevel } = profile;

  if (experienceLevel === 'beginner') {
    if (goalType === '5k') return "Your first 5K is going to feel amazing! Let's build confidence step by step.";
    if (goalType === '10k') return "10K is the perfect distance to fall in love with running. You've got this!";
    if (goalType === 'half') return "Half marathon is an incredible goal! We'll get you there with smart, steady progress.";
    if (goalType === 'marathon') return "Marathon training is a journey. We'll take it one week at a time, together.";
    return "Ultra running is pure adventure. Let's start building that endurance base!";
  }

  if (experienceLevel === 'intermediate') {
    if (goalType === '5k') return "Time to unlock some speed! We'll sharpen your pace with smart intervals.";
    if (goalType === '10k') return "10K is where fitness meets fun. Let's chase that PR!";
    if (goalType === 'half') return "You know the distance. Now let's optimize your training for your best half yet.";
    if (goalType === 'marathon') return "Marathon ready! Let's build the endurance and pacing strategy to crush it.";
    return "Ultra distance requires patience and smart fueling. Let's master both.";
  }

  // Advanced/Expert
  if (goalType === 'ultra') return "Big mountains, big dreams. Let's sculpt a plan worthy of your goals.";
  if (goalType === 'marathon') return "PR hunting season. We'll blend volume, intensity, and recovery like a pro.";
  return "Speed work done right = breakthroughs. Let's get scientific about your training.";
}
