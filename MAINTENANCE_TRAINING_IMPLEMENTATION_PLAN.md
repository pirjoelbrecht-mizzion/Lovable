# Maintenance & Off-Season Training System - Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for adding maintenance and off-season training capabilities to the Adaptive Ultra Training Coach. Currently, the system requires a race goal to generate any training plan. This enhancement enables intelligent training without a race target, supporting post-race recovery, fitness maintenance, and base building.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Database Schema Changes](#database-schema-changes)
3. [Core Logic Implementation](#core-logic-implementation)
4. [User Interface Changes](#user-interface-changes)
5. [Integration Points](#integration-points)
6. [Testing Strategy](#testing-strategy)
7. [Rollout Plan](#rollout-plan)

---

## 1. System Requirements

### 1.1 Functional Requirements

**FR-1: Post-Race Automatic Transition**
- System detects when user completes a scheduled race (±3 days window)
- Automatically generates 2-3 week transition/recovery plan
- Shows confirmation UI: "We've started your 2-week transition recovery. Want to adjust it?"
- User can accept, modify duration, or skip

**FR-2: Maintenance Mode Training**
- When no race scheduled and not in post-race recovery: Enter maintenance mode
- Calculate weekly volume from historical 8-week average (excluding race & transition weeks)
- Generate 80/20 training split (80% easy, 20% moderate)
- Include 1 long run per week at typical distance
- Optional 1 tempo or hill session per week
- No progressive overload, focus on consistency

**FR-3: Distant Race Base Building**
- If race is 16+ weeks away: Progressive base building mode
- Start at current average weekly volume
- Gradually increase by 5-10% every 3-4 weeks
- Focus on aerobic development and vertical gain
- Prepare foundation for race-specific training

**FR-4: User Training Mode Selection**
- Add "Training Mode" setting with options:
  - `goal_oriented` - Race-focused (current behavior)
  - `maintenance` - Fitness maintenance, no race
  - `off_season` - Recovery and base building
  - `custom` - User-defined targets
- Store mode preference in user_settings

**FR-5: Volume Override**
- Calculate default volume from 8-week average
- Allow user to manually override: "Preferred maintenance weekly volume: ___ km"
- System respects override while maintaining safety guardrails
- Still enforces ACWR and injury prevention rules

**FR-6: Periodic Race Goal Nudges**
- Every 28-42 days in maintenance mode, check:
  - Training consistency
  - Weekly load plateau
  - Improvement metrics
- Show gentle suggestion: "Ready to choose your next goal race? Setting one can improve training structure."
- Never force race selection
- User can dismiss or snooze for 30 days

### 1.2 Non-Functional Requirements

**NFR-1: Data Safety**
- All historical data preserved during mode transitions
- No data loss when switching between modes
- Graceful degradation if data unavailable

**NFR-2: Performance**
- Mode detection and calculation < 500ms
- UI updates instantaneous
- Background calculations non-blocking

**NFR-3: User Experience**
- Clear messaging about current training mode
- Smooth transitions between modes
- No jarring changes to existing workflows

---

## 2. Database Schema Changes

### 2.1 Extend user_settings Table

**Migration File:** `20251216000000_add_training_mode_settings.sql`

```sql
/*
  # Add Training Mode Settings

  1. Overview
    Extends user_settings to support maintenance and off-season training modes.
    Enables users to train effectively without a scheduled race goal.

  2. Changes
    - Add `training_mode` column for mode selection
    - Add `preferred_weekly_volume_km` for manual volume override
    - Add `last_mode_transition_date` to track mode changes
    - Add `race_goal_nudge_last_shown` for periodic reminders
    - Add `race_goal_nudge_snoozed_until` for user dismissals

  3. Security
    - Existing RLS policies apply (users can only modify their own settings)
*/

-- Add training mode columns to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS training_mode TEXT DEFAULT 'goal_oriented',
ADD COLUMN IF NOT EXISTS preferred_weekly_volume_km NUMERIC,
ADD COLUMN IF NOT EXISTS last_mode_transition_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS race_goal_nudge_last_shown TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS race_goal_nudge_snoozed_until TIMESTAMPTZ;

-- Add constraints
ALTER TABLE user_settings
ADD CONSTRAINT user_settings_training_mode_check
CHECK (training_mode IN ('goal_oriented', 'maintenance', 'off_season', 'custom'));

ALTER TABLE user_settings
ADD CONSTRAINT user_settings_preferred_weekly_volume_km_check
CHECK (preferred_weekly_volume_km IS NULL OR (preferred_weekly_volume_km >= 0 AND preferred_weekly_volume_km <= 300));

-- Create index for mode queries
CREATE INDEX IF NOT EXISTS idx_user_settings_training_mode
ON user_settings(training_mode, last_mode_transition_date);

-- Comments
COMMENT ON COLUMN user_settings.training_mode IS
  'Current training mode: goal_oriented (race focus), maintenance (fitness maintenance), off_season (recovery/base building), custom (user-defined)';

COMMENT ON COLUMN user_settings.preferred_weekly_volume_km IS
  'User-specified weekly volume target for maintenance mode. NULL means use calculated average.';

COMMENT ON COLUMN user_settings.last_mode_transition_date IS
  'Timestamp of last training mode change. Used for transition tracking and analytics.';

COMMENT ON COLUMN user_settings.race_goal_nudge_last_shown IS
  'Last time we showed the "set a race goal" suggestion in maintenance mode.';

COMMENT ON COLUMN user_settings.race_goal_nudge_snoozed_until IS
  'User requested to hide race goal suggestions until this date.';
```

### 2.2 Create training_mode_history Table

**Migration File:** `20251216000001_create_training_mode_history.sql`

```sql
/*
  # Training Mode History

  1. Overview
    Tracks user training mode changes over time for analytics and insights.
    Enables understanding of training patterns and mode effectiveness.

  2. New Table
    - `training_mode_history`
      - Records each mode transition
      - Stores context (reason, triggered by, etc.)
      - Links to race if transition is race-related

  3. Security
    - Enable RLS
    - Users can only view their own history
*/

CREATE TABLE IF NOT EXISTS training_mode_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Mode Change
  from_mode TEXT,
  to_mode TEXT NOT NULL,
  transition_date TIMESTAMPTZ DEFAULT now(),

  -- Context
  trigger_type TEXT, -- 'race_completed', 'race_scheduled', 'user_manual', 'automatic', 'distant_race'
  race_id UUID REFERENCES events(id) ON DELETE SET NULL,
  reason TEXT,
  
  -- Snapshot at transition
  weekly_volume_at_transition NUMERIC,
  fitness_score_at_transition NUMERIC,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT training_mode_history_from_mode_check
  CHECK (from_mode IS NULL OR from_mode IN ('goal_oriented', 'maintenance', 'off_season', 'custom')),
  
  CONSTRAINT training_mode_history_to_mode_check
  CHECK (to_mode IN ('goal_oriented', 'maintenance', 'off_season', 'custom')),
  
  CONSTRAINT training_mode_history_trigger_type_check
  CHECK (trigger_type IN ('race_completed', 'race_scheduled', 'user_manual', 'automatic', 'distant_race', 'system'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_mode_history_user_date
ON training_mode_history(user_id, transition_date DESC);

CREATE INDEX IF NOT EXISTS idx_training_mode_history_race
ON training_mode_history(race_id)
WHERE race_id IS NOT NULL;

-- Enable RLS
ALTER TABLE training_mode_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own mode history"
  ON training_mode_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mode history"
  ON training_mode_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE training_mode_history IS
  'Historical record of training mode transitions for analytics and user insights';

COMMENT ON COLUMN training_mode_history.trigger_type IS
  'What triggered this mode change: race_completed, race_scheduled, user_manual, automatic, distant_race, system';
```

### 2.3 Add type column to log_entries

**Note:** Already exists in migration `20251203144737_add_type_column_to_log_entries.sql`

Verify the `type` column includes `'Race'` as a valid value for detecting race completions.

---

## 3. Core Logic Implementation

### 3.1 Training Mode Detection Service

**File:** `src/services/trainingModeDetection.ts`

```typescript
/**
 * Training Mode Detection Service
 * 
 * Automatically detects and manages training mode transitions based on:
 * - Race calendar
 * - Recent race completions
 * - Historical training load
 * - User preferences
 */

import { supabase } from '@/lib/supabase';
import type { UserSettings } from '@/lib/userSettings';
import { getActivePriorityRace } from '@/utils/races';
import { syncLogEntries } from '@/lib/database';
import type { LogEntry, Race } from '@/types';

export type TrainingMode = 'goal_oriented' | 'maintenance' | 'off_season' | 'custom';
export type TriggerType = 'race_completed' | 'race_scheduled' | 'user_manual' | 'automatic' | 'distant_race' | 'system';

export interface ModeDetectionResult {
  recommendedMode: TrainingMode;
  currentMode: TrainingMode;
  shouldTransition: boolean;
  reason: string;
  context: {
    upcomingRace?: Race;
    weeksToRace?: number;
    recentRaceCompletion?: {
      race: Race;
      daysAgo: number;
      logEntry: LogEntry;
    };
    averageWeeklyVolume?: number;
    recentConsistency?: number;
  };
}

interface TransitionOptions {
  triggerType: TriggerType;
  raceId?: string;
  reason?: string;
  userInitiated?: boolean;
}

/**
 * Detect appropriate training mode based on current situation
 */
export async function detectTrainingMode(userId: string): Promise<ModeDetectionResult> {
  const [settings, raceData, recentActivity] = await Promise.all([
    getUserTrainingSettings(userId),
    getActivePriorityRace(),
    detectRecentRaceCompletion(userId),
  ]);

  const currentMode = settings.training_mode || 'goal_oriented';
  const { race: upcomingRace, wTo: weeksToRace } = raceData;

  // Scenario 1: Recently completed a race (within 2-4 weeks)
  if (recentActivity) {
    const daysAgo = recentActivity.daysAgo;
    const transitionWeeks = getTransitionDuration(recentActivity.race);
    const transitionDays = transitionWeeks * 7;

    if (daysAgo <= transitionDays) {
      return {
        recommendedMode: 'off_season',
        currentMode,
        shouldTransition: currentMode !== 'off_season',
        reason: `Recent race completion: ${recentActivity.race.name} (${daysAgo} days ago). Recovery phase recommended.`,
        context: {
          recentRaceCompletion: recentActivity,
          averageWeeklyVolume: await calculateHistoricalVolume(userId),
        },
      };
    }
  }

  // Scenario 2: Race scheduled and close (< 16 weeks)
  if (upcomingRace && weeksToRace && weeksToRace < 16) {
    return {
      recommendedMode: 'goal_oriented',
      currentMode,
      shouldTransition: currentMode !== 'goal_oriented',
      reason: `Goal race approaching: ${upcomingRace.name} in ${weeksToRace} weeks. Race-focused training recommended.`,
      context: {
        upcomingRace,
        weeksToRace,
        averageWeeklyVolume: await calculateHistoricalVolume(userId),
      },
    };
  }

  // Scenario 3: Race scheduled but distant (16+ weeks)
  if (upcomingRace && weeksToRace && weeksToRace >= 16) {
    return {
      recommendedMode: 'maintenance', // Base building with gradual progression
      currentMode,
      shouldTransition: currentMode === 'goal_oriented',
      reason: `Goal race ${upcomingRace.name} is ${weeksToRace} weeks away. Base building recommended before race-specific training.`,
      context: {
        upcomingRace,
        weeksToRace,
        averageWeeklyVolume: await calculateHistoricalVolume(userId),
      },
    };
  }

  // Scenario 4: No race scheduled
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
 * Detect if user recently completed a race
 */
async function detectRecentRaceCompletion(userId: string): Promise<{
  race: Race;
  daysAgo: number;
  logEntry: LogEntry;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return null;

  // Get activities from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: activities } = await supabase
    .from('log_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('dateISO', thirtyDaysAgo.toISOString().split('T')[0])
    .order('dateISO', { ascending: false });

  if (!activities || activities.length === 0) return null;

  // Get all races
  const { data: races } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'race');

  if (!races || races.length === 0) return null;

  // Find matching race completion (±3 days window)
  for (const activity of activities) {
    const activityDate = new Date(activity.dateISO);
    
    for (const race of races) {
      const raceDate = new Date(race.date);
      const daysDiff = Math.abs((activityDate.getTime() - raceDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 3) {
        // Found a match
        const daysAgo = Math.floor((new Date().getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          race: {
            id: race.id,
            name: race.title,
            dateISO: race.date,
            distanceKm: race.distance_km || 0,
            elevationM: race.elevation_gain,
          },
          daysAgo,
          logEntry: activity as LogEntry,
        };
      }
    }
  }

  return null;
}

/**
 * Calculate transition duration based on race distance
 */
function getTransitionDuration(race: Race): number {
  const distance = race.distanceKm;
  
  if (distance >= 160) return 4; // 100M+ = 4 weeks
  if (distance >= 100) return 3; // 100K = 3 weeks
  if (distance >= 50) return 2;  // 50K/50M = 2 weeks
  return 2; // Default 2 weeks
}

/**
 * Calculate historical weekly volume (last 8 weeks, excluding race & transition)
 */
async function calculateHistoricalVolume(userId: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return 0;

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const { data: activities } = await supabase
    .from('log_entries')
    .select('dateISO, km')
    .eq('user_id', userId)
    .gte('dateISO', eightWeeksAgo.toISOString().split('T')[0]);

  if (!activities || activities.length === 0) return 0;

  // Group by week
  const weeklyTotals: Record<string, number> = {};
  
  activities.forEach(activity => {
    const date = new Date(activity.dateISO);
    const weekStart = getMonday(date);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    weeklyTotals[weekKey] = (weeklyTotals[weekKey] || 0) + activity.km;
  });

  const volumes = Object.values(weeklyTotals);
  if (volumes.length === 0) return 0;

  // Return average, excluding outliers (top 10% and bottom 10%)
  const sorted = volumes.sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.1);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  
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
    .select('dateISO')
    .eq('user_id', userId)
    .gte('dateISO', eightWeeksAgo.toISOString().split('T')[0]);

  if (!activities || activities.length === 0) return 0;

  const weeksWithActivity = new Set<string>();
  
  activities.forEach(activity => {
    const date = new Date(activity.dateISO);
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
 * Transition to a new training mode
 */
export async function transitionTrainingMode(
  userId: string,
  newMode: TrainingMode,
  options: TransitionOptions
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return false;

  const currentSettings = await getUserTrainingSettings(userId);
  const oldMode = currentSettings.training_mode || 'goal_oriented';

  // Update user settings
  const { error: settingsError } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      training_mode: newMode,
      last_mode_transition_date: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (settingsError) {
    console.error('Error updating training mode:', settingsError);
    return false;
  }

  // Record history
  const avgVolume = await calculateHistoricalVolume(userId);
  
  const { error: historyError } = await supabase
    .from('training_mode_history')
    .insert({
      user_id: userId,
      from_mode: oldMode,
      to_mode: newMode,
      trigger_type: options.triggerType,
      race_id: options.raceId,
      reason: options.reason,
      weekly_volume_at_transition: avgVolume,
      transition_date: new Date().toISOString(),
    });

  if (historyError) {
    console.error('Error recording mode history:', historyError);
    // Non-critical, continue
  }

  return true;
}

/**
 * Check if user should see race goal nudge
 */
export async function shouldShowRaceGoalNudge(userId: string): Promise<boolean> {
  const settings = await getUserTrainingSettings(userId);
  
  // Only show in maintenance or off_season mode
  if (settings.training_mode !== 'maintenance' && settings.training_mode !== 'off_season') {
    return false;
  }

  // Check if snoozed
  if (settings.race_goal_nudge_snoozed_until) {
    const snoozeDate = new Date(settings.race_goal_nudge_snoozed_until);
    if (snoozeDate > new Date()) {
      return false;
    }
  }

  // Check last shown time
  if (settings.race_goal_nudge_last_shown) {
    const lastShown = new Date(settings.race_goal_nudge_last_shown);
    const daysSinceLastShown = (new Date().getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24);
    
    // Show every 28-42 days (randomized to avoid predictability)
    const threshold = 28 + Math.random() * 14;
    
    if (daysSinceLastShown < threshold) {
      return false;
    }
  }

  return true;
}

/**
 * Mark race goal nudge as shown
 */
export async function markRaceGoalNudgeShown(userId: string): Promise<void> {
  await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      race_goal_nudge_last_shown: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });
}

/**
 * Snooze race goal nudge for 30 days
 */
export async function snoozeRaceGoalNudge(userId: string, days: number = 30): Promise<void> {
  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + days);

  await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      race_goal_nudge_snoozed_until: snoozeUntil.toISOString(),
    }, {
      onConflict: 'user_id',
    });
}
```

### 3.2 Maintenance Plan Generator

**File:** `src/lib/adaptive-coach/maintenancePlanGenerator.ts`

```typescript
/**
 * Maintenance Plan Generator
 * 
 * Generates training plans for maintenance mode (no race goal).
 * Focuses on consistency, aerobic maintenance, and injury prevention.
 */

import type {
  AthleteProfile,
  WeeklyPlan,
  DailyPlan,
  WorkoutType,
} from './types';
import { getWorkoutsForPhase } from './workout-library';
import { calculateSafeVolumeRange } from './safety';

export interface MaintenancePlanInput {
  athlete: AthleteProfile;
  targetWeeklyVolume?: number; // User override or calculated
  includeWorkouts: boolean; // Include tempo/hill sessions
  preferLongRunDay?: 'saturday' | 'sunday'; // Long run preference
}

export interface MaintenancePlanResult {
  plan: WeeklyPlan;
  volumeBreakdown: {
    easy: number;
    moderate: number;
    long: number;
  };
  explanation: string;
}

/**
 * Generate maintenance week plan
 */
export function generateMaintenancePlan(input: MaintenancePlanInput): MaintenancePlanResult {
  const { athlete, targetWeeklyVolume, includeWorkouts, preferLongRunDay } = input;

  // Determine target volume
  const volume = targetWeeklyVolume || athlete.averageMileage || getDefaultVolume(athlete);
  
  // Safety check
  const safeRange = calculateSafeVolumeRange(athlete, 'base');
  const safeVolume = Math.max(safeRange.min, Math.min(volume, safeRange.max));

  // Apply 80/20 principle
  const easyVolume = safeVolume * 0.80;
  const moderateVolume = safeVolume * 0.20;

  // Allocate to days
  const days: DailyPlan[] = [];
  const longRunDay = preferLongRunDay || 'sunday';
  const longRunVolume = Math.min(safeVolume * 0.30, 25); // 30% of weekly or max 25km
  const remainingEasy = easyVolume - longRunVolume;

  // Monday: Rest or easy
  days.push({
    dayOfWeek: 1,
    date: '',
    type: 'easy',
    title: 'Easy Run',
    km: remainingEasy * 0.15,
    durationMin: (remainingEasy * 0.15) * 8,
    description: 'Easy recovery pace. Keep it conversational.',
    purpose: 'Active recovery',
    isHard: false,
  });

  // Tuesday: Easy
  days.push({
    dayOfWeek: 2,
    date: '',
    type: 'easy',
    title: 'Easy Run',
    km: remainingEasy * 0.20,
    durationMin: (remainingEasy * 0.20) * 8,
    description: 'Comfortable easy pace.',
    purpose: 'Aerobic maintenance',
    isHard: false,
  });

  // Wednesday: Tempo or Easy
  if (includeWorkouts) {
    days.push({
      dayOfWeek: 3,
      date: '',
      type: 'tempo',
      title: 'Tempo Run',
      km: moderateVolume * 0.60,
      durationMin: (moderateVolume * 0.60) * 6.5,
      description: 'Warm up 10min easy, 20-30min at comfortably hard pace (marathon effort), cool down 10min easy.',
      purpose: 'Lactate threshold maintenance',
      isHard: true,
    });
  } else {
    days.push({
      dayOfWeek: 3,
      date: '',
      type: 'easy',
      title: 'Easy Run',
      km: remainingEasy * 0.20,
      durationMin: (remainingEasy * 0.20) * 8,
      description: 'Easy conversational pace.',
      purpose: 'Aerobic maintenance',
      isHard: false,
    });
  }

  // Thursday: Easy
  days.push({
    dayOfWeek: 4,
    date: '',
    type: 'easy',
    title: 'Easy Run',
    km: remainingEasy * 0.20,
    durationMin: (remainingEasy * 0.20) * 8,
    description: 'Easy pace.',
    purpose: 'Recovery between workouts',
    isHard: false,
  });

  // Friday: Rest or Hill/Vert
  if (includeWorkouts && athlete.averageVertical && athlete.averageVertical > 500) {
    days.push({
      dayOfWeek: 5,
      date: '',
      type: 'hill_repeats',
      title: 'Hill Session',
      km: moderateVolume * 0.40,
      durationMin: (moderateVolume * 0.40) * 7,
      description: 'Warm up 15min easy, 6-8 hill repeats (2-3min uphill at hard effort), recover jog down, cool down 10min easy.',
      purpose: 'Vertical strength maintenance',
      isHard: true,
    });
  } else {
    days.push({
      dayOfWeek: 5,
      date: '',
      type: 'rest',
      title: 'Rest Day',
      km: 0,
      durationMin: 0,
      description: 'Complete rest or gentle cross-training (yoga, swimming).',
      purpose: 'Recovery',
      isHard: false,
    });
  }

  // Saturday: Easy or rest (depends on long run day)
  if (longRunDay === 'sunday') {
    days.push({
      dayOfWeek: 6,
      date: '',
      type: 'easy',
      title: 'Easy Run',
      km: remainingEasy * 0.15,
      durationMin: (remainingEasy * 0.15) * 8,
      description: 'Short easy run before long run tomorrow.',
      purpose: 'Active recovery',
      isHard: false,
    });
  } else {
    days.push({
      dayOfWeek: 6,
      date: '',
      type: 'long',
      title: 'Long Run',
      km: longRunVolume,
      durationMin: longRunVolume * 8,
      description: 'Long easy run. Stay aerobic, practice nutrition.',
      purpose: 'Aerobic endurance maintenance',
      isHard: false,
    });
  }

  // Sunday: Long run or rest
  if (longRunDay === 'sunday') {
    days.push({
      dayOfWeek: 0,
      date: '',
      type: 'long',
      title: 'Long Run',
      km: longRunVolume,
      durationMin: longRunVolume * 8,
      description: 'Long easy run. Stay aerobic, practice nutrition.',
      purpose: 'Aerobic endurance maintenance',
      isHard: false,
    });
  } else {
    days.push({
      dayOfWeek: 0,
      date: '',
      type: 'rest',
      title: 'Rest Day',
      km: 0,
      durationMin: 0,
      description: 'Complete rest after long run.',
      purpose: 'Recovery',
      isHard: false,
    });
  }

  const plan: WeeklyPlan = {
    weekNumber: 1,
    phase: 'base',
    startDate: '',
    endDate: '',
    targetMileage: safeVolume,
    targetVert: (athlete.averageVertical || 0) * 0.8,
    days,
    coachNotes: `Maintenance training week. Focus on consistency and enjoying your runs. No progressive overload required.`,
    emphasis: 'aerobic',
    recoveryRatio: athlete.recoveryRatio || '3:1',
  };

  const explanation = `This is a maintenance training week designed to preserve your fitness without a specific race goal. 
  
Total Volume: ${safeVolume.toFixed(1)}km following 80/20 training (${(easyVolume).toFixed(1)}km easy, ${(moderateVolume).toFixed(1)}km moderate).

Key Sessions:
- Long Run: ${longRunVolume.toFixed(1)}km on ${longRunDay === 'sunday' ? 'Sunday' : 'Saturday'}
${includeWorkouts ? `- Tempo Run: ${(moderateVolume * 0.60).toFixed(1)}km on Wednesday` : ''}
${includeWorkouts && athlete.averageVertical && athlete.averageVertical > 500 ? `- Hill Session: ${(moderateVolume * 0.40).toFixed(1)}km on Friday` : ''}

The goal is consistent training, not progressive overload. Adjust as needed based on how you feel.`;

  return {
    plan,
    volumeBreakdown: {
      easy: easyVolume,
      moderate: includeWorkouts ? moderateVolume : 0,
      long: longRunVolume,
    },
    explanation,
  };
}

/**
 * Get default volume for athlete category if no history available
 */
function getDefaultVolume(athlete: AthleteProfile): number {
  const category = athlete.category || 'Cat1';
  
  if (category === 'Cat2') {
    return 60; // Experienced: 60km/week default
  }
  
  return 40; // Beginner: 40km/week default
}

/**
 * Adjust maintenance volume over time (very gradual progression)
 */
export function progressMaintenanceVolume(
  currentVolume: number,
  weekNumber: number,
  athlete: AthleteProfile
): number {
  // Increase by 5% every 4 weeks (if athlete wants progression)
  const progressionCycle = Math.floor(weekNumber / 4);
  const progressionFactor = 1 + (progressionCycle * 0.05);
  
  const newVolume = currentVolume * progressionFactor;
  
  // Cap at athlete's volume ceiling
  const ceiling = athlete.volumeCeiling || (currentVolume * 1.25);
  
  return Math.min(newVolume, ceiling);
}
```

### 3.3 Extend Macrocycle Generator for Maintenance

**File:** `src/lib/adaptive-coach/macrocycle.ts` (modify existing)

Add function to handle no-race scenario:

```typescript
/**
 * Generate maintenance macrocycle (no race goal)
 */
export function generateMaintenanceMacrocycle(input: {
  athlete: AthleteProfile;
  startDate?: string;
  durationWeeks?: number;
}): MacrocyclePlan {
  const startDate = input.startDate || getMondayOfWeek();
  const durationWeeks = input.durationWeeks || 12; // Default 12-week maintenance cycle
  
  const weeks: MacrocycleWeek[] = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < durationWeeks; i++) {
    const weekStart = currentDate.toISOString().slice(0, 10);
    const weekEnd = new Date(currentDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    weeks.push({
      weekNumber: i + 1,
      phase: 'base', // Maintenance uses base phase logic
      startDate: weekStart,
      endDate: weekEnd.toISOString().slice(0, 10),
      phaseWeek: i + 1,
    });

    currentDate.setDate(currentDate.getDate() + 7);
  }

  return {
    weeks,
    totalWeeks: durationWeeks,
    phaseBreakdown: {
      transition: 0,
      base: durationWeeks,
      intensity: 0,
      specificity: 0,
      taper: 0,
      goal: 0,
    },
    raceDate: '',
    startDate,
    notes: [
      'Maintenance training cycle - no specific race goal',
      'Focus on consistent aerobic training',
      'Adjust volume based on feel and life circumstances',
      'Optional: Set a race goal to begin structured training',
    ],
  };
}
```

---

## 4. User Interface Changes

### 4.1 Training Mode Selector Component

**File:** `src/components/TrainingModeSelector.tsx`

```typescript
/**
 * Training Mode Selector
 * 
 * Allows users to view and change their training mode.
 * Shows current mode, explains each option, and handles transitions.
 */

import { useState, useEffect } from 'react';
import { useT } from '@/i18n';
import { getUserSettings, updateUserSettings } from '@/lib/userSettings';
import { 
  detectTrainingMode, 
  transitionTrainingMode,
  type TrainingMode,
  type ModeDetectionResult 
} from '@/services/trainingModeDetection';

export default function TrainingModeSelector() {
  const t = useT();
  const [currentMode, setCurrentMode] = useState<TrainingMode>('goal_oriented');
  const [detection, setDetection] = useState<ModeDetectionResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TrainingMode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentMode();
  }, []);

  async function loadCurrentMode() {
    setLoading(true);
    const settings = await getUserSettings();
    const mode = settings.training_mode || 'goal_oriented';
    setCurrentMode(mode);

    // Get detection result
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const result = await detectTrainingMode(user.id);
      setDetection(result);
    }

    setLoading(false);
  }

  async function handleModeChange(newMode: TrainingMode) {
    setSelectedMode(newMode);
    setShowConfirmation(true);
  }

  async function confirmModeChange() {
    if (!selectedMode) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const success = await transitionTrainingMode(user.id, selectedMode, {
      triggerType: 'user_manual',
      reason: 'User manually changed training mode',
      userInitiated: true,
    });

    if (success) {
      await updateUserSettings({ training_mode: selectedMode });
      setCurrentMode(selectedMode);
      setShowConfirmation(false);
      setSelectedMode(null);
    }
  }

  const modes: Array<{
    id: TrainingMode;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      id: 'goal_oriented',
      label: 'Race-Focused',
      description: 'Training for a specific race goal. Structured periodization with progressive overload.',
      icon: '🎯',
    },
    {
      id: 'maintenance',
      label: 'Fitness Maintenance',
      description: 'No specific race goal. Focus on consistency and preserving current fitness level.',
      icon: '🔄',
    },
    {
      id: 'off_season',
      label: 'Off-Season / Recovery',
      description: 'Post-race recovery or off-season training. Reduced volume, aerobic base building.',
      icon: '🌱',
    },
    {
      id: 'custom',
      label: 'Custom',
      description: 'Define your own training targets and structure.',
      icon: '⚙️',
    },
  ];

  if (loading) return <div>Loading...</div>;

  return (
    <div className="training-mode-selector">
      <h3>Training Mode</h3>
      
      {/* Show recommendation if different from current */}
      {detection && detection.shouldTransition && (
        <div className="mode-recommendation">
          <div className="recommendation-icon">💡</div>
          <div className="recommendation-content">
            <strong>Suggested Mode Change</strong>
            <p>{detection.reason}</p>
            <button onClick={() => handleModeChange(detection.recommendedMode)}>
              Switch to {modes.find(m => m.id === detection.recommendedMode)?.label}
            </button>
          </div>
        </div>
      )}

      {/* Mode options */}
      <div className="mode-options">
        {modes.map(mode => (
          <div 
            key={mode.id}
            className={`mode-card ${currentMode === mode.id ? 'active' : ''}`}
            onClick={() => currentMode !== mode.id && handleModeChange(mode.id)}
          >
            <div className="mode-icon">{mode.icon}</div>
            <div className="mode-content">
              <h4>{mode.label}</h4>
              <p>{mode.description}</p>
            </div>
            {currentMode === mode.id && (
              <div className="mode-badge">Current</div>
            )}
          </div>
        ))}
      </div>

      {/* Confirmation modal */}
      {showConfirmation && selectedMode && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h3>Change Training Mode?</h3>
            <p>
              You're about to switch from <strong>{modes.find(m => m.id === currentMode)?.label}</strong> to{' '}
              <strong>{modes.find(m => m.id === selectedMode)?.label}</strong>.
            </p>
            <p>Your training plan will be regenerated based on this new mode.</p>
            <div className="modal-actions">
              <button onClick={() => setShowConfirmation(false)}>Cancel</button>
              <button onClick={confirmModeChange} className="primary">
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.2 Post-Race Transition Banner

**File:** `src/components/PostRaceTransitionBanner.tsx`

```typescript
/**
 * Post-Race Transition Banner
 * 
 * Automatically shown when user completes a race.
 * Offers automatic transition to recovery mode.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { 
  detectTrainingMode, 
  transitionTrainingMode 
} from '@/services/trainingModeDetection';
import { updateUserSettings } from '@/lib/userSettings';

export default function PostRaceTransitionBanner() {
  const t = useT();
  const [show, setShow] = useState(false);
  const [raceInfo, setRaceInfo] = useState<{
    raceName: string;
    daysAgo: number;
    transitionWeeks: number;
  } | null>(null);

  useEffect(() => {
    checkForRecentRace();
  }, []);

  async function checkForRecentRace() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const detection = await detectTrainingMode(user.id);
    
    if (
      detection.recommendedMode === 'off_season' &&
      detection.context.recentRaceCompletion &&
      detection.shouldTransition
    ) {
      setRaceInfo({
        raceName: detection.context.recentRaceCompletion.race.name,
        daysAgo: detection.context.recentRaceCompletion.daysAgo,
        transitionWeeks: 2, // TODO: Calculate based on race distance
      });
      setShow(true);
    }
  }

  async function acceptTransition() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await transitionTrainingMode(user.id, 'off_season', {
      triggerType: 'race_completed',
      reason: `Automatic transition after completing ${raceInfo?.raceName}`,
    });

    await updateUserSettings({ training_mode: 'off_season' });
    setShow(false);
  }

  async function dismissTransition() {
    // Don't transition, keep current mode
    setShow(false);
  }

  if (!show || !raceInfo) return null;

  return (
    <div className="post-race-banner">
      <div className="banner-icon">🎉</div>
      <div className="banner-content">
        <h3>Congratulations on completing {raceInfo.raceName}!</h3>
        <p>
          We've started your {raceInfo.transitionWeeks}-week recovery/transition plan. 
          This will help you recover properly before resuming normal training.
        </p>
        <div className="banner-actions">
          <button onClick={acceptTransition} className="primary">
            Start Recovery Plan
          </button>
          <button onClick={dismissTransition} className="secondary">
            Keep Current Plan
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 4.3 Race Goal Nudge Component

**File:** `src/components/RaceGoalNudge.tsx`

```typescript
/**
 * Race Goal Nudge
 * 
 * Gentle reminder shown every 4-6 weeks in maintenance mode
 * suggesting user set a race goal.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { 
  shouldShowRaceGoalNudge,
  markRaceGoalNudgeShown,
  snoozeRaceGoalNudge
} from '@/services/trainingModeDetection';

export default function RaceGoalNudge() {
  const t = useT();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    checkShouldShow();
  }, []);

  async function checkShouldShow() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const shouldShow = await shouldShowRaceGoalNudge(user.id);
    setShow(shouldShow);
  }

  async function handleSetRaceGoal() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await markRaceGoalNudgeShown(user.id);
    }
    
    navigate('/races');
    setShow(false);
  }

  async function handleSnooze() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await snoozeRaceGoalNudge(user.id, 30);
    }
    
    setShow(false);
  }

  async function handleDismiss() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await markRaceGoalNudgeShown(user.id);
    }
    
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="race-goal-nudge">
      <div className="nudge-icon">🎯</div>
      <div className="nudge-content">
        <h4>Ready to choose your next goal race?</h4>
        <p>
          Setting a race goal can add structure and motivation to your training.
          We'll create a personalized plan to get you ready.
        </p>
        <div className="nudge-actions">
          <button onClick={handleSetRaceGoal} className="primary">
            Browse Races
          </button>
          <button onClick={handleSnooze} className="secondary">
            Remind Me Later
          </button>
          <button onClick={handleDismiss} className="text">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 4.4 Update AdaptiveCoachPanel

**File:** `src/components/AdaptiveCoachPanel.tsx` (modify existing)

Add support for no-race scenario:

```typescript
// Add to imports
import { detectTrainingMode } from '@/services/trainingModeDetection';
import { generateMaintenancePlan } from '@/lib/adaptive-coach/maintenancePlanGenerator';
import { generateMaintenanceMacrocycle } from '@/lib/adaptive-coach/macrocycle';

// Modify plan generation function
async function generateWeeklyPlan() {
  setLoading(true);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    setLoading(false);
    return;
  }

  try {
    // Detect current training mode
    const modeDetection = await detectTrainingMode(user.id);
    
    // Get race (if any)
    const { race: nextRace } = await getActivePriorityRace();
    
    // If no race and in maintenance mode, generate maintenance plan
    if (!nextRace && (modeDetection.currentMode === 'maintenance' || modeDetection.currentMode === 'off_season')) {
      const profile = await buildAthleteProfile();
      const settings = await getUserSettings();
      
      const maintenancePlan = generateMaintenancePlan({
        athlete: profile,
        targetWeeklyVolume: settings.preferred_weekly_volume_km,
        includeWorkouts: true,
        preferLongRunDay: 'sunday',
      });
      
      setCurrentPlan(maintenancePlan.plan);
      setExplanation(maintenancePlan.explanation);
      
      // Generate safety check
      const safety = checkWeeklyPlanSafety(maintenancePlan.plan, profile);
      setSafetyCheck(safety);
      
      if (onPlanGenerated) {
        onPlanGenerated(maintenancePlan.plan);
      }
      
      setLoading(false);
      return;
    }
    
    // Otherwise, use existing race-based logic
    if (!nextRace) {
      setExplanation('Please set a race goal to generate a training plan, or switch to Maintenance mode in Settings.');
      setLoading(false);
      return;
    }
    
    // ... existing race-based plan generation ...
    
  } catch (error) {
    console.error('Error generating plan:', error);
    setExplanation('Error generating training plan. Please try again.');
  }
  
  setLoading(false);
}
```

### 4.5 Settings Page Integration

**File:** `src/pages/Settings.tsx` (modify existing)

Add training mode section:

```typescript
import TrainingModeSelector from '@/components/TrainingModeSelector';
import { getUserSettings, updateUserSettings } from '@/lib/userSettings';

// Add to settings page
function SettingsPage() {
  const [preferredVolume, setPreferredVolume] = useState<number | null>(null);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  async function loadSettings() {
    const settings = await getUserSettings();
    setPreferredVolume(settings.preferred_weekly_volume_km || null);
  }
  
  async function handleVolumeChange(value: number | null) {
    setPreferredVolume(value);
    await updateUserSettings({
      preferred_weekly_volume_km: value || null,
    });
  }
  
  return (
    <div className="settings-page">
      {/* ... existing settings ... */}
      
      <section className="settings-section">
        <h2>Training Mode</h2>
        <TrainingModeSelector />
        
        <div className="volume-override">
          <h3>Weekly Volume Target</h3>
          <p>Override the calculated weekly volume for maintenance training.</p>
          <input
            type="number"
            value={preferredVolume || ''}
            onChange={(e) => handleVolumeChange(e.target.value ? Number(e.target.value) : null)}
            placeholder="Auto-calculated from history"
            min="0"
            max="300"
          />
          <span className="unit">km/week</span>
        </div>
      </section>
      
      {/* ... rest of settings ... */}
    </div>
  );
}
```

---

## 5. Integration Points

### 5.1 Update Planner Page

**File:** `src/pages/Planner.tsx`

- Check training mode before generating plan
- Show appropriate UI based on mode
- Display maintenance plan when no race scheduled

### 5.2 Update Coach Page

**File:** `src/pages/Coach.tsx`

- Integrate `PostRaceTransitionBanner`
- Show `RaceGoalNudge` when appropriate
- Adjust coaching messages based on training mode

### 5.3 Update Home/Dashboard

**File:** `src/pages/Home.tsx`

- Display current training mode
- Show mode-specific metrics
- Link to mode settings

### 5.4 Update useAdaptiveTrainingPlan Hook

**File:** `src/hooks/useAdaptiveTrainingPlan.ts`

- Add mode detection
- Handle maintenance plan generation
- Update decision engine to consider mode

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Test Files:**
- `src/services/trainingModeDetection.test.ts`
- `src/lib/adaptive-coach/maintenancePlanGenerator.test.ts`

**Test Cases:**
1. Mode detection with no race
2. Mode detection with recent race completion
3. Mode detection with distant race (16+ weeks)
4. Mode detection with close race (<16 weeks)
5. Maintenance plan generation (various athlete profiles)
6. Volume calculation from history
7. Consistency calculation
8. Nudge timing logic

### 6.2 Integration Tests

**Test Scenarios:**
1. User completes race → auto-transition prompt shown → accepts → enters off_season mode
2. User in maintenance mode for 30 days → nudge shown → dismisses → nudge not shown again for 30 days
3. User sets distant race → enters maintenance with gradual progression
4. User overrides weekly volume → plan respects override

### 6.3 Manual Testing Checklist

- [ ] Complete a race activity (Strava import or manual) → verify transition banner shows
- [ ] Accept transition → verify mode changes to off_season
- [ ] Generate maintenance plan without race → verify plan generated correctly
- [ ] Override weekly volume → verify plan uses override
- [ ] Wait 30 days in maintenance → verify nudge shows
- [ ] Snooze nudge → verify not shown for 30 days
- [ ] Set distant race (16+ weeks) → verify maintenance mode with progression
- [ ] Set close race (<16 weeks) → verify switches to goal_oriented mode

---

## 7. Rollout Plan

### Phase 1: Database & Core Logic (Week 1)
1. Apply database migrations
2. Implement trainingModeDetection service
3. Implement maintenancePlanGenerator
4. Update macrocycle generator
5. Unit tests

### Phase 2: UI Components (Week 2)
1. Build TrainingModeSelector
2. Build PostRaceTransitionBanner
3. Build RaceGoalNudge
4. Update Settings page
5. Component tests

### Phase 3: Integration (Week 3)
1. Update AdaptiveCoachPanel
2. Update Planner page
3. Update Coach page
4. Update Home/Dashboard
5. Integration tests

### Phase 4: Testing & Refinement (Week 4)
1. Manual testing
2. Bug fixes
3. Performance optimization
4. UI/UX refinement

### Phase 5: Documentation & Release (Week 5)
1. User documentation
2. In-app tutorials
3. Release notes
4. Gradual rollout to users

---

## 8. Success Metrics

**Quantitative:**
- % of users in each training mode
- Maintenance mode retention (users staying active without race goal)
- Transition acceptance rate (% accepting post-race recovery)
- Nudge conversion rate (% setting race after nudge)
- Training consistency in maintenance vs goal_oriented mode

**Qualitative:**
- User feedback on maintenance training
- Coach message relevance
- Mode transition smoothness
- Feature discoverability

---

## 9. Future Enhancements

**Post-Launch Considerations:**

1. **Smart Volume Adjustment**: ML model to predict optimal maintenance volume
2. **Seasonal Patterns**: Detect and adapt to user's annual training patterns
3. **Group Training Integration**: Maintenance mode with Unity community
4. **Alternative Goals**: Support non-race goals (fitness milestones, weight loss, etc.)
5. **Mode-Specific Insights**: Specialized analytics for each training mode
6. **Coach Personality Adaptation**: Different coaching tone for maintenance vs race mode

---

## Appendix A: Example User Flows

### Flow 1: Completing a Race

1. User completes 100K race (logged via Strava)
2. System detects race completion (within ±3 days of scheduled race)
3. PostRaceTransitionBanner appears: "Congratulations! We've started your 3-week recovery plan."
4. User clicks "Start Recovery Plan"
5. Mode transitions to `off_season`
6. training_mode_history record created
7. Next week plan generated with reduced volume (60% of peak)
8. Coach messages emphasize recovery and patience

### Flow 2: Training Without a Race

1. User has no races scheduled
2. System calculates 8-week average volume: 55km/week
3. Mode detection recommends `maintenance`
4. User sees suggestion in Settings: "No race scheduled. Switch to Maintenance mode?"
5. User switches to maintenance mode
6. Plan generated: 55km/week, 80/20 split, 1 long run, 1 tempo
7. Week 1-4: Consistent 55km
8. Week 5-8: Optional progression to 58km
9. Week 8: RaceGoalNudge shown: "Ready to set a goal?"
10. User dismisses → nudge snoozed for 30 days

### Flow 3: Distant Race

1. User schedules 100M race 20 weeks out
2. Mode detection: "Race is 20 weeks away. Base building recommended."
3. Mode: `maintenance` with progressive volume
4. Weeks 1-12: Base building, gradual progression
5. Week 12: System auto-checks weeks to race = 8 weeks
6. Suggestion: "Race approaching in 8 weeks. Switch to race-focused training?"
7. User accepts
8. Mode transitions to `goal_oriented`
9. Structured race plan begins (intensity → specificity → taper)

---

## Appendix B: Database Queries

### Check Mode Distribution
```sql
SELECT 
  training_mode,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_settings
WHERE training_mode IS NOT NULL
GROUP BY training_mode
ORDER BY user_count DESC;
```

### Recent Mode Transitions
```sql
SELECT 
  u.email,
  tmh.from_mode,
  tmh.to_mode,
  tmh.trigger_type,
  tmh.transition_date
FROM training_mode_history tmh
JOIN auth.users u ON u.id = tmh.user_id
WHERE tmh.transition_date >= NOW() - INTERVAL '7 days'
ORDER BY tmh.transition_date DESC;
```

### Users in Maintenance Mode Needing Nudge
```sql
SELECT 
  u.email,
  us.last_mode_transition_date,
  us.race_goal_nudge_last_shown,
  us.race_goal_nudge_snoozed_until
FROM user_settings us
JOIN auth.users u ON u.id = us.user_id
WHERE us.training_mode IN ('maintenance', 'off_season')
  AND (
    us.race_goal_nudge_last_shown IS NULL 
    OR us.race_goal_nudge_last_shown < NOW() - INTERVAL '28 days'
  )
  AND (
    us.race_goal_nudge_snoozed_until IS NULL
    OR us.race_goal_nudge_snoozed_until < NOW()
  );
```

---

## Document Version

- **Version:** 1.0
- **Date:** 2024-12-16
- **Author:** Adaptive Coach Implementation Team
- **Status:** Ready for Implementation

