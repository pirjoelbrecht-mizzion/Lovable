/**
 * ======================================================================
 *  ADAPTIVE DECISION ENGINE - DATABASE HELPERS
 *  Logging and retrieval functions for ADE decisions
 * ======================================================================
 */

import { getSupabase, getCurrentUserId } from '@/lib/supabase';
import type { AdaptiveDecision, AdjustmentLayer, AdaptiveContext } from './adaptiveDecisionEngine';

//
// ─────────────────────────────────────────────────────────────
//   SAVE DECISION TO DATABASE
// ─────────────────────────────────────────────────────────────
//

/**
 * Logs an adaptive decision to the database
 * Stores complete decision history for transparency and learning
 */
export async function logAdaptiveDecision(
  userId: string,
  decision: AdaptiveDecision,
  context: AdaptiveContext
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    // Extract week start date from plan
    const weekStartDate = decision.originalPlan.weekStart || new Date().toISOString().split('T')[0];

    // Insert main decision record
    const { data: decisionData, error: decisionError } = await supabase
      .from('adaptive_decisions')
      .insert({
        user_id: userId,
        original_plan: decision.originalPlan,
        modified_plan: decision.modifiedPlan,
        confidence: decision.confidence,
        applied_at: decision.appliedAt,
        context_snapshot: context,
        final_reasoning: decision.finalReasoning,
        safety_flags: decision.safetyFlags,
        warnings: decision.warnings,
        week_start_date: weekStartDate
      })
      .select('id')
      .single();

    if (decisionError) throw decisionError;

    // Insert adjustment layers
    const layerRecords = decision.layers.map(layer => ({
      decision_id: decisionData.id,
      layer_name: layer.name,
      layer_priority: layer.priority,
      applied: layer.applied,
      safety_override: layer.safetyOverride,
      reasoning: layer.reasoning,
      changes: layer.changes
    }));

    const { error: layersError } = await supabase
      .from('adjustment_layers')
      .insert(layerRecords);

    if (layersError) throw layersError;

    return true;
  } catch (error) {
    console.error('Error logging adaptive decision:', error);
    return false;
  }
}

//
// ─────────────────────────────────────────────────────────────
//   RETRIEVE DECISIONS
// ─────────────────────────────────────────────────────────────
//

/**
 * Get the most recent adaptive decision for a user
 */
export async function getLatestAdaptiveDecision(userId?: string): Promise<AdaptiveDecision | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const uid = userId || await getCurrentUserId();
    if (!uid) return null;

    const { data, error } = await supabase.rpc('get_latest_adaptive_decision', {
      p_user_id: uid
    });

    if (error) throw error;
    if (!data) return null;

    // Transform database result back to AdaptiveDecision type
    return {
      originalPlan: data.original_plan,
      modifiedPlan: data.modified_plan,
      layers: data.layers || [],
      finalReasoning: data.final_reasoning || [],
      safetyFlags: data.safety_flags || [],
      warnings: data.warnings || [],
      appliedAt: data.applied_at,
      confidence: data.confidence
    };
  } catch (error) {
    console.error('Error fetching latest adaptive decision:', error);
    return null;
  }
}

/**
 * Get decision history for a user
 */
export async function getAdaptiveDecisionHistory(
  userId?: string,
  limit: number = 10
): Promise<DecisionHistorySummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const uid = userId || await getCurrentUserId();
    if (!uid) return [];

    const { data, error } = await supabase.rpc('get_adaptive_decision_history', {
      p_user_id: uid,
      p_limit: limit
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching decision history:', error);
    return [];
  }
}

/**
 * Count safety overrides in recent period
 */
export async function countRecentSafetyOverrides(
  userId?: string,
  days: number = 14
): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  try {
    const uid = userId || await getCurrentUserId();
    if (!uid) return 0;

    const { data, error } = await supabase.rpc('count_recent_safety_overrides', {
      p_user_id: uid,
      p_days: days
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error counting safety overrides:', error);
    return 0;
  }
}

/**
 * Get all decisions for a specific week
 */
export async function getWeekDecisions(
  userId: string,
  weekStartDate: string
): Promise<AdaptiveDecision[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data: decisions, error: decisionsError } = await supabase
      .from('adaptive_decisions')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start_date', weekStartDate)
      .order('applied_at', { ascending: false });

    if (decisionsError) throw decisionsError;
    if (!decisions || decisions.length === 0) return [];

    // Fetch layers for each decision
    const decisionIds = decisions.map(d => d.id);
    const { data: layers, error: layersError } = await supabase
      .from('adjustment_layers')
      .select('*')
      .in('decision_id', decisionIds);

    if (layersError) throw layersError;

    // Group layers by decision
    const layersByDecision = new Map<string, AdjustmentLayer[]>();
    (layers || []).forEach(layer => {
      if (!layersByDecision.has(layer.decision_id)) {
        layersByDecision.set(layer.decision_id, []);
      }
      layersByDecision.get(layer.decision_id)!.push({
        name: layer.layer_name,
        applied: layer.applied,
        changes: layer.changes,
        reasoning: layer.reasoning,
        priority: layer.layer_priority,
        safetyOverride: layer.safety_override
      });
    });

    // Construct full AdaptiveDecision objects
    return decisions.map(d => ({
      originalPlan: d.original_plan,
      modifiedPlan: d.modified_plan,
      layers: layersByDecision.get(d.id) || [],
      finalReasoning: d.final_reasoning || [],
      safetyFlags: d.safety_flags || [],
      warnings: d.warnings || [],
      appliedAt: d.applied_at,
      confidence: d.confidence
    }));
  } catch (error) {
    console.error('Error fetching week decisions:', error);
    return [];
  }
}

//
// ─────────────────────────────────────────────────────────────
//   ANALYTICS & INSIGHTS
// ─────────────────────────────────────────────────────────────
//

export interface DecisionHistorySummary {
  id: string;
  confidence: number;
  applied_at: string;
  final_reasoning: string[];
  safety_flags: string[];
  warnings: string[];
  layer_count: number;
  safety_override_count: number;
}

/**
 * Get statistics about recent adaptive decisions
 */
export async function getAdaptiveDecisionStats(
  userId?: string,
  days: number = 30
): Promise<DecisionStats> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      totalDecisions: 0,
      safetyOverrides: 0,
      averageConfidence: 0,
      mostCommonLayer: 'Unknown',
      layerApplicationRate: {}
    };
  }

  try {
    const uid = userId || await getCurrentUserId();
    if (!uid) {
      return {
        totalDecisions: 0,
        safetyOverrides: 0,
        averageConfidence: 0,
        mostCommonLayer: 'Unknown',
        layerApplicationRate: {}
      };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get decision stats
    const { data: decisions, error: decisionsError } = await supabase
      .from('adaptive_decisions')
      .select('id, confidence')
      .eq('user_id', uid)
      .gte('applied_at', cutoffDate.toISOString());

    if (decisionsError) throw decisionsError;

    const totalDecisions = decisions?.length || 0;
    const averageConfidence = totalDecisions > 0
      ? decisions!.reduce((sum, d) => sum + (d.confidence || 0), 0) / totalDecisions
      : 0;

    // Get layer stats
    const decisionIds = decisions?.map(d => d.id) || [];
    if (decisionIds.length === 0) {
      return {
        totalDecisions,
        safetyOverrides: 0,
        averageConfidence,
        mostCommonLayer: 'Unknown',
        layerApplicationRate: {}
      };
    }

    const { data: layers, error: layersError } = await supabase
      .from('adjustment_layers')
      .select('layer_name, applied, safety_override')
      .in('decision_id', decisionIds);

    if (layersError) throw layersError;

    const safetyOverrides = layers?.filter(l => l.safety_override).length || 0;

    // Calculate layer application rates
    const layerCounts = new Map<string, { applied: number; total: number }>();
    (layers || []).forEach(layer => {
      if (!layerCounts.has(layer.layer_name)) {
        layerCounts.set(layer.layer_name, { applied: 0, total: 0 });
      }
      const counts = layerCounts.get(layer.layer_name)!;
      counts.total++;
      if (layer.applied) counts.applied++;
    });

    const layerApplicationRate: { [key: string]: number } = {};
    let mostCommonLayer = 'Unknown';
    let maxApplications = 0;

    layerCounts.forEach((counts, name) => {
      const rate = counts.applied / counts.total;
      layerApplicationRate[name] = rate;

      if (counts.applied > maxApplications) {
        maxApplications = counts.applied;
        mostCommonLayer = name;
      }
    });

    return {
      totalDecisions,
      safetyOverrides,
      averageConfidence,
      mostCommonLayer,
      layerApplicationRate
    };
  } catch (error) {
    console.error('Error calculating decision stats:', error);
    return {
      totalDecisions: 0,
      safetyOverrides: 0,
      averageConfidence: 0,
      mostCommonLayer: 'Unknown',
      layerApplicationRate: {}
    };
  }
}

export interface DecisionStats {
  totalDecisions: number;
  safetyOverrides: number;
  averageConfidence: number;
  mostCommonLayer: string;
  layerApplicationRate: { [layerName: string]: number };
}
