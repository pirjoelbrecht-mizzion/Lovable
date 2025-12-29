/**
 * ======================================================================
 *  PLAN VALIDATOR
 *  Validates weekly plans against training constraints
 * ======================================================================
 *
 * This module performs structural validation on weekly plans:
 * - Rest days must not contain any training sessions
 * - Training days should have at least one session
 * - Volume targets should be achievable without violating structure
 * - Load per day should not exceed limits
 *
 * Validation flags are non-blocking but inform auto-fill behavior.
 * Critical rule: Rest days always win over volume targets.
 */

import type { WeeklyPlan, DailyPlan } from './types';
import type { TrainingConstraints, ConstraintViolation } from './constraints';
import { isRestDay } from './restDays';

/**
 * Validation result for a weekly plan.
 *
 * Properties:
 *  - isValid: true if plan meets critical structural requirements
 *  - flags: Array of violations (errors and warnings)
 *  - sessionCount: Total sessions in plan
 *  - trainingDayCount: Days with at least one session
 *  - restDayCount: Days with no sessions
 */
export interface PlanValidationResult {
  isValid: boolean;
  flags: ConstraintViolation[];
  sessionCount: number;
  trainingDayCount: number;
  restDayCount: number;
  summary: string;
}

/**
 * Validate a weekly plan against training constraints.
 *
 * Checks:
 *  1. Rest days have no sessions (severity: error)
 *  2. Training days have at least one session (warning only)
 *  3. Plan has correct number of training days (info)
 *  4. Load per day is reasonable (warning)
 *
 * @param plan - Weekly plan to validate
 * @param constraints - Training constraints (daysPerWeek, restDays, etc.)
 * @returns Validation result with flags and summary
 */
export function validateWeeklyPlan(
  plan: WeeklyPlan,
  constraints: TrainingConstraints
): PlanValidationResult {
  const flags: ConstraintViolation[] = [];

  let sessionCount = 0;
  let trainingDayCount = 0;
  let restDayCount = 0;

  // Check each day
  if (plan.days && plan.days.length > 0) {
    for (const day of plan.days) {
      const sessionCountForDay = day.sessions?.length ?? 0;
      sessionCount += sessionCountForDay;

      if (sessionCountForDay > 0) {
        trainingDayCount++;
      } else {
        restDayCount++;
      }

      // CRITICAL: Rest day violation check
      if (constraints.restDays && isRestDay(day.day as any, constraints.restDays)) {
        if (sessionCountForDay > 0) {
          flags.push({
            code: 'rest-day-violation',
            severity: 'error',
            message: `${day.day} is configured as a rest day but contains ${sessionCountForDay} session(s).`,
            dayOrWeek: day.day,
            value: sessionCountForDay,
          });
        }
      }
    }
  }

  // Check if plan has expected number of training days
  if (trainingDayCount !== constraints.daysPerWeek) {
    flags.push({
      code: 'insufficient-training-days',
      severity: 'warning',
      message: `Plan has ${trainingDayCount} training days but daysPerWeek is set to ${constraints.daysPerWeek}.`,
      value: trainingDayCount,
      limit: constraints.daysPerWeek,
    });
  }

  // Check vertical load per day (if constraint exists)
  if (constraints.maxVertPerDay) {
    for (const day of plan.days || []) {
      const vertForDay = day.sessions?.reduce((sum, s) => sum + (s.verticalGain ?? 0), 0) ?? 0;

      if (vertForDay > constraints.maxVertPerDay) {
        flags.push({
          code: 'over-vertical-load',
          severity: 'warning',
          message: `${day.day} exceeds max vertical load: ${Math.round(vertForDay)}m > ${constraints.maxVertPerDay}m.`,
          dayOrWeek: day.day,
          value: vertForDay,
          limit: constraints.maxVertPerDay,
        });
      }
    }
  }

  // Plan is valid if no rest-day violations
  const hasRestDayViolations = flags.some(f => f.code === 'rest-day-violation');
  const isValid = !hasRestDayViolations;

  // Build summary
  const summary = `${trainingDayCount}/${constraints.daysPerWeek} training days, ` +
                  `${sessionCount} sessions, ` +
                  `${flags.filter(f => f.severity === 'error').length} errors`;

  return {
    isValid,
    flags,
    sessionCount,
    trainingDayCount,
    restDayCount,
    summary,
  };
}

/**
 * Check if a day is a rest day in the plan.
 *
 * @param plan - Weekly plan
 * @param dayIndex - Day index (0-6)
 * @returns true if day has no sessions
 */
export function isRestDayInPlan(plan: WeeklyPlan, dayIndex: number): boolean {
  const day = plan.days?.[dayIndex];
  return !day || (day.sessions?.length ?? 0) === 0;
}

/**
 * Get days that are rest days in the plan.
 *
 * @param plan - Weekly plan
 * @returns Array of day indices that are rest days
 */
export function getRestDaysInPlan(plan: WeeklyPlan): number[] {
  const restDays: number[] = [];

  for (let i = 0; i < (plan.days?.length ?? 0); i++) {
    if (isRestDayInPlan(plan, i)) {
      restDays.push(i);
    }
  }

  return restDays;
}

/**
 * Get total volume metrics from a plan.
 *
 * @param plan - Weekly plan
 * @returns Object with totalKm, totalVert, totalMinutes
 */
export function getPlanVolumeMetrics(plan: WeeklyPlan) {
  let totalKm = 0;
  let totalVert = 0;
  let totalMinutes = 0;

  for (const day of plan.days || []) {
    for (const session of day.sessions || []) {
      totalKm += session.distanceKm ?? 0;
      totalVert += session.verticalGain ?? 0;
      totalMinutes += session.durationMin ?? 0;
    }
  }

  return { totalKm, totalVert, totalMinutes };
}
