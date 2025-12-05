/*
  # Add Flat Pace Mode Setting

  1. Changes
    - Add `flat_pace_mode` column to `user_settings` table
    - Supports three modes:
      - 'accurate' (default): Uses 30th percentile of flat paces
      - 'conservative': Uses 50th percentile (median)
      - 'fast': Uses 20th percentile

  2. Notes
    - This gives users psychological control over race predictions
    - 30th percentile better represents race-capable speed
    - Avoids underestimation from recovery runs
    - Scales automatically with fitness improvements
*/

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS flat_pace_mode TEXT DEFAULT 'accurate' CHECK (flat_pace_mode IN ('accurate', 'conservative', 'fast'));

-- Update existing rows to have the default value
UPDATE user_settings
SET flat_pace_mode = 'accurate'
WHERE flat_pace_mode IS NULL;