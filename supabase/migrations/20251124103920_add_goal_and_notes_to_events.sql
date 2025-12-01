/*
  # Add goal and notes columns to events table

  1. Changes
    - Add `goal` column (text, nullable) to store race goals
    - Add `notes` column (text, nullable) to store additional event notes
  
  2. Purpose
    - Support additional event metadata for training planning
    - Store race-specific goals and notes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'goal'
  ) THEN
    ALTER TABLE events ADD COLUMN goal text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'notes'
  ) THEN
    ALTER TABLE events ADD COLUMN notes text;
  END IF;
END $$;
