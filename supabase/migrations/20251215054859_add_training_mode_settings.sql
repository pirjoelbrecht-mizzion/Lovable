/*
  # Add Training Mode Settings

  1. Overview
    Extends user_settings to support maintenance and off-season training modes.
    Enables users to train effectively without a scheduled race goal.

  2. Changes
    - Add `training_mode` column for mode selection (goal_oriented, maintenance, off_season, custom)
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_training_mode_check'
  ) THEN
    ALTER TABLE user_settings
    ADD CONSTRAINT user_settings_training_mode_check
    CHECK (training_mode IN ('goal_oriented', 'maintenance', 'off_season', 'custom'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_preferred_weekly_volume_km_check'
  ) THEN
    ALTER TABLE user_settings
    ADD CONSTRAINT user_settings_preferred_weekly_volume_km_check
    CHECK (preferred_weekly_volume_km IS NULL OR (preferred_weekly_volume_km >= 0 AND preferred_weekly_volume_km <= 300));
  END IF;
END $$;

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
