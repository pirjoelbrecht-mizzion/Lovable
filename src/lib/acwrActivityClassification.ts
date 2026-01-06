/**
 * ======================================================================
 *  ACWR ACTIVITY CLASSIFICATION
 * ======================================================================
 *
 * CRITICAL PRINCIPLE:
 * ACWR tracks cardio-metabolic load only — not total activity time.
 *
 * Only sustained aerobic/cardio activities contribute to ACWR minutes.
 * Strength, skill, and technical activities are excluded to prevent
 * distortion of injury risk prediction.
 *
 * WHY THIS MATTERS:
 * - ACWR predicts overuse injury risk from systemic aerobic stress
 * - Strength training creates localized fatigue, not systemic aerobic load
 * - Including non-cardio activities inflates ACWR without injury correlation
 * - Multi-sport athletes need accurate cardio load tracking
 */

export type ACWRActivityGroup = 'cardio' | 'strength' | 'skill' | 'excluded';

export interface ActivityClassification {
  group: ACWRActivityGroup;
  acwrEligible: boolean;
  reason: string;
}

/**
 * ======================================================================
 *  GROUP A — CARDIO / AEROBIC (INCLUDED IN ACWR)
 * ======================================================================
 *
 * These activities DO contribute to ACWR time load (minutes)
 */
const CARDIO_ACTIVITIES = new Set([
  // Cycling & Wheeled Endurance
  'Ride',
  'VirtualRide',
  'EBikeRide',
  'Handcycle',
  'Velomobile',
  'InlineSkate',
  'Wheelchair',

  // Running & Walking
  'Run',
  'VirtualRun',
  'TrailRun',
  'Walk',
  'SpeedWalk',
  'Hike',

  // Water Sports (Endurance-Based)
  'Swim',
  'OpenWaterSwim',
  'Surfing',
  'Windsurf',
  'Kitesurf',
  'StandUpPaddling',
  'Kayaking',
  'Canoeing',
  'Rowing',
  'RowingMachine',

  // Winter Endurance Sports
  'AlpineSki',
  'BackcountrySki',
  'NordicSki',
  'Snowshoe',

  // Outdoor Endurance Variants
  'Mountaineering',
  'AdventureRace',
  'Orienteering',
]);

/**
 * ======================================================================
 *  GROUP B — STRENGTH / FITNESS (EXCLUDED FROM ACWR)
 * ======================================================================
 *
 * These activities MUST NOT contribute to ACWR time load
 * Even if HR is elevated, they create localized fatigue and distort ACWR
 */
const STRENGTH_ACTIVITIES = new Set([
  'Workout',
  'WeightTraining',
  'Crossfit',
  'CircuitTraining',
  'HighIntensityIntervalTraining',
  'Yoga',
  'Pilates',
  'StairStepper',
  'Elliptical',
]);

/**
 * ======================================================================
 *  GROUP C — SKILL / TECHNICAL / MIXED LOAD (EXCLUDED)
 * ======================================================================
 *
 * Intermittent, chaotic, or technical load → ACWR invalid
 */
const SKILL_ACTIVITIES = new Set([
  // Technical Climbing
  'RockClimbing',
  'IceClimbing',
  'ViaFerrata',

  // Team, Ball & Racket Sports
  'Soccer',
  'Football',
  'Basketball',
  'Baseball',
  'Softball',
  'Rugby',
  'Hockey',
  'IceHockey',
  'Cricket',
  'Lacrosse',
  'Handball',
  'Volleyball',
  'BeachVolleyball',
  'Tennis',
  'TableTennis',
  'Squash',
  'Racquetball',
  'Badminton',
  'Pickleball',

  // Combat & Precision Sports
  'Boxing',
  'Kickboxing',
  'MartialArts',
  'Wrestling',
  'Fencing',
  'Archery',
  'Shooting',

  // Leisure & Miscellaneous
  'Golf',
  'DiscGolf',
  'Bowling',
  'Dance',
  'Equestrian',
  'Fishing',
  'Hunting',
  'Skateboard',
]);

/**
 * ======================================================================
 *  CLASSIFICATION ENGINE
 * ======================================================================
 */

/**
 * Classify an activity for ACWR eligibility
 * Returns: group + acwrEligible flag + reason
 */
export function classifyActivityForACWR(
  activityType: string,
  options?: {
    hasHeartRate?: boolean;
    averageHeartRate?: number;
    isEnduranceMode?: boolean;
  }
): ActivityClassification {
  const type = activityType;

  // GROUP A: CARDIO (INCLUDED)
  if (CARDIO_ACTIVITIES.has(type)) {
    return {
      group: 'cardio',
      acwrEligible: true,
      reason: 'Sustained aerobic/cardio activity',
    };
  }

  // GROUP B: STRENGTH (EXCLUDED)
  if (STRENGTH_ACTIVITIES.has(type)) {
    return {
      group: 'strength',
      acwrEligible: false,
      reason: 'Strength/fitness - creates localized fatigue, not systemic aerobic load',
    };
  }

  // GROUP C: SKILL/TECHNICAL (EXCLUDED)
  if (SKILL_ACTIVITIES.has(type)) {
    return {
      group: 'skill',
      acwrEligible: false,
      reason: 'Skill/technical activity - intermittent load, ACWR invalid',
    };
  }

  // SPECIAL CASES

  // EBike: Include only if HR data suggests aerobic effort
  if (type === 'EBikeRide') {
    if (options?.hasHeartRate && options?.averageHeartRate && options.averageHeartRate > 120) {
      return {
        group: 'cardio',
        acwrEligible: true,
        reason: 'EBike with elevated HR - aerobic effort detected',
      };
    }
    return {
      group: 'excluded',
      acwrEligible: false,
      reason: 'EBike without aerobic effort - excluded',
    };
  }

  // AdventureRace: Include if endurance mode
  if (type === 'AdventureRace') {
    if (options?.isEnduranceMode) {
      return {
        group: 'cardio',
        acwrEligible: true,
        reason: 'Adventure race in endurance mode',
      };
    }
    return {
      group: 'skill',
      acwrEligible: false,
      reason: 'Adventure race - mixed load without endurance mode',
    };
  }

  // Unknown activity type → excluded by default (safe)
  return {
    group: 'excluded',
    acwrEligible: false,
    reason: `Unknown activity type: ${type}`,
  };
}

/**
 * Check if activity is eligible for ACWR calculation
 * Simple boolean check for filtering
 */
export function isACWREligible(
  activityType: string,
  options?: {
    hasHeartRate?: boolean;
    averageHeartRate?: number;
    isEnduranceMode?: boolean;
  }
): boolean {
  return classifyActivityForACWR(activityType, options).acwrEligible;
}

/**
 * Calculate ACWR-eligible time from activities
 * Filters activities and sums only eligible durations
 */
export function calculateACWRLoad(
  activities: Array<{
    type: string;
    durationMinutes: number;
    hasHeartRate?: boolean;
    averageHeartRate?: number;
    isEnduranceMode?: boolean;
  }>
): {
  totalACWRMinutes: number;
  includedActivities: number;
  excludedActivities: number;
  breakdown: {
    cardio: number;
    strength: number;
    skill: number;
    excluded: number;
  };
} {
  let totalACWRMinutes = 0;
  let includedActivities = 0;
  let excludedActivities = 0;

  const breakdown = {
    cardio: 0,
    strength: 0,
    skill: 0,
    excluded: 0,
  };

  for (const activity of activities) {
    const classification = classifyActivityForACWR(activity.type, {
      hasHeartRate: activity.hasHeartRate,
      averageHeartRate: activity.averageHeartRate,
      isEnduranceMode: activity.isEnduranceMode,
    });

    if (classification.acwrEligible) {
      totalACWRMinutes += activity.durationMinutes;
      includedActivities++;
    } else {
      excludedActivities++;
    }

    // Track breakdown
    if (classification.group === 'cardio') {
      breakdown.cardio += activity.durationMinutes;
    } else if (classification.group === 'strength') {
      breakdown.strength += activity.durationMinutes;
    } else if (classification.group === 'skill') {
      breakdown.skill += activity.durationMinutes;
    } else {
      breakdown.excluded += activity.durationMinutes;
    }
  }

  return {
    totalACWRMinutes,
    includedActivities,
    excludedActivities,
    breakdown,
  };
}

/**
 * Get human-readable explanation for activity classification
 */
export function getACWRClassificationExplanation(activityType: string): string {
  const classification = classifyActivityForACWR(activityType);

  if (classification.acwrEligible) {
    return `✅ ${activityType}: Included in ACWR (${classification.reason})`;
  } else {
    return `❌ ${activityType}: Excluded from ACWR (${classification.reason})`;
  }
}

/**
 * ======================================================================
 *  ACTIVITY GROUPS EXPORT (for documentation/UI)
 * ======================================================================
 */

export const ACTIVITY_GROUPS = {
  cardio: Array.from(CARDIO_ACTIVITIES).sort(),
  strength: Array.from(STRENGTH_ACTIVITIES).sort(),
  skill: Array.from(SKILL_ACTIVITIES).sort(),
} as const;

/**
 * ======================================================================
 *  VALIDATION & DEBUGGING
 * ======================================================================
 */

export function validateACWRClassification(activityType: string): {
  isValid: boolean;
  classification: ActivityClassification;
  warning?: string;
} {
  const classification = classifyActivityForACWR(activityType);

  // Check for common misclassifications
  const warnings: string[] = [];

  if (activityType === 'Workout' && classification.acwrEligible) {
    warnings.push('Generic "Workout" should not be ACWR-eligible unless reclassified');
  }

  if (activityType.includes('Weight') && classification.acwrEligible) {
    warnings.push('Weight training should not be ACWR-eligible');
  }

  if (activityType.includes('HIIT') && classification.acwrEligible) {
    warnings.push('HIIT should not be ACWR-eligible (localized fatigue)');
  }

  return {
    isValid: warnings.length === 0,
    classification,
    warning: warnings.length > 0 ? warnings.join('; ') : undefined,
  };
}
