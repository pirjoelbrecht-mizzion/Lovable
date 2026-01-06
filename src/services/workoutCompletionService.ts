/**
 * ======================================================================
 *  WORKOUT COMPLETION SERVICE
 *  Handles the feedback loop: Completion → Feedback → Adaptation
 * ======================================================================
 *
 * This service orchestrates the critical feedback loop:
 * 1. User completes workout (links log entry to plan)
 * 2. Collects subjective feedback (RPE, pain, mood)
 * 3. Triggers adaptive decision engine
 * 4. Updates remaining week's plan automatically
 *
 * This is the "steering wheel" that connects the UI to the AI engine.
 */

import { supabase } from '@/lib/supabase';
import { triggerModule4 } from './adaptiveTriggerService';
import { toast } from '@/components/ToastHost';
import { save } from '@/utils/storage';
import type { LogEntry } from '@/types';

/**
 * Aggregate multiple log entries into a single combined entry
 * Used for "combined" match type when user does multiple activities per day
 */
export function aggregateLogEntries(entries: LogEntry[]): LogEntry {
  if (entries.length === 0) {
    throw new Error('Cannot aggregate empty entries array');
  }

  if (entries.length === 1) {
    return entries[0];
  }

  // Sum distance, duration, elevation
  const totalDistance = entries.reduce((sum, e) => sum + (e.km || 0), 0);
  const totalDuration = entries.reduce((sum, e) => sum + (e.durationMin || 0), 0);
  const totalElevation = entries.reduce((sum, e) => sum + (e.elevationGain || 0), 0);

  // Weighted average for heart rate and pace
  let weightedHR = 0;
  let hrWeight = 0;
  let weightedPace = 0;
  let paceWeight = 0;

  entries.forEach(entry => {
    const duration = entry.durationMin || 0;

    if (entry.hrAvg && duration > 0) {
      weightedHR += entry.hrAvg * duration;
      hrWeight += duration;
    }

    if (entry.km && duration > 0 && entry.km > 0) {
      const pace = duration / entry.km; // min/km
      weightedPace += pace * duration;
      paceWeight += duration;
    }
  });

  const avgHR = hrWeight > 0 ? Math.round(weightedHR / hrWeight) : undefined;
  const avgPace = paceWeight > 0 ? weightedPace / paceWeight : undefined;

  // Use first entry as template
  const aggregated: LogEntry = {
    ...entries[0],
    id: `combined_${entries.map(e => e.id).join('_')}`,
    title: `Combined: ${entries.length} activities`,
    km: Math.round(totalDistance * 10) / 10,
    durationMin: Math.round(totalDuration),
    elevationGain: Math.round(totalElevation),
    hrAvg: avgHR,
    // Store original IDs for reference
    notes: `Aggregated from ${entries.length} activities: ${entries.map(e => e.title || 'Run').join(', ')}`
  };

  console.log('[AggregateEntries]', {
    count: entries.length,
    totalKm: aggregated.km,
    totalDuration: aggregated.durationMin,
    avgHR: aggregated.hrAvg
  });

  return aggregated;
}

export interface WorkoutCompletion {
  workoutDate: string;
  plannedWorkoutId: string;
  logEntryId: string;
  matchType: 'exact' | 'combined' | 'manual';
  notes?: string;
}

export interface DailyFeedback {
  date: string;
  logEntryId: string;
  workoutCompletionId?: string;
  rpe: number;
  feeling: 'great' | 'good' | 'tired' | 'exhausted' | 'sick' | 'injured';
  painAreas: string[];
  notes?: string;
  motivationLevel?: number;
  sleepQuality?: number;
  stressLevel?: number;
}

/**
 * Link a log entry to a planned workout
 */
export async function createWorkoutCompletion(
  completion: WorkoutCompletion
): Promise<string | null> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      console.error('[WorkoutCompletion] No user session');
      return null;
    }

    const { data, error } = await supabase
      .from('workout_completions')
      .insert({
        user_id: session.session.user.id,
        workout_date: completion.workoutDate,
        planned_workout_id: completion.plannedWorkoutId,
        log_entry_id: completion.logEntryId,
        match_type: completion.matchType,
        notes: completion.notes
      })
      .select('id')
      .single();

    if (error) {
      console.error('[WorkoutCompletion] Error:', error);
      return null;
    }

    console.log('[WorkoutCompletion] Created:', data.id);
    return data.id;
  } catch (error) {
    console.error('[WorkoutCompletion] Exception:', error);
    return null;
  }
}

/**
 * Save post-workout feedback
 */
export async function saveDailyFeedback(
  feedback: DailyFeedback
): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      console.error('[DailyFeedback] No user session');
      return false;
    }

    const { error } = await supabase
      .from('daily_feedback')
      .insert({
        user_id: session.session.user.id,
        date: feedback.date,
        log_entry_id: feedback.logEntryId,
        workout_completion_id: feedback.workoutCompletionId,
        rpe: feedback.rpe,
        feeling: feedback.feeling,
        pain_areas: feedback.painAreas,
        notes: feedback.notes,
        motivation_level: feedback.motivationLevel,
        sleep_quality: feedback.sleepQuality,
        stress_level: feedback.stressLevel
      });

    if (error) {
      console.error('[DailyFeedback] Error:', error);
      return false;
    }

    console.log('[DailyFeedback] Saved successfully');
    return true;
  } catch (error) {
    console.error('[DailyFeedback] Exception:', error);
    return false;
  }
}

/**
 * Get completions for a date range
 */
export async function getWorkoutCompletions(
  startDate: string,
  endDate: string
): Promise<any[]> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      return [];
    }

    const { data, error } = await supabase
      .from('workout_completions')
      .select('*')
      .eq('user_id', session.session.user.id)
      .gte('workout_date', startDate)
      .lte('workout_date', endDate)
      .order('workout_date', { ascending: false });

    if (error) {
      console.error('[GetCompletions] Error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[GetCompletions] Exception:', error);
    return [];
  }
}

/**
 * Get feedback for a date range
 */
export async function getDailyFeedback(
  startDate: string,
  endDate: string
): Promise<any[]> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      return [];
    }

    const { data, error } = await supabase
      .from('daily_feedback')
      .select('*')
      .eq('user_id', session.session.user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('[GetFeedback] Error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[GetFeedback] Exception:', error);
    return [];
  }
}

/**
 * Complete workflow: Match workout + Collect feedback + Trigger adaptation
 * This is the main integration function that closes the loop
 */
export async function completeWorkoutWithFeedback(
  completion: WorkoutCompletion,
  feedback: DailyFeedback,
  logEntry: LogEntry
): Promise<boolean> {
  try {
    console.log('[CompleteWorkflow] Starting...');

    // Step 1: Create workout completion record
    const completionId = await createWorkoutCompletion(completion);
    if (!completionId) {
      toast('Failed to link workout', 'error');
      return false;
    }

    // Step 2: Save feedback with completion reference
    feedback.workoutCompletionId = completionId;
    const feedbackSaved = await saveDailyFeedback(feedback);
    if (!feedbackSaved) {
      toast('Failed to save feedback', 'error');
      return false;
    }

    // Step 3: Trigger adaptive decision engine
    console.log('[CompleteWorkflow] Triggering adaptation...');

    // Calculate variance metrics for Module 7 (Adaptive Controller)
    const actualDistance = logEntry.km || 0;
    const actualDuration = logEntry.durationMin || 0;

    // Check for "Too Much" or "Too Little"
    const highRPE = feedback.rpe >= 8;
    const hasPain = feedback.painAreas.length > 1 || !feedback.painAreas.includes('None');
    const isFatigued = feedback.feeling === 'exhausted' || feedback.feeling === 'sick';

    // Trigger appropriate adaptation signals
    if (highRPE || hasPain) {
      triggerModule4('fatigue:updated', { source: 'workout-completion' });
    }

    if (isFatigued) {
      triggerModule4('fatigue:updated', { source: 'workout-completion' });
    }

    // Always trigger workout:completed to update ACWR and check safety
    triggerModule4('workout:completed', { source: 'workout-completion' });

    // Step 4: Mark log entries as updated (triggers plan regeneration)
    save('logEntriesLastUpdate', Date.now());
    console.log('[CompleteWorkflow] Log entries timestamp updated');

    // Step 5: Emit event for UI to refresh
    window.dispatchEvent(new CustomEvent('plan:adapted', {
      detail: { date: completion.workoutDate, feedback, completion }
    }));

    toast('Feedback saved. Training plan updated.', 'success');
    console.log('[CompleteWorkflow] Success!');

    return true;
  } catch (error) {
    console.error('[CompleteWorkflow] Exception:', error);
    toast('Failed to process workout completion', 'error');
    return false;
  }
}

/**
 * Check if a workout is already completed
 */
export async function isWorkoutCompleted(
  date: string,
  plannedWorkoutId: string
): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      return false;
    }

    const { data, error } = await supabase
      .from('workout_completions')
      .select('id')
      .eq('user_id', session.session.user.id)
      .eq('workout_date', date)
      .eq('planned_workout_id', plannedWorkoutId)
      .maybeSingle();

    if (error) {
      console.error('[IsCompleted] Error:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('[IsCompleted] Exception:', error);
    return false;
  }
}

/**
 * Get completion status for multiple dates
 */
export async function getCompletionStatusForWeek(
  weekStart: string
): Promise<Record<string, boolean>> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      return {};
    }

    // Calculate week end (6 days after start)
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEnd = endDate.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('workout_completions')
      .select('workout_date')
      .eq('user_id', session.session.user.id)
      .gte('workout_date', weekStart)
      .lte('workout_date', weekEnd);

    if (error) {
      console.error('[GetWeekStatus] Error:', error);
      return {};
    }

    // Build map of date -> completed
    const statusMap: Record<string, boolean> = {};
    data?.forEach(completion => {
      statusMap[completion.workout_date] = true;
    });

    return statusMap;
  } catch (error) {
    console.error('[GetWeekStatus] Exception:', error);
    return {};
  }
}
