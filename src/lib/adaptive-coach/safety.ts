/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — SAFETY SYSTEM
 *  Module 6 — Hard Constraint Enforcement
 * ======================================================================
 *
 * This module enforces safety constraints on training plans to prevent:
 * - Overtraining and injury
 * - Excessive volume progression
 * - Insufficient recovery
 * - Dangerous ACWR ratios
 * - Age-inappropriate training loads
 *
 * All safety rules are NON-NEGOTIABLE and will block plan generation
 * or modifications that violate them.
 */

import type {
  AthleteProfile,
  WeeklyPlan,
  Workout,
  TrainingPhase
} from './types';

export const SAFETY_LIMITS = {
  MAX_WEEKLY_INCREASE_PCT: 10,
  MAX_WEEKLY_DECREASE_PCT: 30,

  ACWR: {
    MIN: 0.8,
    MAX: 1.3,
    OPTIMAL: 1.0,
    DANGER_LOW: 0.7,
    DANGER_HIGH: 1.5
  },

  WEEKLY_VOLUME: {
    CAT1_MIN: 15,
    CAT1_MAX: 100,
    CAT2_MIN: 30,
    CAT2_MAX: 160
  },

  RECOVERY: {
    MIN_REST_DAYS_PER_WEEK: 1,
    MAX_CONSECUTIVE_HARD_DAYS: 2,
    MIN_RECOVERY_RATIO_COMPLIANCE: 0.8
  },

  AGE_MODIFIERS: {
    MASTERS_AGE: 40,
    VETERAN_AGE: 50,
    MASTERS_VOLUME_REDUCTION: 0.9,
    VETERAN_VOLUME_REDUCTION: 0.8,
    MASTERS_RECOVERY_BOOST: 1.1,
    VETERAN_RECOVERY_BOOST: 1.2
  },

  INTENSITY: {
    MAX_HARD_SESSIONS_PER_WEEK_CAT1: 2,
    MAX_HARD_SESSIONS_PER_WEEK_CAT2: 3,
    MIN_DAYS_BETWEEN_HARD: 1
  }
} as const;

export interface SafetyViolation {
  severity: 'warning' | 'error' | 'critical';
  rule: string;
  message: string;
  value?: number;
  limit?: number;
  recommendation?: string;
}

export interface SafetyCheck {
  passed: boolean;
  violations: SafetyViolation[];
  warnings: SafetyViolation[];
}

export function checkWeeklyPlanSafety(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  previousWeekMileage?: number
): SafetyCheck {
  const violations: SafetyViolation[] = [];
  const warnings: SafetyViolation[] = [];

  checkVolumeProgression(plan, athlete, previousWeekMileage, violations, warnings);
  checkRecoveryCompliance(plan, athlete, violations, warnings);
  checkIntensityDistribution(plan, athlete, violations, warnings);
  checkACWRSafety(plan, athlete, violations, warnings);
  checkAgeAppropriate(plan, athlete, violations, warnings);

  return {
    passed: violations.filter(v => v.severity === 'critical' || v.severity === 'error').length === 0,
    violations: violations.filter(v => v.severity === 'critical' || v.severity === 'error'),
    warnings: [...warnings, ...violations.filter(v => v.severity === 'warning')]
  };
}

function checkVolumeProgression(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  previousWeekMileage: number | undefined,
  violations: SafetyViolation[],
  warnings: SafetyViolation[]
): void {
  const currentMileage = plan.actualMileage || plan.targetMileage || 0;

  const category = athlete.category || 'Cat1';
  const limits = category === 'Cat1'
    ? { min: SAFETY_LIMITS.WEEKLY_VOLUME.CAT1_MIN, max: SAFETY_LIMITS.WEEKLY_VOLUME.CAT1_MAX }
    : { min: SAFETY_LIMITS.WEEKLY_VOLUME.CAT2_MIN, max: SAFETY_LIMITS.WEEKLY_VOLUME.CAT2_MAX };

  if (currentMileage < limits.min) {
    warnings.push({
      severity: 'warning',
      rule: 'MIN_WEEKLY_VOLUME',
      message: `Weekly volume (${currentMileage}km) is below recommended minimum for ${category}`,
      value: currentMileage,
      limit: limits.min,
      recommendation: `Consider increasing to at least ${limits.min}km/week`
    });
  }

  if (currentMileage > limits.max) {
    violations.push({
      severity: 'error',
      rule: 'MAX_WEEKLY_VOLUME',
      message: `Weekly volume (${currentMileage}km) exceeds safe maximum for ${category}`,
      value: currentMileage,
      limit: limits.max,
      recommendation: `Reduce volume to ${limits.max}km or less`
    });
  }

  if (previousWeekMileage !== undefined && previousWeekMileage > 0) {
    const increasePercent = ((currentMileage - previousWeekMileage) / previousWeekMileage) * 100;

    if (increasePercent > SAFETY_LIMITS.MAX_WEEKLY_INCREASE_PCT) {
      violations.push({
        severity: 'error',
        rule: 'MAX_WEEKLY_INCREASE',
        message: `Volume increase (${increasePercent.toFixed(1)}%) exceeds 10% rule`,
        value: increasePercent,
        limit: SAFETY_LIMITS.MAX_WEEKLY_INCREASE_PCT,
        recommendation: `Limit increase to ${(previousWeekMileage * 1.1).toFixed(1)}km`
      });
    }

    const decreasePercent = ((previousWeekMileage - currentMileage) / previousWeekMileage) * 100;
    if (decreasePercent > SAFETY_LIMITS.MAX_WEEKLY_DECREASE_PCT) {
      warnings.push({
        severity: 'warning',
        rule: 'MAX_WEEKLY_DECREASE',
        message: `Volume drop (${decreasePercent.toFixed(1)}%) may be too aggressive`,
        value: decreasePercent,
        limit: SAFETY_LIMITS.MAX_WEEKLY_DECREASE_PCT,
        recommendation: 'Consider more gradual taper'
      });
    }
  }
}

function checkRecoveryCompliance(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  violations: SafetyViolation[],
  warnings: SafetyViolation[]
): void {
  const restDays = plan.days.filter(d => !d.workout || d.workout.type === 'rest').length;

  if (restDays < SAFETY_LIMITS.RECOVERY.MIN_REST_DAYS_PER_WEEK) {
    violations.push({
      severity: 'critical',
      rule: 'MIN_REST_DAYS',
      message: `Insufficient rest days (${restDays}). Minimum 1 rest day required per week.`,
      value: restDays,
      limit: SAFETY_LIMITS.RECOVERY.MIN_REST_DAYS_PER_WEEK,
      recommendation: 'Add at least one complete rest day'
    });
  }

  let consecutiveHardDays = 0;
  let maxConsecutive = 0;

  for (const day of plan.days) {
    if (day.workout && (day.workout.intensity === 'high' || day.workout.type === 'long')) {
      consecutiveHardDays++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveHardDays);
    } else {
      consecutiveHardDays = 0;
    }
  }

  if (maxConsecutive > SAFETY_LIMITS.RECOVERY.MAX_CONSECUTIVE_HARD_DAYS) {
    violations.push({
      severity: 'error',
      rule: 'MAX_CONSECUTIVE_HARD',
      message: `Too many consecutive hard days (${maxConsecutive}). Maximum 2 allowed.`,
      value: maxConsecutive,
      limit: SAFETY_LIMITS.RECOVERY.MAX_CONSECUTIVE_HARD_DAYS,
      recommendation: 'Insert easy/recovery days between hard efforts'
    });
  }

  const recoveryRatio = athlete.recoveryRatio || '3:1';
  const [hard, easy] = recoveryRatio.split(':').map(Number);
  const expectedHardDays = Math.floor(7 / (hard + easy)) * hard;
  const actualHardDays = plan.days.filter(d =>
    d.workout && (d.workout.intensity === 'high' || d.workout.type === 'long')
  ).length;

  if (actualHardDays > expectedHardDays * 1.2) {
    warnings.push({
      severity: 'warning',
      rule: 'RECOVERY_RATIO',
      message: `Hard days (${actualHardDays}) exceed athlete's recovery ratio (${recoveryRatio})`,
      value: actualHardDays,
      limit: expectedHardDays,
      recommendation: `Reduce to ${expectedHardDays} hard days per week`
    });
  }
}

function checkIntensityDistribution(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  violations: SafetyViolation[],
  warnings: SafetyViolation[]
): void {
  const category = athlete.category || 'Cat1';
  const maxHardSessions = category === 'Cat1'
    ? SAFETY_LIMITS.INTENSITY.MAX_HARD_SESSIONS_PER_WEEK_CAT1
    : SAFETY_LIMITS.INTENSITY.MAX_HARD_SESSIONS_PER_WEEK_CAT2;

  const hardSessions = plan.days.filter(d =>
    d.workout && d.workout.intensity === 'high'
  ).length;

  if (hardSessions > maxHardSessions) {
    violations.push({
      severity: 'error',
      rule: 'MAX_HARD_SESSIONS',
      message: `Too many high-intensity sessions (${hardSessions}) for ${category}`,
      value: hardSessions,
      limit: maxHardSessions,
      recommendation: `Reduce to ${maxHardSessions} hard sessions per week`
    });
  }

  for (let i = 0; i < plan.days.length - 1; i++) {
    const today = plan.days[i];
    const tomorrow = plan.days[i + 1];

    if (today.workout?.intensity === 'high' && tomorrow.workout?.intensity === 'high') {
      warnings.push({
        severity: 'warning',
        rule: 'BACK_TO_BACK_HARD',
        message: `Back-to-back hard sessions on ${today.dayOfWeek} and ${tomorrow.dayOfWeek}`,
        recommendation: 'Consider inserting easy day between hard sessions'
      });
    }
  }
}

function checkACWRSafety(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  violations: SafetyViolation[],
  warnings: SafetyViolation[]
): void {
  if (!athlete.weeklyMileageHistory || athlete.weeklyMileageHistory.length < 4) {
    return;
  }

  const currentWeek = plan.actualMileage || 0;
  const last4Weeks = [...athlete.weeklyMileageHistory.slice(-3), currentWeek];
  const chronicLoad = athlete.weeklyMileageHistory.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const acuteLoad = last4Weeks.reduce((a, b) => a + b, 0) / 4;

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

  if (acwr > SAFETY_LIMITS.ACWR.DANGER_HIGH) {
    violations.push({
      severity: 'critical',
      rule: 'ACWR_TOO_HIGH',
      message: `ACWR (${acwr.toFixed(2)}) in danger zone - high injury risk`,
      value: acwr,
      limit: SAFETY_LIMITS.ACWR.MAX,
      recommendation: `Reduce weekly volume to bring ACWR below ${SAFETY_LIMITS.ACWR.MAX}`
    });
  } else if (acwr > SAFETY_LIMITS.ACWR.MAX) {
    warnings.push({
      severity: 'warning',
      rule: 'ACWR_HIGH',
      message: `ACWR (${acwr.toFixed(2)}) above optimal range`,
      value: acwr,
      limit: SAFETY_LIMITS.ACWR.MAX,
      recommendation: 'Consider slight volume reduction'
    });
  }

  if (acwr < SAFETY_LIMITS.ACWR.DANGER_LOW) {
    warnings.push({
      severity: 'warning',
      rule: 'ACWR_TOO_LOW',
      message: `ACWR (${acwr.toFixed(2)}) very low - may indicate detraining`,
      value: acwr,
      limit: SAFETY_LIMITS.ACWR.MIN,
      recommendation: 'Consider gradual volume increase if feeling recovered'
    });
  }
}

function checkAgeAppropriate(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  violations: SafetyViolation[],
  warnings: SafetyViolation[]
): void {
  if (!athlete.age) return;

  const currentMileage = plan.actualMileage || 0;
  const baselineCeiling = athlete.volumeCeiling || 100;

  let adjustedCeiling = baselineCeiling;
  if (athlete.age >= SAFETY_LIMITS.AGE_MODIFIERS.VETERAN_AGE) {
    adjustedCeiling = baselineCeiling * SAFETY_LIMITS.AGE_MODIFIERS.VETERAN_VOLUME_REDUCTION;
  } else if (athlete.age >= SAFETY_LIMITS.AGE_MODIFIERS.MASTERS_AGE) {
    adjustedCeiling = baselineCeiling * SAFETY_LIMITS.AGE_MODIFIERS.MASTERS_VOLUME_REDUCTION;
  }

  if (currentMileage > adjustedCeiling) {
    warnings.push({
      severity: 'warning',
      rule: 'AGE_APPROPRIATE_VOLUME',
      message: `Volume (${currentMileage}km) high for age ${athlete.age}`,
      value: currentMileage,
      limit: adjustedCeiling,
      recommendation: `Consider age-adjusted ceiling of ${adjustedCeiling.toFixed(0)}km/week`
    });
  }

  const restDays = plan.days.filter(d => !d.workout || d.workout.type === 'rest').length;
  let minRestDays = 1;
  if (athlete.age >= SAFETY_LIMITS.AGE_MODIFIERS.VETERAN_AGE) {
    minRestDays = 2;
  } else if (athlete.age >= SAFETY_LIMITS.AGE_MODIFIERS.MASTERS_AGE) {
    minRestDays = 2;
  }

  if (restDays < minRestDays) {
    warnings.push({
      severity: 'warning',
      rule: 'AGE_APPROPRIATE_RECOVERY',
      message: `For age ${athlete.age}, recommend ${minRestDays}+ rest days (currently ${restDays})`,
      value: restDays,
      limit: minRestDays,
      recommendation: `Add ${minRestDays - restDays} more rest day(s)`
    });
  }
}

export function calculateSafeVolumeRange(
  athlete: AthleteProfile,
  phase: TrainingPhase,
  previousWeekMileage?: number
): { min: number; max: number; optimal: number } {
  const category = athlete.category || 'Cat1';

  const baseLimits = category === 'Cat1'
    ? { min: SAFETY_LIMITS.WEEKLY_VOLUME.CAT1_MIN, max: SAFETY_LIMITS.WEEKLY_VOLUME.CAT1_MAX }
    : { min: SAFETY_LIMITS.WEEKLY_VOLUME.CAT2_MIN, max: SAFETY_LIMITS.WEEKLY_VOLUME.CAT2_MAX };

  let max = baseLimits.max;
  if (athlete.age) {
    if (athlete.age >= SAFETY_LIMITS.AGE_MODIFIERS.VETERAN_AGE) {
      max *= SAFETY_LIMITS.AGE_MODIFIERS.VETERAN_VOLUME_REDUCTION;
    } else if (athlete.age >= SAFETY_LIMITS.AGE_MODIFIERS.MASTERS_AGE) {
      max *= SAFETY_LIMITS.AGE_MODIFIERS.MASTERS_VOLUME_REDUCTION;
    }
  }

  if (previousWeekMileage !== undefined) {
    const maxIncrease = previousWeekMileage * (1 + SAFETY_LIMITS.MAX_WEEKLY_INCREASE_PCT / 100);
    max = Math.min(max, maxIncrease);
  }

  if (athlete.volumeCeiling) {
    max = Math.min(max, athlete.volumeCeiling);
  }

  const phaseModifiers: Record<TrainingPhase, number> = {
    transition: 0.6,
    base: 0.8,
    intensity: 0.9,
    specificity: 1.0,
    taper: 0.5,
    goal: 0.3
  };

  const optimal = max * phaseModifiers[phase];

  return {
    min: baseLimits.min,
    max: Math.round(max),
    optimal: Math.round(optimal)
  };
}

export function enforceMinimumRecovery(
  plan: WeeklyPlan,
  athlete: AthleteProfile
): WeeklyPlan {
  const modifiedPlan = { ...plan };
  const restDays = plan.days.filter(d => !d.workout || d.workout.type === 'rest').length;

  let requiredRestDays = SAFETY_LIMITS.RECOVERY.MIN_REST_DAYS_PER_WEEK;
  if (athlete.age && athlete.age >= SAFETY_LIMITS.AGE_MODIFIERS.VETERAN_AGE) {
    requiredRestDays = 2;
  } else if (athlete.age && athlete.age >= SAFETY_LIMITS.AGE_MODIFIERS.MASTERS_AGE) {
    requiredRestDays = 2;
  }

  if (restDays < requiredRestDays) {
    const daysToConvert = requiredRestDays - restDays;
    const easyDays = modifiedPlan.days.filter(d =>
      d.workout && d.workout.intensity === 'low' && d.workout.type !== 'long'
    );

    for (let i = 0; i < Math.min(daysToConvert, easyDays.length); i++) {
      const dayIndex = modifiedPlan.days.findIndex(d => d === easyDays[i]);
      modifiedPlan.days[dayIndex] = {
        ...modifiedPlan.days[dayIndex],
        workout: undefined,
        rationale: 'Converted to rest day for safety compliance'
      };
    }
  }

  return modifiedPlan;
}

export function isWithinSafeACWR(
  currentWeekMileage: number,
  weeklyMileageHistory: number[]
): boolean {
  if (weeklyMileageHistory.length < 4) return true;

  const last4Weeks = [...weeklyMileageHistory.slice(-3), currentWeekMileage];
  const chronicLoad = weeklyMileageHistory.slice(-4).reduce((a, b) => a + b, 0) / 4;
  const acuteLoad = last4Weeks.reduce((a, b) => a + b, 0) / 4;

  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

  return acwr >= SAFETY_LIMITS.ACWR.MIN && acwr <= SAFETY_LIMITS.ACWR.MAX;
}
