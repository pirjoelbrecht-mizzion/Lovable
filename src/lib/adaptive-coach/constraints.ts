/**
 * ======================================================================
 *  TRAINING CONSTRAINTS
 *  Structural and volume constraints for plan generation
 * ======================================================================
 *
 * This module defines the constraints that govern weekly plan generation:
 * - How many days per week to train
 * - Which days are rest days (derived from daysPerWeek)
 * - Target volume ranges (hours, distance, vertical)
 * - Maximum load per day
 *
 * These constraints are derived from:
 * - Onboarding data (daysPerWeek)
 * - Athlete profile (volume targets)
 * - Phase-specific goals
 */

import type { Weekday } from './restDays';

/**
 * Training constraints for plan generation and validation.
 *
 * Properties:
 *  - daysPerWeek: Number of training days (1-7)
 *  - restDays: Days that must have no training sessions
 *  - targetHours: Min/max weekly training hours
 *  - maxVertPerDay: Maximum vertical gain in a single day
 */
export interface TrainingConstraints {
  /**
   * Number of training days per week (from onboarding).
   * Typical range: 3-6 for endurance athletes
   */
  daysPerWeek: number;

  /**
   * Days that are configured as rest days.
   * Derived deterministically from daysPerWeek.
   * Auto-fill must never place sessions on these days.
   */
  restDays?: Weekday[];

  /**
   * Target weekly training time range (hours).
   * Used for volume balancing across the week.
   */
  targetHoursMin?: number;
  targetHoursMax?: number;

  /**
   * Maximum vertical gain per single day.
   * Prevents excessive mountain training on one day.
   * Typical range: 1500-3000m depending on athlete level
   */
  maxVertPerDay?: number;

  /**
   * Maximum weekly vertical gain.
   * Prevents overreaching on terrain-heavy weeks.
   */
  maxVertPerWeek?: number;
}

/**
 * Validation error for constraint violations.
 */
export interface ConstraintViolation {
  code:
    | 'rest-day-violation'
    | 'over-time-volume'
    | 'over-vertical-load'
    | 'insufficient-training-days'
    | 'insufficient-recovery';
  severity: 'warning' | 'error';
  message: string;
  dayOrWeek?: string;
  value?: number;
  limit?: number;
}

/**
 * Build constraints from athlete profile and goals.
 * Used to initialize constraint-checking in validation and auto-fill.
 */
export function buildConstraints(
  daysPerWeek: number,
  restDays?: Weekday[],
  targetHoursMin?: number,
  targetHoursMax?: number,
  maxVertPerDay?: number,
  maxVertPerWeek?: number
): TrainingConstraints {
  return {
    daysPerWeek,
    restDays,
    targetHoursMin,
    targetHoursMax,
    maxVertPerDay,
    maxVertPerWeek,
  };
}
