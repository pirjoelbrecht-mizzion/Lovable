/**
 * ======================================================================
 *  ADAPTIVE DECISION ENGINE - REACT HOOK
 *  Easy integration of ADE into React components
 * ======================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import {
  adjustWeeklyTrainingDecision,
  logAdaptiveDecision,
  getLatestAdaptiveDecision,
  getAdaptiveDecisionHistory,
  countRecentSafetyOverrides,
  getAdaptiveDecisionStats,
  type AdaptiveContext,
  type AdaptiveDecision,
  type DecisionHistorySummary,
  type DecisionStats
} from '@/engine';
import { getCurrentUserId } from '@/lib/supabase';

//
// ─────────────────────────────────────────────────────────────
//   MAIN HOOK
// ─────────────────────────────────────────────────────────────
//

export interface UseAdaptiveDecisionEngineResult {
  // Current decision state
  decision: AdaptiveDecision | null;
  isLoading: boolean;
  error: string | null;

  // Functions
  computeAndApplyDecision: (context: AdaptiveContext) => Promise<AdaptiveDecision | null>;
  refreshLatestDecision: () => Promise<void>;

  // History
  history: DecisionHistorySummary[];
  loadHistory: (limit?: number) => Promise<void>;

  // Analytics
  stats: DecisionStats | null;
  safetyOverrideCount: number;
  loadStats: (days?: number) => Promise<void>;
}

/**
 * Hook to use the Adaptive Decision Engine in React components
 */
export function useAdaptiveDecisionEngine(): UseAdaptiveDecisionEngineResult {
  const [decision, setDecision] = useState<AdaptiveDecision | null>(null);
  const [history, setHistory] = useState<DecisionHistorySummary[]>([]);
  const [stats, setStats] = useState<DecisionStats | null>(null);
  const [safetyOverrideCount, setSafetyOverrideCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Compute a new adaptive decision and log it to the database
   */
  const computeAndApplyDecision = useCallback(async (
    context: AdaptiveContext
  ): Promise<AdaptiveDecision | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Compute decision using the engine
      const newDecision = adjustWeeklyTrainingDecision(context);

      // Get user ID
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Log to database
      const logged = await logAdaptiveDecision(userId, newDecision, context);
      if (!logged) {
        console.warn('Failed to log adaptive decision to database');
      }

      // Update state
      setDecision(newDecision);

      return newDecision;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error computing decision';
      setError(errorMessage);
      console.error('Error in computeAndApplyDecision:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load the latest decision from the database
   */
  const refreshLatestDecision = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const latestDecision = await getLatestAdaptiveDecision();
      setDecision(latestDecision);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching decision';
      setError(errorMessage);
      console.error('Error in refreshLatestDecision:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load decision history
   */
  const loadHistory = useCallback(async (limit: number = 10) => {
    try {
      const historyData = await getAdaptiveDecisionHistory(undefined, limit);
      setHistory(historyData);
    } catch (err) {
      console.error('Error loading decision history:', err);
    }
  }, []);

  /**
   * Load analytics and stats
   */
  const loadStats = useCallback(async (days: number = 30) => {
    try {
      const [statsData, overrideCount] = await Promise.all([
        getAdaptiveDecisionStats(undefined, days),
        countRecentSafetyOverrides(undefined, 14)
      ]);

      setStats(statsData);
      setSafetyOverrideCount(overrideCount);
    } catch (err) {
      console.error('Error loading decision stats:', err);
    }
  }, []);

  // Auto-load latest decision on mount
  useEffect(() => {
    refreshLatestDecision();
  }, [refreshLatestDecision]);

  return {
    decision,
    isLoading,
    error,
    computeAndApplyDecision,
    refreshLatestDecision,
    history,
    loadHistory,
    stats,
    safetyOverrideCount,
    loadStats
  };
}

//
// ─────────────────────────────────────────────────────────────
//   LIGHTWEIGHT HOOK - JUST LATEST DECISION
// ─────────────────────────────────────────────────────────────
//

export interface UseLatestDecisionResult {
  decision: AdaptiveDecision | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Lightweight hook that just fetches the latest decision
 * Use this when you don't need full ADE functionality
 */
export function useLatestDecision(): UseLatestDecisionResult {
  const [decision, setDecision] = useState<AdaptiveDecision | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const latestDecision = await getLatestAdaptiveDecision();
      setDecision(latestDecision);
    } catch (err) {
      console.error('Error fetching latest decision:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    decision,
    isLoading,
    refresh
  };
}

//
// ─────────────────────────────────────────────────────────────
//   STATS HOOK
// ─────────────────────────────────────────────────────────────
//

export interface UseDecisionStatsResult {
  stats: DecisionStats | null;
  safetyOverrideCount: number;
  isLoading: boolean;
  refresh: (days?: number) => Promise<void>;
}

/**
 * Hook for decision analytics and statistics
 */
export function useDecisionStats(days: number = 30): UseDecisionStatsResult {
  const [stats, setStats] = useState<DecisionStats | null>(null);
  const [safetyOverrideCount, setSafetyOverrideCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refresh = useCallback(async (refreshDays?: number) => {
    try {
      setIsLoading(true);
      const daysToUse = refreshDays || days;

      const [statsData, overrideCount] = await Promise.all([
        getAdaptiveDecisionStats(undefined, daysToUse),
        countRecentSafetyOverrides(undefined, 14)
      ]);

      setStats(statsData);
      setSafetyOverrideCount(overrideCount);
    } catch (err) {
      console.error('Error loading decision stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    stats,
    safetyOverrideCount,
    isLoading,
    refresh
  };
}
