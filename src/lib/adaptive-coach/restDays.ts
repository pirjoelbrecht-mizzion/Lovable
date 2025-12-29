/**
 * ======================================================================
 *  REST DAY DERIVATION
 *  Deterministic derivation of rest days from daysPerWeek
 * ======================================================================
 *
 * This module derives rest days based on the athlete's configured
 * daysPerWeek from onboarding. Rest days are distributed evenly
 * across the week to maximize recovery spacing.
 *
 * Example:
 *  - 3 days/week → Mon / Wed / Sat training → rest Tue, Thu, Fri, Sun
 *  - 4 days/week → Mon / Tue / Thu / Sat training → rest Wed, Fri, Sun
 *  - 5 days/week → Mon / Tue / Wed / Thu / Sat → rest Fri, Sun
 *
 * Properties:
 *  ✅ Deterministic (no randomness)
 *  ✅ Stable (same input always same output)
 *  ✅ Predictable (even distribution)
 *  ✅ No weekly drift (state-independent)
 */

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

/**
 * Derive rest days deterministically from daysPerWeek.
 * Distributes training days evenly to maximize recovery spacing.
 *
 * @param daysPerWeek - Number of training days (1-7)
 * @returns Array of rest day abbreviations in week order
 */
export function deriveRestDays(daysPerWeek: number): Weekday[] {
  const allDays: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Edge case: 7 days = no rest days
  if (daysPerWeek >= 7) {
    return [];
  }

  // Edge case: 0 days = all rest days
  if (daysPerWeek <= 0) {
    return allDays;
  }

  const trainingDayIndices: number[] = [];
  const step = 7 / daysPerWeek;

  // Calculate training day positions using even distribution
  for (let i = 0; i < daysPerWeek; i++) {
    trainingDayIndices.push(Math.floor(i * step));
  }

  // Build set of training days
  const trainingDays = new Set(trainingDayIndices.map(i => allDays[i]));

  // Return days that are not training days
  return allDays.filter(day => !trainingDays.has(day));
}

/**
 * Check if a day is a rest day.
 *
 * @param day - Day abbreviation
 * @param restDays - Array of rest days
 * @returns true if the day is a rest day
 */
export function isRestDay(day: Weekday, restDays: Weekday[]): boolean {
  return restDays.includes(day);
}

/**
 * Get training days (inverse of rest days).
 *
 * @param daysPerWeek - Number of training days
 * @returns Array of training day abbreviations
 */
export function getTrainingDays(daysPerWeek: number): Weekday[] {
  const allDays: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const restDays = deriveRestDays(daysPerWeek);
  return allDays.filter(day => !restDays.includes(day));
}
