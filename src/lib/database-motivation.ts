/**
 * Database Helpers for Motivation-Integrated Adaptive Coach
 *
 * Provides functions to store and retrieve motivation-aware training plans,
 * coach messages, and archetype-specific preferences.
 */

import { getSupabase, getCurrentUserId } from './supabase';
import type { ArchetypeType, MotivationProfile } from './motivationDetection';
import type { WeeklyPlan, CoachingMessage } from './adaptive-coach';

//
// ─────────────────────────────────────────────────────────────
//   COACH MESSAGE HISTORY
// ─────────────────────────────────────────────────────────────
//

export interface CoachMessageRecord {
  id?: string;
  user_id: string;
  message_type: 'weekly_plan' | 'adaptation' | 'progress' | 'motivation' | 'race_strategy';
  archetype_used: ArchetypeType | null;
  title: string;
  body: string;
  tone: string;
  priority: string;
  action_items: string[] | null;
  week_number?: number;
  created_at?: string;
}

/**
 * Save a coaching message to history
 */
export async function saveCoachMessage(
  messageType: CoachMessageRecord['message_type'],
  message: CoachingMessage,
  archetype?: ArchetypeType,
  weekNumber?: number
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const record: Partial<CoachMessageRecord> = {
      user_id: userId,
      message_type: messageType,
      archetype_used: archetype || null,
      title: message.title,
      body: message.body,
      tone: message.tone,
      priority: message.priority,
      action_items: message.actionItems || null,
      week_number: weekNumber,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('coach_messages')
      .insert([record]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving coach message:', error);
    return false;
  }
}

/**
 * Get recent coach messages for a user
 */
export async function getRecentCoachMessages(
  limit: number = 10
): Promise<CoachMessageRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('coach_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching coach messages:', error);
    return [];
  }
}

//
// ─────────────────────────────────────────────────────────────
//   ARCHETYPE-ENHANCED TRAINING PLANS
// ─────────────────────────────────────────────────────────────
//

export interface ArchetypeTrainingPlanRecord {
  id?: string;
  user_id: string;
  week_number: number;
  archetype: ArchetypeType;
  archetype_confidence: number;
  plan_data: WeeklyPlan;
  variety_suggestions: string[];
  encouragement_message: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Save archetype-enhanced weekly plan
 */
export async function saveArchetypeTrainingPlan(
  weekNumber: number,
  plan: WeeklyPlan,
  archetype: ArchetypeType,
  confidence: number,
  varietySuggestions: string[],
  encouragement: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const record: Partial<ArchetypeTrainingPlanRecord> = {
      user_id: userId,
      week_number: weekNumber,
      archetype,
      archetype_confidence: confidence,
      plan_data: plan,
      variety_suggestions: varietySuggestions,
      encouragement_message: encouragement,
      updated_at: new Date().toISOString()
    };

    // Check if plan already exists for this week
    const { data: existing } = await supabase
      .from('archetype_training_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('week_number', weekNumber)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('archetype_training_plans')
        .update(record)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('archetype_training_plans')
        .insert([{ ...record, created_at: new Date().toISOString() }]);

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error saving archetype training plan:', error);
    return false;
  }
}

/**
 * Get archetype-enhanced plan for a specific week
 */
export async function getArchetypeTrainingPlan(
  weekNumber: number
): Promise<ArchetypeTrainingPlanRecord | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('archetype_training_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('week_number', weekNumber)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching archetype training plan:', error);
    return null;
  }
}

//
// ─────────────────────────────────────────────────────────────
//   ARCHETYPE PREFERENCES & SETTINGS
// ─────────────────────────────────────────────────────────────
//

export interface ArchetypePreferencesRecord {
  user_id: string;
  archetype: ArchetypeType;
  tone_preference: 'default' | 'more_direct' | 'more_gentle' | 'more_inspiring';
  detail_level_override: 'default' | 'minimal' | 'moderate' | 'detailed' | null;
  enable_variety_suggestions: boolean;
  enable_group_suggestions: boolean;
  enable_encouragement: boolean;
  updated_at?: string;
}

/**
 * Save user's archetype preference overrides
 */
export async function saveArchetypePreferences(
  preferences: Partial<ArchetypePreferencesRecord>
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const record = {
      ...preferences,
      user_id: userId,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('archetype_preferences')
      .upsert(record, { onConflict: 'user_id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving archetype preferences:', error);
    return false;
  }
}

/**
 * Get user's archetype preferences
 */
export async function getArchetypePreferences(): Promise<ArchetypePreferencesRecord | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('archetype_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching archetype preferences:', error);
    return null;
  }
}

//
// ─────────────────────────────────────────────────────────────
//   ARCHETYPE EVOLUTION TRACKING
// ─────────────────────────────────────────────────────────────
//

export interface ArchetypeEvolutionRecord {
  id?: string;
  user_id: string;
  previous_archetype: ArchetypeType;
  new_archetype: ArchetypeType;
  confidence_change: number;
  trigger_event: string;
  training_context?: any;
  created_at?: string;
}

/**
 * Record archetype evolution/change
 */
export async function recordArchetypeEvolution(
  previousArchetype: ArchetypeType,
  newArchetype: ArchetypeType,
  confidenceChange: number,
  triggerEvent: string,
  trainingContext?: any
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const record: Partial<ArchetypeEvolutionRecord> = {
      user_id: userId,
      previous_archetype: previousArchetype,
      new_archetype: newArchetype,
      confidence_change: confidenceChange,
      trigger_event: triggerEvent,
      training_context: trainingContext,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('archetype_evolution')
      .insert([record]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error recording archetype evolution:', error);
    return false;
  }
}

/**
 * Get archetype evolution history
 */
export async function getArchetypeEvolutionHistory(
  limit: number = 10
): Promise<ArchetypeEvolutionRecord[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('archetype_evolution')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching archetype evolution:', error);
    return [];
  }
}

//
// ─────────────────────────────────────────────────────────────
//   MOTIVATION-INTEGRATED WEEKLY STATS
// ─────────────────────────────────────────────────────────────
//

export interface MotivationWeeklyStats {
  week_number: number;
  archetype: ArchetypeType;
  completion_rate: number;
  fatigue_average: number;
  encouragement_shown: number;
  challenges_accepted: number;
  variety_suggestions_used: number;
  message_tone_satisfaction?: number; // 1-10 if user rates
}

/**
 * Save weekly stats with motivation data
 */
export async function saveMotivationWeeklyStats(
  stats: Partial<MotivationWeeklyStats>
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const record = {
      user_id: userId,
      ...stats,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('motivation_weekly_stats')
      .insert([record]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving motivation weekly stats:', error);
    return false;
  }
}

/**
 * Get motivation stats for a date range
 */
export async function getMotivationWeeklyStats(
  startWeek: number,
  endWeek: number
): Promise<MotivationWeeklyStats[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('motivation_weekly_stats')
      .select('*')
      .eq('user_id', userId)
      .gte('week_number', startWeek)
      .lte('week_number', endWeek)
      .order('week_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching motivation weekly stats:', error);
    return [];
  }
}
