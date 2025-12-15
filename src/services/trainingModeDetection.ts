import { supabase } from '@/lib/supabase';
import type { UserSettings } from '@/lib/userSettings';
import { getActivePriorityRace } from '@/utils/races';
import type { Race } from '@/types';

export type TrainingMode = 'goal_oriented' | 'maintenance' | 'off_season' | 'custom';

export interface ModeDetectionResult {
  recommendedMode: TrainingMode;
  currentMode: TrainingMode;
  shouldTransition: boolean;
  reason: string;
  context: {
    upcomingRace?: Race;
    weeksToRace?: number;
    averageWeeklyVolume?: number;
    recentConsistency?: number;
  };
}

/**
 * Detect appropriate training mode based on current situation
 */
export async function detectTrainingMode(userId: string): Promise<ModeDetectionResult> {
  const [settings, raceData] = await Promise.all([
    getUserTrainingSettings(userId),
    getActivePriorityRace(),
  ]);

  const currentMode = settings.training_mode || 'goal_oriented';
  const { race: upcomingRace, wTo: weeksToRace } = raceData;

  // Scenario 1: Race scheduled and close (< 16 weeks)
  if (upcomingRace && weeksToRace && weeksToRace < 16) {
    return {
      recommendedMode: 'goal_oriented',
      currentMode,
      shouldTransition: currentMode !== 'goal_oriented',
      reason: `Goal race approaching: ${upcomingRace.name} in ${weeksToRace.toFixed(1)} weeks. Race-focused training recommended.`,
      context: {
        upcomingRace,
        weeksToRace,
        averageWeeklyVolume: await calculateHistoricalVolume(userId),
      },
    };
  }

  // Scenario 2: Race scheduled but distant (16+ weeks)
  if (upcomingRace && weeksToRace && weeksToRace >= 16) {
    return {
      recommendedMode: 'maintenance',
      currentMode,
      shouldTransition: currentMode === 'goal_oriented',
      reason: `Goal race ${upcomingRace.name} is ${weeksToRace.toFixed(1)} weeks away. Base building recommended before race-specific training.`,
      context: {
        upcomingRace,
        weeksToRace,
        averageWeeklyVolume: await calculateHistoricalVolume(userId),
      },
    };
  }

  // Scenario 3: No race scheduled
  const avgVolume = await calculateHistoricalVolume(userId);
  const consistency = await calculateTrainingConsistency(userId);

  return {
    recommendedMode: 'maintenance',
    currentMode,
    shouldTransition: currentMode === 'goal_oriented',
    reason: 'No upcoming race scheduled. Maintenance training recommended to preserve fitness.',
    context: {
      averageWeeklyVolume: avgVolume,
      recentConsistency: consistency,
    },
  };
}

/**
 * Calculate historical weekly volume (last 8 weeks, excluding outliers)
 */
async function calculateHistoricalVolume(userId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return 0;

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const { data: activities } = await supabase
    .from('log_entries')
    .select('date, km')
    .eq('user_id', userId)
    .gte('date', eightWeeksAgo.toISOString().split('T')[0]);

  if (!activities || activities.length === 0) return 0;

  // Group by week
  const weeklyTotals: Record<string, number> = {};

  activities.forEach(activity => {
    const date = new Date(activity.date);
    const weekStart = getMonday(date);
    const weekKey = weekStart.toISOString().split('T')[0];

    weeklyTotals[weekKey] = (weeklyTotals[weekKey] || 0) + activity.km;
  });

  const volumes = Object.values(weeklyTotals);
  if (volumes.length === 0) return 0;

  // Return average, excluding outliers (top 10% and bottom 10%)
  const sorted = volumes.sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.1);
  const trimmed = trimCount > 0 ? sorted.slice(trimCount, sorted.length - trimCount) : sorted;

  return trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;
}

/**
 * Calculate training consistency (% of weeks with activity in last 8 weeks)
 */
async function calculateTrainingConsistency(userId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return 0;

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const { data: activities } = await supabase
    .from('log_entries')
    .select('date')
    .eq('user_id', userId)
    .gte('date', eightWeeksAgo.toISOString().split('T')[0]);

  if (!activities || activities.length === 0) return 0;

  const weeksWithActivity = new Set<string>();

  activities.forEach(activity => {
    const date = new Date(activity.date);
    const weekStart = getMonday(date);
    weeksWithActivity.add(weekStart.toISOString().split('T')[0]);
  });

  return (weeksWithActivity.size / 8) * 100;
}

/**
 * Get Monday of the week for a given date
 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get user training settings
 */
async function getUserTrainingSettings(userId: string): Promise<Partial<UserSettings>> {
  const { data } = await supabase
    .from('user_settings')
    .select('training_mode, preferred_weekly_volume_km, last_mode_transition_date')
    .eq('user_id', userId)
    .maybeSingle();

  return data || { training_mode: 'goal_oriented' };
}

/**
 * Get target weekly volume for maintenance mode
 */
export async function getMaintenanceVolume(userId: string): Promise<number> {
  const settings = await getUserTrainingSettings(userId);

  // User override takes priority
  if (settings.preferred_weekly_volume_km) {
    return settings.preferred_weekly_volume_km;
  }

  // Otherwise calculate from history
  const historicalVolume = await calculateHistoricalVolume(userId);

  // If no history, use safe default based on experience
  if (historicalVolume === 0) {
    return 40; // 40km/week default for beginners
  }

  return historicalVolume;
}
