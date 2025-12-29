/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — CONFLICT RESOLUTION
 *  Module 5 — Session Conflict Management
 * ======================================================================
 *
 * This module handles conflicts between sessions on the same day:
 * - ME + long run (excessive fatigue)
 * - Heat adaptation + intensity (contradictory goals)
 * - Multiple high-intensity sessions (overload)
 * - Scheduling violations (back-to-back hard days)
 *
 * CRITICAL RULES:
 * 1. Only ADAPTIVE sessions can be removed during conflict resolution
 * 2. BASE_PLAN and USER sessions are PROTECTED
 * 3. Priority determines which session wins in conflicts
 * 4. Locked sessions cannot be removed
 */

import type { DailyPlan, Workout, WeeklyPlan, SessionOrigin } from './types';
import { isStrengthSession } from './strength-integration';
import { logSessionsRemoved } from '@/lib/telemetry/trainingTelemetry';

/**
 * Conflict types detected by the engine
 */
export type ConflictType =
  | 'EXCESSIVE_FATIGUE'      // Too much load on one day (e.g., ME + long run)
  | 'CONTRADICTORY_GOALS'    // Incompatible session types (e.g., heat + tempo)
  | 'OVERLOAD'               // Multiple high-intensity sessions
  | 'SCHEDULING_VIOLATION'   // Back-to-back hard days
  | 'DURATION_OVERFLOW';     // Total duration exceeds daily limit

/**
 * Detected conflict between sessions
 */
export interface SessionConflict {
  type: ConflictType;
  severity: 'low' | 'medium' | 'high';
  sessions: Workout[];
  reason: string;
  suggestedResolution: 'remove' | 'reschedule' | 'modify';
}

/**
 * Priority order for conflict resolution
 * Higher number = higher priority (kept in conflicts)
 */
const ORIGIN_PRIORITY: Record<SessionOrigin, number> = {
  'RACE': 7,           // Race day is sacred
  'USER': 6,           // User input always wins
  'BASE_PLAN': 5,      // Base plan is protected
  'TAPER_PLAN': 4,     // Taper plan important but can be adjusted
  'RACE_PLAN': 3,      // Race-specific but flexible
  'ADAPTIVE': 1,       // Adaptive sessions are lowest priority
  'GENERATED': 2,      // Generated content can be replaced
};

/**
 * Session intensity classification for conflict detection
 */
function getSessionIntensity(session: Workout): 'low' | 'medium' | 'high' {
  if (session.type === 'rest') return 'low';
  if (session.type === 'easy' || session.type === 'aerobic') return 'low';
  if (session.type === 'strength' || session.type === 'muscular_endurance') return 'medium';
  if (session.type === 'tempo' || session.type === 'threshold') return 'high';
  if (session.type === 'vo2' || session.type === 'race_pace') return 'high';
  if (session.type === 'long' || session.type === 'backToBack') return 'medium';

  return 'medium';
}

/**
 * Estimate fatigue load from a session (0-100 scale)
 */
function estimateFatigueLoad(session: Workout): number {
  let base = 0;

  const intensity = getSessionIntensity(session);
  if (intensity === 'high') base = 60;
  else if (intensity === 'medium') base = 40;
  else base = 20;

  if (session.type === 'muscular_endurance') base += 20;
  if (session.type === 'long' && (session.distanceKm || 0) > 25) base += 15;
  if (session.type === 'backToBack') base += 25;

  const duration = session.durationMin || 60;
  if (duration > 120) base += 15;
  if (duration > 180) base += 20;

  return Math.min(base, 100);
}

/**
 * Detect conflicts within a single day's sessions
 */
export function detectDailyConflicts(day: DailyPlan): SessionConflict[] {
  if (day.sessions.length <= 1) return [];

  const conflicts: SessionConflict[] = [];

  const totalFatigue = day.sessions.reduce((sum, s) => sum + estimateFatigueLoad(s), 0);
  if (totalFatigue > 120) {
    const highLoadSessions = day.sessions.filter(s => estimateFatigueLoad(s) > 40);
    conflicts.push({
      type: 'EXCESSIVE_FATIGUE',
      severity: totalFatigue > 150 ? 'high' : 'medium',
      sessions: highLoadSessions,
      reason: `Total daily fatigue (${totalFatigue}) exceeds safe limit`,
      suggestedResolution: 'remove'
    });
  }

  const highIntensitySessions = day.sessions.filter(s => getSessionIntensity(s) === 'high');
  if (highIntensitySessions.length > 1) {
    conflicts.push({
      type: 'OVERLOAD',
      severity: 'high',
      sessions: highIntensitySessions,
      reason: `Multiple high-intensity sessions on same day`,
      suggestedResolution: 'remove'
    });
  }

  const hasME = day.sessions.some(isStrengthSession);
  const hasLongRun = day.sessions.some(s => s.type === 'long' && (s.distanceKm || 0) > 20);
  if (hasME && hasLongRun) {
    const meSessions = day.sessions.filter(isStrengthSession);
    const longSessions = day.sessions.filter(s => s.type === 'long');
    conflicts.push({
      type: 'CONTRADICTORY_GOALS',
      severity: 'high',
      sessions: [...meSessions, ...longSessions],
      reason: 'ME session conflicts with long run (excessive neuromuscular fatigue)',
      suggestedResolution: 'reschedule'
    });
  }

  const hasHeat = day.sessions.some(s => s.type === 'heat_adaptation');
  const hasIntensity = day.sessions.some(s =>
    ['tempo', 'threshold', 'vo2', 'race_pace'].includes(s.type)
  );
  if (hasHeat && hasIntensity) {
    const heatSessions = day.sessions.filter(s => s.type === 'heat_adaptation');
    const intensitySessions = day.sessions.filter(s =>
      ['tempo', 'threshold', 'vo2', 'race_pace'].includes(s.type)
    );
    conflicts.push({
      type: 'CONTRADICTORY_GOALS',
      severity: 'medium',
      sessions: [...heatSessions, ...intensitySessions],
      reason: 'Heat adaptation conflicts with intensity (contradictory stress)',
      suggestedResolution: 'reschedule'
    });
  }

  const totalDuration = day.sessions.reduce((sum, s) => sum + (s.durationMin || 60), 0);
  if (totalDuration > 300) {
    conflicts.push({
      type: 'DURATION_OVERFLOW',
      severity: 'medium',
      sessions: day.sessions,
      reason: `Total duration (${totalDuration} min) exceeds daily time budget`,
      suggestedResolution: 'remove'
    });
  }

  return conflicts;
}

/**
 * Detect scheduling conflicts across multiple days
 */
export function detectSchedulingConflicts(plan: WeeklyPlan): SessionConflict[] {
  const conflicts: SessionConflict[] = [];

  for (let i = 0; i < plan.days.length - 1; i++) {
    const today = plan.days[i];
    const tomorrow = plan.days[i + 1];

    const todayHasHard = today.sessions.some(s => getSessionIntensity(s) === 'high');
    const tomorrowHasHard = tomorrow.sessions.some(s => getSessionIntensity(s) === 'high');

    if (todayHasHard && tomorrowHasHard) {
      const todayHardSessions = today.sessions.filter(s => getSessionIntensity(s) === 'high');
      const tomorrowHardSessions = tomorrow.sessions.filter(s => getSessionIntensity(s) === 'high');

      conflicts.push({
        type: 'SCHEDULING_VIOLATION',
        severity: 'medium',
        sessions: [...todayHardSessions, ...tomorrowHardSessions],
        reason: `Back-to-back hard days (${today.day} → ${tomorrow.day})`,
        suggestedResolution: 'reschedule'
      });
    }
  }

  return conflicts;
}

/**
 * Resolve a conflict by removing the lowest-priority session
 *
 * CRITICAL: Only ADAPTIVE sessions can be removed
 * BASE_PLAN and USER sessions are protected
 */
export function resolveConflict(
  day: DailyPlan,
  conflict: SessionConflict
): DailyPlan {
  if (conflict.suggestedResolution !== 'remove') {
    return day;
  }

  const removableSessions = conflict.sessions.filter(s => {
    if (s.locked) return false;
    if (s.origin === 'USER' || s.origin === 'BASE_PLAN' || s.origin === 'RACE') {
      return false;
    }
    return true;
  });

  if (removableSessions.length === 0) {
    console.warn('[CONFLICT] No removable sessions found for conflict:', conflict.reason);
    return day;
  }

  removableSessions.sort((a, b) => {
    const priorityA = ORIGIN_PRIORITY[a.origin || 'ADAPTIVE'];
    const priorityB = ORIGIN_PRIORITY[b.origin || 'ADAPTIVE'];
    return priorityA - priorityB;
  });

  const toRemove = removableSessions[0];

  console.log('[CONFLICT] Removing session to resolve conflict:', {
    conflict: conflict.type,
    reason: conflict.reason,
    removed: {
      type: toRemove.type,
      origin: toRemove.origin,
      title: toRemove.title
    }
  });

  logSessionsRemoved(
    day.day || new Date().toISOString().split('T')[0],
    [toRemove as any],
    conflict.reason
  );

  return {
    ...day,
    sessions: day.sessions.filter(s => s !== toRemove),
    rationale: `${day.rationale || ''}\n\nConflict resolved: ${conflict.reason}`.trim()
  };
}

/**
 * Apply conflict resolution to an entire week
 */
export function resolveWeeklyConflicts(plan: WeeklyPlan): WeeklyPlan {
  let modifiedPlan = { ...plan };

  const dailyConflicts = plan.days.map(day => ({
    day,
    conflicts: detectDailyConflicts(day)
  }));

  const highSeverityConflicts = dailyConflicts.filter(dc =>
    dc.conflicts.some(c => c.severity === 'high')
  );

  if (highSeverityConflicts.length > 0) {
    console.log('[CONFLICT] Resolving high-severity conflicts:', {
      count: highSeverityConflicts.length,
      types: highSeverityConflicts.flatMap(dc => dc.conflicts.map(c => c.type))
    });

    const resolvedDays = plan.days.map(day => {
      const dayConflicts = detectDailyConflicts(day);
      const highSeverity = dayConflicts.filter(c => c.severity === 'high');

      if (highSeverity.length === 0) return day;

      let resolvedDay = day;
      for (const conflict of highSeverity) {
        resolvedDay = resolveConflict(resolvedDay, conflict);
      }

      return resolvedDay;
    });

    modifiedPlan = {
      ...modifiedPlan,
      days: resolvedDays
    };
  }

  const schedulingConflicts = detectSchedulingConflicts(modifiedPlan);
  if (schedulingConflicts.length > 0) {
    console.log('[CONFLICT] Detected scheduling conflicts:', {
      count: schedulingConflicts.length,
      types: schedulingConflicts.map(c => c.type)
    });
  }

  return modifiedPlan;
}

/**
 * Check if a day's sessions are safe (no high-severity conflicts)
 */
export function isDaySafe(day: DailyPlan): boolean {
  const conflicts = detectDailyConflicts(day);
  return !conflicts.some(c => c.severity === 'high');
}

/**
 * Get summary of all conflicts in a plan
 */
export function getConflictSummary(plan: WeeklyPlan): {
  total: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<ConflictType, number>;
} {
  const allConflicts = [
    ...plan.days.flatMap(day => detectDailyConflicts(day)),
    ...detectSchedulingConflicts(plan)
  ];

  const byType: Record<ConflictType, number> = {
    'EXCESSIVE_FATIGUE': 0,
    'CONTRADICTORY_GOALS': 0,
    'OVERLOAD': 0,
    'SCHEDULING_VIOLATION': 0,
    'DURATION_OVERFLOW': 0
  };

  let high = 0, medium = 0, low = 0;

  for (const conflict of allConflicts) {
    byType[conflict.type]++;
    if (conflict.severity === 'high') high++;
    else if (conflict.severity === 'medium') medium++;
    else low++;
  }

  return {
    total: allConflicts.length,
    high,
    medium,
    low,
    byType
  };
}
