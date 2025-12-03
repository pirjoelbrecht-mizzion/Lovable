/*
  # Add type column to log_entries table

  1. Changes
    - Add `type` column to `log_entries` table to store activity type
    - Default value is 'run' for existing entries
    - Common types: 'run', 'trail_run', 'long_run', 'race', 'workout', 'easy_run', 'recovery_run', etc.
  
  2. Notes
    - Uses text type to allow flexible activity type values
    - No constraint on values to allow for various activity types
    - Existing entries will have 'run' as default type
*/

-- Add type column to log_entries table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'type'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN type text DEFAULT 'run';
    RAISE NOTICE 'Added type column to log_entries table';
  ELSE
    RAISE NOTICE 'Column type already exists in log_entries table';
  END IF;
END $$;
