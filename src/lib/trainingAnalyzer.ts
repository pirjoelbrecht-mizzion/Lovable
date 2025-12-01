/**
 * Training Metrics Analyzer
 *
 * Periodic analyzer that aggregates training data from log_entries,
 * updates the training_analysis_cache, and recalculates motivation archetype
 * when significant pattern changes are detected.
 */

import { supabase } from './supabase';
import {
  fetchTrainingMetrics,
  detectMotivationArchetype,
  saveMotivationProfile,
  getUserMotivationProfile,
  type MotivationProfile,
  type TrainingMetrics,
} from './motivationDetection';

export interface AnalysisResult {
  success: boolean;
  metricsUpdated: boolean;
  archetypeChanged: boolean;
  oldArchetype?: string;
  newArchetype?: string;
  error?: string;
}

/**
 * Updates training analysis cache for a user
 */
export async function updateTrainingCache(userId: string, weeksBack: number = 8): Promise<boolean> {
  if (!supabase) return false;

  try {
    const metrics = await fetchTrainingMetrics(userId, weeksBack);
    if (!metrics) return false;

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - weeksBack * 7);

    const { error } = await supabase.from('training_analysis_cache').upsert(
      {
        user_id: userId,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        total_km: metrics.totalKm,
        total_sessions: metrics.totalSessions,
        avg_session_km: metrics.avgSessionKm,
        longest_run_km: metrics.longestRunKm,
        hr_zone_distribution: metrics.hrZoneDistribution || null,
        rest_days_count: metrics.restDaysCount,
        consistency_score: metrics.consistencyScore,
        trail_percentage: metrics.trailPercentage,
        elevation_total_m: metrics.elevationTotalM,
        avg_sessions_per_week: metrics.avgSessionsPerWeek,
        avg_hr: metrics.avgHR || null,
        hr_data_available: !!metrics.avgHR,
        computed_at: new Date().toISOString(),
        is_valid: true,
      },
      {
        onConflict: 'user_id,period_start,period_end',
      }
    );

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating training cache:', error);
    return false;
  }
}

/**
 * Checks if archetype should be recalculated based on time or pattern change
 */
export async function shouldRecalculateArchetype(
  userId: string,
  currentProfile: MotivationProfile
): Promise<{ should: boolean; reason?: string }> {
  const daysSinceUpdate = Math.floor(
    (new Date().getTime() - new Date(currentProfile.lastUpdated).getTime()) / (24 * 60 * 60 * 1000)
  );

  if (daysSinceUpdate >= 30) {
    return { should: true, reason: 'scheduled_update' };
  }

  if (!supabase) return { should: false };

  try {
    const currentMetrics = await fetchTrainingMetrics(userId, 4);
    if (!currentMetrics) return { should: false };

    const previousMetrics = await fetchTrainingMetrics(userId, 8);
    if (!previousMetrics) return { should: false };

    const recentAvgKm = currentMetrics.totalKm / 4;
    const previousAvgKm = (previousMetrics.totalKm - currentMetrics.totalKm) / 4;

    if (Math.abs(recentAvgKm - previousAvgKm) / previousAvgKm > 0.3) {
      return { should: true, reason: 'training_pattern_shift' };
    }

    const recentSessions = currentMetrics.totalSessions / 4;
    const previousSessions = (previousMetrics.totalSessions - currentMetrics.totalSessions) / 4;

    if (Math.abs(recentSessions - previousSessions) / previousSessions > 0.3) {
      return { should: true, reason: 'training_pattern_shift' };
    }

    return { should: false };
  } catch (error) {
    console.error('Error checking archetype recalculation:', error);
    return { should: false };
  }
}

/**
 * Main analysis function: Updates metrics and recalculates archetype if needed
 */
export async function analyzeUserTraining(userId: string): Promise<AnalysisResult> {
  try {
    const metricsUpdated = await updateTrainingCache(userId);

    const currentProfile = await getUserMotivationProfile(userId);
    if (!currentProfile) {
      const newProfile = await detectMotivationArchetype(userId);
      if (newProfile) {
        await saveMotivationProfile(userId, newProfile, 'manual_recalculation');
        return {
          success: true,
          metricsUpdated,
          archetypeChanged: true,
          newArchetype: newProfile.dominant,
        };
      }
      return {
        success: false,
        metricsUpdated,
        archetypeChanged: false,
        error: 'Failed to detect archetype',
      };
    }

    const { should, reason } = await shouldRecalculateArchetype(userId, currentProfile);

    if (should) {
      const newProfile = await detectMotivationArchetype(userId);
      if (newProfile) {
        const archetypeChanged = newProfile.dominant !== currentProfile.dominant;
        await saveMotivationProfile(userId, newProfile, reason || 'manual_recalculation');

        return {
          success: true,
          metricsUpdated,
          archetypeChanged,
          oldArchetype: currentProfile.dominant,
          newArchetype: newProfile.dominant,
        };
      }
    }

    return {
      success: true,
      metricsUpdated,
      archetypeChanged: false,
    };
  } catch (error) {
    console.error('Error analyzing user training:', error);
    return {
      success: false,
      metricsUpdated: false,
      archetypeChanged: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch analyzer for multiple users (for scheduled jobs)
 */
export async function analyzeBatchUsers(userIds: string[]): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();

  for (const userId of userIds) {
    const result = await analyzeUserTraining(userId);
    results.set(userId, result);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Gets list of users who need archetype recalculation
 */
export async function getUsersNeedingRecalculation(): Promise<string[]> {
  if (!supabase) return [];

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, archetype_last_updated')
      .or(
        `archetype_last_updated.is.null,archetype_last_updated.lt.${thirtyDaysAgo.toISOString()}`
      );

    if (error) throw error;

    return (data || []).map((profile) => profile.user_id);
  } catch (error) {
    console.error('Error fetching users needing recalculation:', error);
    return [];
  }
}

/**
 * Scheduled job entry point - can be called daily
 */
export async function runScheduledAnalysis(): Promise<{
  processed: number;
  updated: number;
  changed: number;
  errors: number;
}> {
  const userIds = await getUsersNeedingRecalculation();

  if (userIds.length === 0) {
    return { processed: 0, updated: 0, changed: 0, errors: 0 };
  }

  const results = await analyzeBatchUsers(userIds);

  let updated = 0;
  let changed = 0;
  let errors = 0;

  results.forEach((result) => {
    if (result.success) {
      if (result.metricsUpdated) updated++;
      if (result.archetypeChanged) changed++;
    } else {
      errors++;
    }
  });

  return {
    processed: results.size,
    updated,
    changed,
    errors,
  };
}
