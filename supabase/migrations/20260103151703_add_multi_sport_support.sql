/*
  # Add Multi-Sport Support to Log Entries

  1. Changes
    - Add `counts_for_running_load` boolean to log_entries (default: true for backward compatibility)
    - Add `internal_sport_category` text to log_entries for normalized categorization
    - Add indexes for efficient filtering
    - Backfill existing entries with default values

  2. Sport Categories
    - run: Run, TrailRun, VirtualRun (counts toward all running metrics)
    - walk: Walk, Hike, SpeedWalk (partial fatigue only)
    - cross_train: Cycling, Skiing, Elliptical (partial fatigue only)
    - strength: WeightTraining, Crossfit (light fatigue only)
    - water: Swimming, Rowing
    - winter: Alpine/Nordic ski, Snowboard
    - other: Everything else

  3. Security
    - No RLS changes needed (inherits from log_entries table)
*/

-- Add counts_for_running_load column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'counts_for_running_load'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN counts_for_running_load boolean DEFAULT true;
    RAISE NOTICE 'Added counts_for_running_load column';
  END IF;
END $$;

-- Add internal_sport_category column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'internal_sport_category'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN internal_sport_category text DEFAULT 'run';
    RAISE NOTICE 'Added internal_sport_category column';
  END IF;
END $$;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_log_entries_counts_for_running_load
  ON log_entries(user_id, counts_for_running_load, date);

CREATE INDEX IF NOT EXISTS idx_log_entries_sport_category
  ON log_entries(user_id, internal_sport_category, date);

-- Backfill existing entries (all existing activities are runs)
UPDATE log_entries
SET
  counts_for_running_load = true,
  internal_sport_category = 'run'
WHERE
  counts_for_running_load IS NULL
  OR internal_sport_category IS NULL;
