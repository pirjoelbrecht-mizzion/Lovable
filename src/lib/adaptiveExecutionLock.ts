/**
 * Adaptive Execution Lock - Ensures Module 4 runs only once per week
 *
 * Prevents duplicate adaptive engine executions by:
 * - Tracking the last week ID that was processed
 * - Checking execution eligibility before running
 * - Persisting lock state across reloads
 */

import { load, save } from '@/utils/storage';

const LOCK_KEY = 'adaptive:executionLock';
const WEEKLY_KEY_KEY = 'adaptive:currentWeekKey';

function getWeekKey(date = new Date()): string {
  // Get Monday of current week as week identifier
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

interface ExecutionLockState {
  weekKey: string;
  timestamp: number;
  userId: string | null;
}

export function makeExecutionLockKey(weekKey: string, userId: string | null): string {
  if (userId) {
    return `${userId}:${weekKey}`;
  }
  return `anon:${weekKey}`;
}

export function hasRunAdaptiveForWeek(userId: string | null): boolean {
  const currentWeekKey = getWeekKey();
  const lockKey = makeExecutionLockKey(currentWeekKey, userId);

  const state = load<ExecutionLockState>(LOCK_KEY, null);
  if (!state) {
    console.debug('[Adaptive Lock] No lock found, first run of week');
    return false;
  }

  const matches = state.weekKey === currentWeekKey && makeExecutionLockKey(state.weekKey, state.userId) === lockKey;

  if (matches) {
    console.debug('[Adaptive Lock] Already executed for this week', {
      weekKey: currentWeekKey,
      lastExecution: new Date(state.timestamp).toISOString(),
      hoursAgo: Math.round((Date.now() - state.timestamp) / 3600000),
    });
    return true;
  }

  console.debug('[Adaptive Lock] Week changed or user changed, eligible for execution');
  return false;
}

export function lockAdaptiveExecutionForWeek(userId: string | null): void {
  const weekKey = getWeekKey();
  const state: ExecutionLockState = {
    weekKey,
    timestamp: Date.now(),
    userId,
  };

  console.debug('[Adaptive Lock] Locking execution for week', {
    weekKey,
    userId: userId ? 'authenticated' : 'anonymous',
  });

  save(LOCK_KEY, state);
  save(WEEKLY_KEY_KEY, weekKey);
}

export function resetAdaptiveExecutionLock(): void {
  console.debug('[Adaptive Lock] Resetting execution lock');
  save(LOCK_KEY, null);
  save(WEEKLY_KEY_KEY, null);
}

export function shouldTriggerAdaptiveExecution(userId: string | null): {
  should: boolean;
  reason: string;
} {
  // Check if already executed this week
  if (hasRunAdaptiveForWeek(userId)) {
    return {
      should: false,
      reason: 'Already executed for this week',
    };
  }

  return {
    should: true,
    reason: 'First execution of week or user changed',
  };
}

export function getLastAdaptiveWeek(): string | null {
  return load<string>(WEEKLY_KEY_KEY, null);
}
