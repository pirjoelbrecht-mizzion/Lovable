/*
  # Add elevation data to log entries

  1. Changes
    - Add elevation_gain column to log_entries table
    - Add elevation_stream column for detailed elevation data
    - Add distance_stream column for distance data points

  2. Notes
    - elevation_gain: Total elevation gain in meters (numeric)
    - elevation_stream: Array of elevation values in meters (jsonb)
    - distance_stream: Array of distance values in meters (jsonb)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'elevation_gain'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN elevation_gain numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'elevation_stream'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN elevation_stream jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'distance_stream'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN distance_stream jsonb;
  END IF;
END $$;
