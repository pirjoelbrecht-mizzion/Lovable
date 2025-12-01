/*
  # Add Weather Data to Log Entries

  1. Table Extensions
    - `log_entries` - Add weather-related columns:
      - `temperature` (numeric, temperature in Celsius)
      - `weather_conditions` (text, weather description from Strava)
      - `location_name` (text, city/location name from Strava)
      - `humidity` (numeric, relative humidity percentage)

  2. Important Notes
    - These fields are optional and populated from Strava CSV imports
    - Temperature helps with climate performance tracking
    - Location name assists with training hotspot identification
    - Weather conditions provide context for performance analysis
*/

-- Add weather columns to log_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'temperature'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN temperature numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'weather_conditions'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN weather_conditions text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'location_name'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN location_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'humidity'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN humidity numeric;
  END IF;
END $$;

-- Create index for temperature-based queries (climate performance)
CREATE INDEX IF NOT EXISTS idx_log_entries_temperature ON log_entries(temperature) WHERE temperature IS NOT NULL;

-- Create index for location-based queries (training hotspots)
CREATE INDEX IF NOT EXISTS idx_log_entries_location ON log_entries(location_name) WHERE location_name IS NOT NULL;
