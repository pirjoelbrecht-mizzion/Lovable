/*
  # Fix Events Priority Column Type

  1. Changes
    - Drop existing priority column if it's the wrong type (integer)
    - Add priority column as text with proper CHECK constraint
    - Values: 'A' (Goal Race), 'B' (Secondary), 'C' (Training Race)
  
  2. Purpose
    - Fixes type mismatch between code (sending 'A'/'B'/'C' strings) and database (expecting integer)
    - Ensures race priority is stored correctly for taper calculations
*/

-- Drop the existing priority column if it exists and is wrong type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' 
    AND column_name = 'priority'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE events DROP COLUMN priority;
  END IF;
END $$;

-- Add priority column with correct type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' 
    AND column_name = 'priority'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE events ADD COLUMN priority text CHECK (priority IN ('A', 'B', 'C'));
  END IF;
END $$;

-- Add comment explaining priority usage
COMMENT ON COLUMN events.priority IS 'Race priority: A = Goal Race (full taper), B = Secondary/Tune-up (partial taper), C = Training Race (no taper). Only applies to race-type events.';