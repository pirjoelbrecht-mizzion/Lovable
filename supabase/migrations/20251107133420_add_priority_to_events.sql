/*
  # Add Race Priority Field to Events Table

  1. Schema Changes
    - Add `priority` column to `events` table
      - Values: 'A' (Goal Race), 'B' (Secondary/Tune-up), 'C' (Training Race)
      - Optional field (only applies to race-type events)
      - Default value: 'B' for race events

    - Add `notes` column to `events` table for additional race notes
      - Optional text field for race goals, strategies, etc.

  2. Migration Strategy
    - Add columns with safe defaults
    - No data modification needed (new fields are optional)
    - Maintains backward compatibility

  3. Purpose
    - Unifies race and event systems into single source of truth
    - Enables race priority-based taper calculations
    - Supports Race Mode simulation priority filtering
    - Allows training plan adjustments based on race importance
*/

-- Add priority column to events table
-- Only used when type is 'street' or 'trail' (race events)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'priority'
  ) THEN
    ALTER TABLE events ADD COLUMN priority text CHECK (priority IN ('A', 'B', 'C'));
  END IF;
END $$;

-- Add notes column to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'notes'
  ) THEN
    ALTER TABLE events ADD COLUMN notes text;
  END IF;
END $$;

-- Add goal column to events table (for race goal times/targets)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'goal'
  ) THEN
    ALTER TABLE events ADD COLUMN goal text;
  END IF;
END $$;

-- Create index for priority-based queries (race filtering)
CREATE INDEX IF NOT EXISTS idx_events_type_priority ON events(user_id, type, priority, date);

-- Add comment explaining priority usage
COMMENT ON COLUMN events.priority IS 'Race priority: A = Goal Race (full taper), B = Secondary/Tune-up (partial taper), C = Training Race (no taper). Only used for race-type events.';
COMMENT ON COLUMN events.notes IS 'Additional notes about the event, race strategy, or special considerations.';
COMMENT ON COLUMN events.goal IS 'Race goal or target (e.g., "Finish under 4h", "PB 3:15", "Complete 100K").';
