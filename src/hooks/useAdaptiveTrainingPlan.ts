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
import { getWeekPlan, saveWeekPlan, type WeekPlan as LocalStorageWeekPlan } from '@/lib/plan';

export interface UseAdaptiveTrainingPlanOptions {
  /**
   * Enable automatic execution on data changes
   */
  autoExecute?: boolean;

  /**
   * Enable daily execution check
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
  execute: (basePlan?: LocalStorageWeekPlan | AdaptiveWeeklyPlan) => Promise<AdaptiveDecision | null>;

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
   */
  const execute = useCallback(async (basePlan?: LocalStorageWeekPlan | AdaptiveWeeklyPlan): Promise<AdaptiveDecision | null> => {
    // Prevent concurrent executions
    if (executionRef.current) {
      console.log('[Module 4] Execution already in progress, skipping');
      return null;
    }

    try {
      executionRef.current = true;
      setIsExecuting(true);
      setError(null);

      console.log('[Module 4] Starting execution...');

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

      // Get user ID (skip Supabase logging if not authenticated)
      const userId = await getCurrentUserId();
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

      // Validate plan before saving - CRITICAL to prevent clearing valid plans
      if (!localStoragePlan || localStoragePlan.length !== 7) {
        console.error('[Module 4] Generated invalid plan, refusing to save:', localStoragePlan?.length, 'days');
        throw new Error(`Invalid plan generated: ${localStoragePlan?.length || 0} days instead of 7`);
      }

      // Validate each day has at least one session
      const invalidDays = localStoragePlan.filter(day => !day.sessions || day.sessions.length === 0);
      if (invalidDays.length > 0) {
        console.error('[Module 4] Plan has days without sessions:', invalidDays);
        throw new Error(`Invalid plan: ${invalidDays.length} days without sessions`);
      }

      // Sync to localStorage for backward compatibility
      console.log('[Module 4] Syncing adjusted plan to localStorage...');
      saveWeekPlan(localStoragePlan);

      // Update state
      setDecision(newDecision);
      setAdjustedPlan(localStoragePlan);
      const now = new Date();
      setLastExecuted(now);
      save('module4LastExecution', now.getTime());
      markContextRefreshed();
      setNeedsExecution(false);

      console.log('[Module 4] Execution completed successfully');

      // Trigger callback with localStorage format
      if (onPlanAdjusted) {
        onPlanAdjusted(newDecision, localStoragePlan);
      }

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('module4:executed', {
        detail: { decision: newDecision, plan: localStoragePlan }
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
   */
  const refresh = useCallback(async () => {
    console.log('[Module 4] Refresh requested');
    await execute();
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
   * Effect: Auto-execute on mount if needed (runs once only)
   */
  useEffect(() => {
    if (!autoExecute) return;

    const shouldExecute = checkExecutionNeeded();
    setNeedsExecution(shouldExecute);

    if (shouldExecute && !executionRef.current) {
      console.log('[Module 4] Auto-executing on mount');
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  /**
   * Effect: Listen for data change events
   */
  useEffect(() => {
    if (!autoExecute) return;

    const handleACWRUpdate = () => {
      console.log('[Module 4] ACWR updated, triggering execution');
      setNeedsExecution(true);
      execute();
    };

    const handleWeatherUpdate = () => {
      console.log('[Module 4] Weather updated, triggering execution');
      setNeedsExecution(true);
      execute();
    };

    const handleRacesUpdate = () => {
      console.log('[Module 4] Races updated, triggering execution');
      setNeedsExecution(true);
      execute();
    };

    const handleReadinessUpdate = () => {
      console.log('[Module 4] Readiness updated, triggering execution');
      setNeedsExecution(true);
      execute();
    };

    const handleLocationUpdate = () => {
      console.log('[Module 4] Location updated, triggering execution');
      setNeedsExecution(true);
      execute();
    };

    const handleWorkoutCompleted = () => {
      console.log('[Module 4] Workout completed, triggering execution');
      setNeedsExecution(true);
      execute();
    };

    const handlePlanAdapted = () => {
      console.log('[Module 4] Plan adapted from feedback, triggering execution');
      setNeedsExecution(true);
      execute();
    };

    const handleUserSignedIn = () => {
      console.log('[Module 4] User signed in, triggering execution');
      setNeedsExecution(true);
      execute();
    };

    const handleLogImportComplete = () => {
      console.log('[Module 4] Log import complete, triggering execution');
      setNeedsExecution(true);
      execute();
    };

    // Listen for data change events
    window.addEventListener('acwr:updated', handleACWRUpdate);
    window.addEventListener('weather:updated', handleWeatherUpdate);
    window.addEventListener('races:updated', handleRacesUpdate);
    window.addEventListener('readiness:updated', handleReadinessUpdate);
    window.addEventListener('location:updated', handleLocationUpdate);
    window.addEventListener('workout:completed', handleWorkoutCompleted);
    window.addEventListener('plan:adapted', handlePlanAdapted);
    window.addEventListener('user:signed-in', handleUserSignedIn);
    window.addEventListener('log:import-complete', handleLogImportComplete);

    return () => {
      window.removeEventListener('acwr:updated', handleACWRUpdate);
      window.removeEventListener('weather:updated', handleWeatherUpdate);
      window.removeEventListener('races:updated', handleRacesUpdate);
      window.removeEventListener('readiness:updated', handleReadinessUpdate);
      window.removeEventListener('location:updated', handleLocationUpdate);
      window.removeEventListener('workout:completed', handleWorkoutCompleted);
      window.removeEventListener('plan:adapted', handlePlanAdapted);
      window.removeEventListener('user:signed-in', handleUserSignedIn);
      window.removeEventListener('log:import-complete', handleLogImportComplete);
    };
  }, [autoExecute, execute]);

  /**
   * Effect: Daily execution check
   */
  useEffect(() => {
    if (!dailyExecution) return;

    const interval = setInterval(() => {
      if (checkDailyExecution()) {
        console.log('[Module 4] Daily execution timer triggered');
        setNeedsExecution(true);
        execute();
      }
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(interval);
  }, [dailyExecution, checkDailyExecution, execute]);

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
