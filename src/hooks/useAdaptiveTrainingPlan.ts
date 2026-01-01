/**
 * ======================================================================
 *  USE ADAPTIVE TRAINING PLAN HOOK
 *  Wraps Module 4 logic with automatic triggers and state management
 * ======================================================================
 *
 * This hook orchestrates the entire Module 4 workflow:
 * - Builds adaptive context from all data sources
 * - Invokes the Adaptive Decision Engine
 * - Stores decisions in Supabase
 * - Syncs final plan to localStorage
 * - Provides trigger mechanisms for automatic execution
 * - Tracks execution state and timing
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { computeTrainingAdjustment, logAdaptiveDecision, type AdaptiveDecision } from '@/engine';
import { buildAdaptiveContext, shouldRefreshContext, markContextRefreshed, convertToLocalStoragePlan } from '@/lib/adaptiveContextBuilder';
import { getCurrentUserId } from '@/lib/supabase';
import { load, save } from '@/utils/storage';
import type { WeeklyPlan as AdaptiveWeeklyPlan } from '@/lib/adaptive-coach/types';
import { getWeekPlan, saveWeekPlan, type WeekPlan as LocalStorageWeekPlan, isEmptyLockedAdaptivePlan, clearStoredWeekPlan } from '@/lib/plan';
import { hasRunAdaptiveForWeek, lockAdaptiveExecutionForWeek, clearAdaptiveExecutionLock } from '@/lib/adaptiveExecutionLock';

export interface UseAdaptiveTrainingPlanOptions {
  /**
   * Enable automatic execution on data changes
   */
  autoExecute?: boolean;

  /**
   * Enable daily execution check (deprecated - no longer used)
   */
  dailyExecution?: boolean;

  /**
   * Callback when plan is adjusted
   */
  onPlanAdjusted?: (decision: AdaptiveDecision, plan: LocalStorageWeekPlan) => void;

  /**
   * Callback when error occurs
   */
  onError?: (error: Error) => void;
}

export interface UseAdaptiveTrainingPlanResult {
  /**
   * Current adjusted plan (or null if not yet computed)
   */
  adjustedPlan: LocalStorageWeekPlan | null;

  /**
   * Latest adaptive decision
   */
  decision: AdaptiveDecision | null;

  /**
   * Is Module 4 currently running
   */
  isExecuting: boolean;

  /**
   * Last execution timestamp
   */
  lastExecuted: Date | null;

  /**
   * Error message if execution failed
   */
  error: string | null;

  /**
   * Manually trigger Module 4 execution
   */
  execute: (basePlan?: LocalStorageWeekPlan | AdaptiveWeeklyPlan, bypassLock?: boolean) => Promise<AdaptiveDecision | null>;

  /**
   * Refresh the adaptive context and re-execute
   */
  refresh: () => Promise<void>;

  /**
   * Check if execution is needed (based on triggers)
   */
  needsExecution: boolean;
}

/**
 * Hook to use Module 4 Adaptive Decision Engine for training plan adjustments
 */
export function useAdaptiveTrainingPlan(
  options: UseAdaptiveTrainingPlanOptions = {}
): UseAdaptiveTrainingPlanResult {
  const {
    autoExecute = true,
    dailyExecution = true,
    onPlanAdjusted,
    onError,
  } = options;

  const [adjustedPlan, setAdjustedPlan] = useState<LocalStorageWeekPlan | null>(null);
  const [decision, setDecision] = useState<AdaptiveDecision | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExecuted, setLastExecuted] = useState<Date | null>(() => {
    const timestamp = load<number>('module4LastExecution', 0);
    return timestamp > 0 ? new Date(timestamp) : null;
  });
  const [needsExecution, setNeedsExecution] = useState(false);

  const executionRef = useRef(false);

  /**
   * Main execution function - runs Module 4
   * @param basePlan Optional base plan to work with
   * @param bypassLock If true, skip the per-week lock check (for user refresh)
   */
  const execute = useCallback(async (basePlan?: LocalStorageWeekPlan | AdaptiveWeeklyPlan, bypassLock?: boolean): Promise<AdaptiveDecision | null> => {
    // Prevent concurrent executions
    if (executionRef.current) {
      console.log('[Module 4] Execution already in progress, skipping');
      return null;
    }

    try {
      executionRef.current = true;
      setIsExecuting(true);
      setError(null);

      console.log('[Module 4] Starting execution...', { bypassLock });

      // Get user ID for checks
      let userId = await getCurrentUserId();

      // Check per-week execution lock (unless bypassed by user refresh)
      if (!bypassLock) {
        if (hasRunAdaptiveForWeek(userId)) {
          console.log('[Module 4] Already executed for this week, skipping');
          setIsExecuting(false);
          executionRef.current = false;
          return null;
        }
      } else {
        console.log('[Module 4] Bypassing weekly lock for user-initiated refresh');
      }

      // Get base plan
      const plan = basePlan || getWeekPlan();

      // Validate base plan before proceeding
      if (!plan || plan.length !== 7) {
        console.error('[Module 4] Invalid base plan, cannot execute:', plan?.length, 'days');
        throw new Error(`Cannot execute with invalid base plan: ${plan?.length || 0} days`);
      }

      // Build adaptive context
      console.log('[Module 4] Building adaptive context...');
      const context = await buildAdaptiveContext(plan);

      // Run Module 4 decision engine
      console.log('[Module 4] Computing training adjustment...');
      const newDecision = computeTrainingAdjustment(context);

      // Log to Supabase if authenticated
      if (userId) {
        // Log decision to Supabase
        console.log('[Module 4] Logging decision to database...');
        const logged = await logAdaptiveDecision(userId, newDecision, context);
        if (!logged) {
          console.warn('[Module 4] Failed to log decision to database');
        }
      } else {
        console.log('[Module 4] User not authenticated, skipping database logging');
      }

      // Extract adjusted plan from decision and convert to localStorage format
      // Pass the original plan to preserve additional sessions (e.g., strength)
      const modifiedPlan = newDecision.modifiedPlan;
      const localStoragePlan = convertToLocalStoragePlan(modifiedPlan, plan);

      // Mark plan with adaptive source and timestamp to prevent overwrites
      let adaptivePlan = localStoragePlan.map((day, idx) => ({
        ...day,
        planSource: 'adaptive' as const,
        planAppliedAt: Date.now(),
      }));

      // Validate plan before saving - CRITICAL to prevent clearing valid plans
      if (!adaptivePlan || adaptivePlan.length !== 7) {
        console.error('[Module 4] Generated invalid plan, refusing to save:', adaptivePlan?.length, 'days');
        throw new Error(`Invalid plan generated: ${adaptivePlan?.length || 0} days instead of 7`);
      }

      // Rest days (days with empty sessions) are now valid
      // Validate that we have a proper 7-day plan structure
      const validDays = adaptivePlan.filter(day => day && (day.sessions !== undefined && Array.isArray(day.sessions)));
      console.log('[Module 4] Plan structure validated:', {
        totalDays: adaptivePlan.length,
        daysWithSessions: validDays.filter(d => d.sessions.length > 0).length,
        restDays: validDays.filter(d => d.sessions.length === 0).length,
      });

      // 1️⃣ CRITICAL: Detect empty adaptive plans
      // Count TOTAL sessions (not by type - type-based detection is fragile)
      const totalSessions = adaptivePlan.reduce((sum, day) => {
        return sum + (day.sessions?.length ?? 0);
      }, 0);

      console.log('[Module 4] Plan has', totalSessions, 'total sessions across 7 days');

      // Only reject plans with NO sessions at all
      // If adaptive engine generated sessions, trust them (even if all are "rest" type)
      if (totalSessions === 0) {
        console.warn('[Module 4] Generated plan with 0 sessions - this is a bug in the adaptive engine');
        console.warn('[Module 4] Keeping last valid plan instead of overwriting with empty plan');
        setError('Generated plan has no sessions. Keeping existing plan.');
        return null;
      }

      // Sync to localStorage for backward compatibility
      console.log('[Module 4] Syncing adjusted plan to localStorage...');
      saveWeekPlan(adaptivePlan);

      // 2️⃣ Lock execution ONLY after confirming valid plan is saved
      console.log('[Module 4] Valid plan confirmed, locking execution for this week');
      lockAdaptiveExecutionForWeek(userId);

      // Update state
      setDecision(newDecision);
      setAdjustedPlan(adaptivePlan);
      const now = new Date();
      setLastExecuted(now);
      save('module4LastExecution', now.getTime());
      markContextRefreshed();
      setNeedsExecution(false);

      console.log('[Module 4] Execution completed successfully');

      // Trigger callback with adaptive plan (including source metadata)
      if (onPlanAdjusted) {
        onPlanAdjusted(newDecision, adaptivePlan);
      }

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('module4:executed', {
        detail: { decision: newDecision, plan: adaptivePlan }
      }));

      return newDecision;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error in Module 4';
      console.error('[Module 4] Execution failed:', err);
      setError(errorMessage);

      if (onError && err instanceof Error) {
        onError(err);
      }

      return null;
    } finally {
      executionRef.current = false;
      setIsExecuting(false);
    }
  }, [onPlanAdjusted, onError]);

  /**
   * Refresh context and re-execute
   * Allows user to manually trigger a new adaptive run even if it already ran this week
   */
  const refresh = useCallback(async () => {
    console.log('[Module 4] Refresh requested by user');
    // User-initiated refresh bypasses the weekly lock
    await execute(undefined, true);
  }, [execute]);

  /**
   * Check if daily execution is needed
   */
  const checkDailyExecution = useCallback(() => {
    if (!dailyExecution) return false;

    const lastExecTimestamp = load<number>('module4LastExecution', 0);
    const today = new Date().toISOString().slice(0, 10);
    const lastExecDate = lastExecTimestamp > 0
      ? new Date(lastExecTimestamp).toISOString().slice(0, 10)
      : '';

    return today !== lastExecDate;
  }, [dailyExecution]);

  /**
   * Check if execution is needed based on triggers
   */
  const checkExecutionNeeded = useCallback(() => {
    // Check if context needs refresh
    if (shouldRefreshContext()) {
      console.log('[Module 4] Context needs refresh');
      return true;
    }

    // Check if daily execution is needed
    if (checkDailyExecution()) {
      console.log('[Module 4] Daily execution needed');
      return true;
    }

    // Check if never executed
    const lastExecTimestamp = load<number>('module4LastExecution', 0);
    if (lastExecTimestamp === 0) {
      console.log('[Module 4] Never executed, needs initial run');
      return true;
    }

    return false;
  }, [checkDailyExecution]);

  /**
   * Effect: Auto-recovery and auto-execute on mount
   * Checks for empty locked plans FIRST, then executes if needed
   */
  useEffect(() => {
    console.log('[Module 4] Mount effect starting...', { autoExecute });

    if (!autoExecute) {
      console.log('[Module 4] Auto-execute disabled, skipping');
      return;
    }

    // 3️⃣ Auto-recovery: Check for empty locked adaptive plans FIRST
    const currentPlan = getWeekPlan();
    console.log('[Module 4] Checking current plan:', {
      planExists: !!currentPlan,
      planLength: currentPlan?.length,
      planSource: currentPlan?.[0]?.planSource,
      totalSessions: currentPlan?.reduce((sum, day) => sum + (day.sessions?.length ?? 0), 0),
    });

    if (isEmptyLockedAdaptivePlan(currentPlan)) {
      console.warn('[Module 4] Auto-recovery: empty locked plan detected on mount');
      console.warn('[Module 4] Clearing lock to allow fresh execution, but keeping plan as fallback');

      // Clear the lock to allow a new attempt, but DON'T clear the stored plan
      // This prevents losing any fallback plan that might exist
      clearAdaptiveExecutionLock();

      // Force immediate execution after recovery (bypass lock since we just cleared it)
      setTimeout(() => {
        console.log('[Module 4] Executing after auto-recovery');
        execute(undefined, true); // Bypass lock check
      }, 50);

      return; // Skip normal execution check, recovery will handle it
    }

    // Normal execution check
    const shouldExecute = checkExecutionNeeded();
    console.log('[Module 4] Execution check:', { shouldExecute, isExecuting: executionRef.current });
    setNeedsExecution(shouldExecute);

    if (shouldExecute && !executionRef.current) {
      console.log('[Module 4] Auto-executing on mount');
      execute();
    } else {
      console.log('[Module 4] Skipping execution:', { shouldExecute, alreadyExecuting: executionRef.current });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  /**
   * Effect: Listen for explicit user triggers only
   *
   * IMPORTANT: Do NOT automatically re-run on data changes (profile, settings, planner).
   * This prevents the duplicate execution problem.
   *
   * Only explicit triggers should cause re-execution:
   * - User manually triggers refresh
   * - User changes daysPerWeek
   * - Week boundary changes (handled by execution lock)
   */
  useEffect(() => {
    if (!autoExecute) return;

    // Only listen for user-explicit triggers
    const handleExplicitRefresh = () => {
      console.log('[Module 4] User triggered explicit refresh');
      setNeedsExecution(true);
      execute();
    };

    const handleDaysPerWeekChanged = () => {
      console.log('[Module 4] User changed daysPerWeek, re-running adaptive');
      setNeedsExecution(true);
      execute();
    };

    window.addEventListener('adaptive:refreshRequested', handleExplicitRefresh);
    window.addEventListener('settings:daysPerWeekChanged', handleDaysPerWeekChanged);

    return () => {
      window.removeEventListener('adaptive:refreshRequested', handleExplicitRefresh);
      window.removeEventListener('settings:daysPerWeekChanged', handleDaysPerWeekChanged);
    };
  }, [autoExecute, execute]);

  /**
   * REMOVED: Daily execution check
   *
   * The per-week execution lock handles new days automatically.
   * Daily checking was causing duplicate executions.
   * If execution is needed on a new day, the mount effect will handle it.
   */

  return {
    adjustedPlan,
    decision,
    isExecuting,
    lastExecuted,
    error,
    execute,
    refresh,
    needsExecution,
  };
}

/**
 * Lightweight hook that just gets the current adjusted plan
 * without triggering execution
 */
export function useCurrentAdaptivePlan(): LocalStorageWeekPlan | null {
  const [plan, setPlan] = useState<LocalStorageWeekPlan | null>(() => {
    const lastExecution = load<number>('module4LastExecution', 0);
    if (lastExecution > 0) {
      return getWeekPlan();
    }
    return null;
  });

  useEffect(() => {
    const handleModule4Executed = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.plan) {
        setPlan(customEvent.detail.plan);
      }
    };

    window.addEventListener('module4:executed', handleModule4Executed);

    return () => {
      window.removeEventListener('module4:executed', handleModule4Executed);
    };
  }, []);

  return plan;
}
