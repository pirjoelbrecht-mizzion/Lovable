/*
  # Add Elevation Loss and Elevation Low Columns to log_entries

  ## Summary
  This migration adds support for complete elevation data from Strava CSV exports:
  - Column V: Elevation Loss (total meters descended)
  - Column W: Elevation Low (lowest elevation point in activity)

  ## Changes
  1. New Columns Added
    - `elevation_loss` (numeric) - Total elevation loss in meters
    - `elevation_low` (numeric) - Lowest elevation point in meters

  ## Data Safety
  - Uses IF NOT EXISTS to prevent errors on re-run
  - All columns are optional (nullable) to support partial data
  - No data loss - only adding new columns

  ## Important Notes
  - Activity ID is already stored in existing `external_id` column
  - Elevation Gain already exists in `elevation_gain` column (added in migration 20251112193119)
  - This completes the elevation data tracking from Strava CSV exports
*/

-- Add elevation_loss column (Column V from Strava CSV)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'elevation_loss'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN elevation_loss numeric;
    COMMENT ON COLUMN log_entries.elevation_loss IS 'Total elevation loss in meters (Strava CSV Column V)';
  END IF;
END $$;

-- Add elevation_low column (Column W from Strava CSV)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'elevation_low'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN elevation_low numeric;
    COMMENT ON COLUMN log_entries.elevation_low IS 'Lowest elevation point in meters (Strava CSV Column W)';
  END IF;
END $$;

-- Create index for efficient queries filtering by elevation data
CREATE INDEX IF NOT EXISTS idx_log_entries_elevation_loss
  ON log_entries(elevation_loss)
  WHERE elevation_loss IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_log_entries_elevation_low
  ON log_entries(elevation_low)
  WHERE elevation_low IS NOT NULL;

-- Verify columns were added successfully
DO $$
DECLARE
  has_loss boolean;
  has_low boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'elevation_loss'
  ) INTO has_loss;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'elevation_low'
  ) INTO has_low;

  IF has_loss AND has_low THEN
    RAISE NOTICE 'SUCCESS: elevation_loss and elevation_low columns added to log_entries';
  ELSE
    RAISE EXCEPTION 'FAILED: elevation columns not created properly';
  END IF;
END $$;
