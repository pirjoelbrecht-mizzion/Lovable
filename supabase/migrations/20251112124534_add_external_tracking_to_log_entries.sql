/*
  # Add External Activity Tracking to Log Entries

  1. Changes
    - Add `external_id` column to track IDs from external sources (Strava, Garmin, etc.)
    - Add `data_source` column to identify which service the activity came from
    - Add index on external_id and data_source for efficient duplicate checking
    - Add unique constraint to prevent duplicate imports

  2. Notes
    - These columns allow the app to sync activities from wearables without creating duplicates
    - The unique constraint ensures each external activity is only imported once per user
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'log_entries' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN external_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'log_entries' AND column_name = 'data_source'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN data_source text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_log_entries_external_id ON log_entries(user_id, external_id, data_source);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'log_entries_external_unique'
  ) THEN
    ALTER TABLE log_entries 
    ADD CONSTRAINT log_entries_external_unique 
    UNIQUE (user_id, external_id, data_source);
  END IF;
END $$;
