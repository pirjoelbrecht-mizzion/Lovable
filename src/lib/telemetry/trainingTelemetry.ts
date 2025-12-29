/**
 * ======================================================================
 * TRAINING TELEMETRY — Observability & Visibility
 * ======================================================================
 *
 * STEP 11A: Non-behavioral logging for operational safety
 *
 * This module logs training system events for visibility:
 * - Multi-session days (count, types, origins)
 * - Conflict resolutions (what was removed, why)
 * - Adaptation decisions (without changing logic)
 *
 * RULES:
 * ✅ Log only (no branching, no mutations)
 * ✅ Safe to call from any module
 * ✅ Zero overhead in production (console.info is built-in)
 * ❌ Never throw
 * ❌ Never mutate data
 * ❌ Never affect behavior
 */

import type { TrainingDay, TrainingSession } from '../types/training';

/**
 * Log a day with multiple sessions
 * No action taken - visibility only
 */
export function logMultiSessionDay(day: TrainingDay) {
  if (day.sessions.length <= 1) return;

  console.info('[Telemetry] Multi-session day', {
    date: day.date,
    sessionCount: day.sessions.length,
    types: day.sessions.map(s => s.type),
    origins: day.sessions.map(s => s.origin),
    locked: day.sessions.filter(s => s.locked).length,
  });
}

/**
 * Log when sessions are removed during conflict resolution
 * No action taken - visibility only
 */
export function logSessionsRemoved(
  date: string,
  removed: TrainingSession[],
  reason: string
) {
  if (!removed.length) return;

  console.info('[Telemetry] Sessions removed', {
    date,
    count: removed.length,
    sessions: removed.map(s => ({
      id: s.id,
      type: s.type,
      origin: s.origin,
      title: s.title,
    })),
    reason,
  });
}

/**
 * Log when a session is adapted (modified, not removed)
 * No action taken - visibility only
 */
export function logSessionAdapted(
  session: TrainingSession,
  change: string,
  reason: string
) {
  console.info('[Telemetry] Session adapted', {
    sessionId: session.id,
    type: session.type,
    change,
    reason,
  });
}

/**
 * Log adaptation result for a full day
 * No action taken - visibility only
 */
export function logDayAdaptation(
  date: string,
  sessionCount: number,
  adaptedCount: number,
  removedCount: number
) {
  if (adaptedCount === 0 && removedCount === 0) return;

  console.info('[Telemetry] Day adaptation complete', {
    date,
    totalSessions: sessionCount,
    adapted: adaptedCount,
    removed: removedCount,
  });
}

/**
 * Log when session count exceeds soft cap
 * No action taken - visibility only
 */
export function logSessionCountWarning(date: string, count: number, limit: number) {
  if (count <= limit) return;

  console.warn('[Telemetry] Session count warning', {
    date,
    count,
    limit,
    message: `Unusually high session count (${count} > ${limit})`,
  });
}

/**
 * Log architectural safety check violations
 * Used by softGuards to report issues without crashing
 */
export function logArchitecturalConcern(
  module: string,
  concern: string,
  context?: any
) {
  console.warn('[Telemetry] Architectural concern', {
    module,
    concern,
    ...context,
  });
}
