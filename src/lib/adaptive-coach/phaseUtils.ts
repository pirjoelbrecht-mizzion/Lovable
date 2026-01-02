/**
 * ======================================================================
 *  PHASE DETERMINATION UTILITIES
 * ======================================================================
 *
 * Maps days to race to appropriate training phases for microcycle generation.
 * Used by adaptive context builder to determine which plan generator to use.
 */

import type { TrainingPhase } from './types';

/**
 * Determine training phase based on days to race
 *
 * Phase boundaries:
 * - 0-7 days: taper (race week)
 * - 8-21 days: specificity (race-specific sharpening)
 * - 22-56 days: intensity (tempo, VO2, threshold work)
 * - 57-112 days: base (aerobic development)
 * - 113+ days or no race: base (default to aerobic foundation)
 */
export function determinePhaseFromDaysToRace(daysToRace: number | null | undefined): TrainingPhase {
  // No race or very distant race → base building
  if (daysToRace === null || daysToRace === undefined || daysToRace > 112) {
    return 'base';
  }

  // Taper phase (final week)
  if (daysToRace <= 7) {
    return 'taper';
  }

  // Race specificity phase (sharpening)
  if (daysToRace <= 21) {
    return 'specificity';
  }

  // Intensity phase (speed work, threshold)
  if (daysToRace <= 56) {
    return 'intensity';
  }

  // Base building phase (aerobic development)
  return 'base';
}

/**
 * Get phase name for display
 */
export function getPhaseName(phase: TrainingPhase): string {
  const names: Record<TrainingPhase, string> = {
    transition: 'Transition',
    base: 'Base Building',
    intensity: 'Intensity',
    specificity: 'Race Specificity',
    taper: 'Taper',
    goal: 'Race Week',
  };
  return names[phase];
}

/**
 * Check if athlete is in maintenance mode (no race goal)
 */
export function isMaintenanceMode(daysToRace: number | null | undefined): boolean {
  return daysToRace === null || daysToRace === undefined || daysToRace > 112;
}
