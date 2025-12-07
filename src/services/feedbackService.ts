import { getSupabase, getCurrentUserId } from '../lib/supabase';
import type {
  RaceFeedback,
  DNFEvent,
  ExtendedDailyFeedback,
  FeedbackType,
  SessionImportance,
  FEEDBACK_WEIGHTS,
} from '../types/feedback';
import { bus } from '../lib/bus';

const FEEDBACK_WEIGHTS_MAP: Record<FeedbackType, number> = {
  training_normal: 1.0,
  training_key_workout: 1.5,
  race_simulation: 3.0,
  race: 5.0,
  dnf: 8.0,
};

export async function saveRaceFeedback(
  feedback: Partial<RaceFeedback>,
  logEntryId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const weight = feedback.event_type === 'simulation'
      ? FEEDBACK_WEIGHTS_MAP.race_simulation
      : FEEDBACK_WEIGHTS_MAP.race;

    const data: Partial<RaceFeedback> = {
      ...feedback,
      user_id: userId,
      log_entry_id: logEntryId,
    };

    const { error } = await supabase
      .from('race_feedback')
      .insert(data);

    if (error) {
      console.error('Error saving race feedback:', error);
      return { success: false, error: error.message };
    }

    bus.emit('feedback:race-saved', {
      feedback: data,
      weight,
      logEntryId,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save race feedback:', error);
    return { success: false, error: String(error) };
  }
}

export async function saveDNFFeedback(
  dnfEvent: Partial<DNFEvent>,
  logEntryId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const data: Partial<DNFEvent> = {
      ...dnfEvent,
      user_id: userId,
      log_entry_id: logEntryId,
      recovery_protocol_activated_at: new Date().toISOString(),
      recovery_protocol_completed: false,
    };

    const { error } = await supabase
      .from('dnf_events')
      .insert(data);

    if (error) {
      console.error('Error saving DNF feedback:', error);
      return { success: false, error: error.message };
    }

    bus.emit('feedback:dnf-saved', {
      dnfEvent: data,
      weight: FEEDBACK_WEIGHTS_MAP.dnf,
      logEntryId,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save DNF feedback:', error);
    return { success: false, error: String(error) };
  }
}

export async function saveDailyFeedback(
  feedback: Partial<ExtendedDailyFeedback>,
  sessionImportance: SessionImportance
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const feedbackType: FeedbackType =
      sessionImportance === 'key_workout' || sessionImportance === 'long_run'
        ? 'training_key_workout'
        : 'training_normal';

    const weight = FEEDBACK_WEIGHTS_MAP[feedbackType];

    const data: Partial<ExtendedDailyFeedback> = {
      ...feedback,
      user_id: userId,
      session_importance: sessionImportance,
      feedback_prompted: true,
      feedback_weight_multiplier: weight,
    };

    const { error } = await supabase
      .from('daily_feedback')
      .upsert(data, {
        onConflict: 'user_id,date',
      });

    if (error) {
      console.error('Error saving daily feedback:', error);
      return { success: false, error: error.message };
    }

    bus.emit('feedback:training-saved', {
      feedback: data,
      weight,
      sessionImportance,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save daily feedback:', error);
    return { success: false, error: String(error) };
  }
}

export async function getFeedbackForDate(
  date: string
): Promise<{
  daily?: ExtendedDailyFeedback;
  race?: RaceFeedback;
  dnf?: DNFEvent;
}> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return {};
  }

  try {
    const [dailyResult, raceResult, dnfResult] = await Promise.all([
      supabase
        .from('daily_feedback')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle(),
      supabase
        .from('race_feedback')
        .select('*')
        .eq('user_id', userId)
        .eq('event_date', date)
        .maybeSingle(),
      supabase
        .from('dnf_events')
        .select('*')
        .eq('user_id', userId)
        .eq('event_date', date)
        .maybeSingle(),
    ]);

    return {
      daily: dailyResult.data || undefined,
      race: raceResult.data || undefined,
      dnf: dnfResult.data || undefined,
    };
  } catch (error) {
    console.error('Failed to get feedback for date:', error);
    return {};
  }
}

export async function hasFeedbackForDate(date: string): Promise<boolean> {
  const feedback = await getFeedbackForDate(date);
  return !!(feedback.daily || feedback.race || feedback.dnf);
}

export async function linkFeedbackToActivity(
  feedbackId: string,
  feedbackType: 'race' | 'dnf',
  logEntryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const tableName = feedbackType === 'race' ? 'race_feedback' : 'dnf_events';

    const { error } = await supabase
      .from(tableName)
      .update({ log_entry_id: logEntryId })
      .eq('id', feedbackId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error linking feedback to activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to link feedback:', error);
    return { success: false, error: String(error) };
  }
}

export async function getRaceFeedbackTrend(
  daysBack: number = 90
): Promise<RaceFeedback[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return [];
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('race_feedback')
      .select('*')
      .eq('user_id', userId)
      .gte('event_date', startDate.toISOString().split('T')[0])
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Error getting race feedback trend:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get race feedback trend:', error);
    return [];
  }
}

export async function getDNFHistory(
  daysBack: number = 365
): Promise<DNFEvent[]> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return [];
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('dnf_events')
      .select('*')
      .eq('user_id', userId)
      .gte('event_date', startDate.toISOString().split('T')[0])
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Error getting DNF history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get DNF history:', error);
    return [];
  }
}

export async function calculateFeedbackCompletionRate(
  startDate: string,
  endDate: string
): Promise<{
  totalKeySessions: number;
  feedbackCollected: number;
  completionRate: number;
}> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!supabase || !userId) {
    return { totalKeySessions: 0, feedbackCollected: 0, completionRate: 0 };
  }

  try {
    const { data: feedbackData, error } = await supabase
      .from('daily_feedback')
      .select('date, session_importance, feedback_prompted')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error calculating feedback completion rate:', error);
      return { totalKeySessions: 0, feedbackCollected: 0, completionRate: 0 };
    }

    const keySessions = feedbackData?.filter(
      (f) => f.session_importance !== 'normal'
    ) || [];

    const collected = keySessions.filter(
      (f) => f.feedback_prompted
    );

    const totalKeySessions = keySessions.length;
    const feedbackCollected = collected.length;
    const completionRate = totalKeySessions > 0
      ? (feedbackCollected / totalKeySessions) * 100
      : 0;

    return {
      totalKeySessions,
      feedbackCollected,
      completionRate,
    };
  } catch (error) {
    console.error('Failed to calculate feedback completion rate:', error);
    return { totalKeySessions: 0, feedbackCollected: 0, completionRate: 0 };
  }
}
