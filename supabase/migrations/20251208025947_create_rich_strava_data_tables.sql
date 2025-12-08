/*
  # Create Rich Strava Data Tables

  1. New Tables
    - `activity_photos`
      - Stores Strava activity photos with full resolution URLs
      - Includes captions, location, and display order
    - `activity_segments`
      - Stores segment efforts with PR status and achievement types
      - Includes segment metadata (name, grade, distance)
    - `activity_best_efforts`
      - Stores best efforts (1K, 1 mile, 10K, etc.)
      - Includes ranking information
    - `activity_weather_detailed`
      - Stores detailed weather data from external API
      - Includes humidity, wind, feels-like temperature
    - `athlete_gear`
      - Stores gear information (shoes, bikes, etc.)
      - Tracks total distance and photos

  2. Schema Changes
    - Add sport_type column to log_entries to preserve activity category
    - Add has_photos, has_segments flags for quick filtering
    - Add gear_id and device_name for equipment tracking

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read/write their own data
*/

-- Add new columns to log_entries for rich data tracking
DO $$
BEGIN
  -- Add sport_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'sport_type'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN sport_type text;
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'description'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN description text;
  END IF;

  -- Add device_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'device_name'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN device_name text;
  END IF;

  -- Add gear_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'gear_id'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN gear_id text;
  END IF;

  -- Add has_photos flag if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'has_photos'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN has_photos boolean DEFAULT false;
  END IF;

  -- Add has_segments flag if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'has_segments'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN has_segments boolean DEFAULT false;
  END IF;
END $$;

-- Create activity_photos table
CREATE TABLE IF NOT EXISTS activity_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE CASCADE NOT NULL,
  url_full text NOT NULL,
  url_thumbnail text NOT NULL,
  caption text,
  latitude float,
  longitude float,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_activity_photos_log_entry ON activity_photos(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_activity_photos_user ON activity_photos(user_id);

-- Enable RLS
ALTER TABLE activity_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_photos
CREATE POLICY "Users can view own activity photos"
  ON activity_photos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity photos"
  ON activity_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity photos"
  ON activity_photos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity photos"
  ON activity_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create activity_segments table
CREATE TABLE IF NOT EXISTS activity_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE CASCADE NOT NULL,
  segment_id text NOT NULL,
  segment_name text NOT NULL,
  distance float NOT NULL,
  avg_grade float,
  elapsed_time int NOT NULL,
  moving_time int NOT NULL,
  start_index int,
  end_index int,
  is_pr boolean DEFAULT false,
  pr_rank int,
  kom_rank int,
  achievement_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_segments_log_entry ON activity_segments(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_activity_segments_user ON activity_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_segments_segment_id ON activity_segments(segment_id);

-- Enable RLS
ALTER TABLE activity_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_segments
CREATE POLICY "Users can view own activity segments"
  ON activity_segments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity segments"
  ON activity_segments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity segments"
  ON activity_segments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity segments"
  ON activity_segments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create activity_best_efforts table
CREATE TABLE IF NOT EXISTS activity_best_efforts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE CASCADE NOT NULL,
  effort_name text NOT NULL,
  distance float NOT NULL,
  elapsed_time int NOT NULL,
  moving_time int NOT NULL,
  start_index int,
  end_index int,
  is_pr boolean DEFAULT false,
  pr_rank int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_best_efforts_log_entry ON activity_best_efforts(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_activity_best_efforts_user ON activity_best_efforts(user_id);

-- Enable RLS
ALTER TABLE activity_best_efforts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_best_efforts
CREATE POLICY "Users can view own best efforts"
  ON activity_best_efforts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own best efforts"
  ON activity_best_efforts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own best efforts"
  ON activity_best_efforts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own best efforts"
  ON activity_best_efforts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create activity_weather_detailed table
CREATE TABLE IF NOT EXISTS activity_weather_detailed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE CASCADE NOT NULL,
  temp_c float,
  feels_like_c float,
  humidity float,
  wind_speed float,
  wind_direction int,
  conditions text,
  icon text,
  sunrise timestamptz,
  sunset timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(log_entry_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_weather_detailed_log_entry ON activity_weather_detailed(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_activity_weather_detailed_user ON activity_weather_detailed(user_id);

-- Enable RLS
ALTER TABLE activity_weather_detailed ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_weather_detailed
CREATE POLICY "Users can view own weather data"
  ON activity_weather_detailed FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weather data"
  ON activity_weather_detailed FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weather data"
  ON activity_weather_detailed FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weather data"
  ON activity_weather_detailed FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create athlete_gear table
CREATE TABLE IF NOT EXISTS athlete_gear (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gear_id text NOT NULL,
  name text NOT NULL,
  brand text,
  model text,
  gear_type text NOT NULL,
  distance_km float DEFAULT 0,
  photo_url text,
  is_primary boolean DEFAULT false,
  retired boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, gear_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_athlete_gear_user ON athlete_gear(user_id);
CREATE INDEX IF NOT EXISTS idx_athlete_gear_gear_id ON athlete_gear(gear_id);

-- Enable RLS
ALTER TABLE athlete_gear ENABLE ROW LEVEL SECURITY;

-- RLS Policies for athlete_gear
CREATE POLICY "Users can view own gear"
  ON athlete_gear FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gear"
  ON athlete_gear FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gear"
  ON athlete_gear FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gear"
  ON athlete_gear FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);