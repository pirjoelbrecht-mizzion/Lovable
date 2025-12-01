/*
  # Add map data to log entries

  1. Changes
    - Add `map_polyline` column to `log_entries` table for storing encoded polyline data
    - Add `map_summary_polyline` column for lower-resolution preview polyline
    - These columns store route/GPS data from activities (e.g., from Strava)
  
  2. Notes
    - Polylines are encoded using Google's polyline encoding format
    - summary_polyline is lower resolution for quick preview rendering
    - Full polyline provides detailed route visualization
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'map_polyline'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN map_polyline text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'map_summary_polyline'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN map_summary_polyline text;
  END IF;
END $$;