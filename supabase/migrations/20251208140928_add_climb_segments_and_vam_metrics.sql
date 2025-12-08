/*
  # Add Per-Climb VAM Analysis Tables and Columns

  ## Overview
  This migration transforms VAM (Vertical Ascent Meters per hour) calculation from a 
  whole-activity metric to a scientifically-accurate per-climb analysis system.

  ## Changes Made

  ### 1. New Tables
  - `activity_climb_segments`
    - Stores individual climb data for each activity
    - Each row represents one significant climb (>80m gain, >400m distance)
    - Columns: climb sequence, distance markers, elevation gain, duration, VAM, grade
    - Enables climb-by-climb fatigue analysis

  ### 2. Updated Tables
  - `activity_terrain_analysis` - New VAM columns:
    - `peak_vam`: Highest VAM from any single climb in the activity
    - `average_climb_vam`: Mean VAM across all significant climbs
    - `vam_first_climb`: VAM on the first climb (baseline climbing power)
    - `vam_last_climb`: VAM on the final climb (fatigued state)
    - `vam_fatigue_slope_pct`: Regression-based fatigue decline rate
    - `vam_first_to_last_dropoff_pct`: Simple first→last comparison for UI
    - `total_climbing_time_min`: Time spent on uphill segments only
    - `total_climbing_distance_km`: Horizontal distance of all climbs combined
    - `significant_climbs_count`: Number of climbs meeting significance threshold

  ## Security
  - Enable RLS on `activity_climb_segments` table
  - Add policies for authenticated users to manage their own climb data
  - Add indexes for query performance on user_id and log_entry_id

  ## Data Integrity
  - Foreign key constraints to log_entries and user profiles
  - Check constraints on climb_number (must be positive)
  - Check constraints on VAM (must be positive when present)
*/

-- Create activity_climb_segments table
CREATE TABLE IF NOT EXISTS activity_climb_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_entry_id uuid NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  climb_number int NOT NULL CHECK (climb_number > 0),
  start_distance_m numeric NOT NULL CHECK (start_distance_m >= 0),
  end_distance_m numeric NOT NULL CHECK (end_distance_m > start_distance_m),
  elevation_gain_m numeric NOT NULL CHECK (elevation_gain_m > 0),
  duration_min numeric CHECK (duration_min > 0),
  vam numeric CHECK (vam > 0),
  average_grade_pct numeric CHECK (average_grade_pct > 0),
  distance_km numeric CHECK (distance_km > 0),
  category text CHECK (category IN ('easy', 'moderate', 'hard', 'extreme')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(log_entry_id, climb_number)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_climb_segments_log_entry ON activity_climb_segments(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_climb_segments_user ON activity_climb_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_climb_segments_vam ON activity_climb_segments(vam) WHERE vam IS NOT NULL;

-- Enable RLS
ALTER TABLE activity_climb_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_climb_segments
CREATE POLICY "Users can view own climb segments"
  ON activity_climb_segments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own climb segments"
  ON activity_climb_segments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own climb segments"
  ON activity_climb_segments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own climb segments"
  ON activity_climb_segments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add new VAM columns to activity_terrain_analysis
DO $$
BEGIN
  -- Peak VAM (best single climb)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_terrain_analysis' AND column_name = 'peak_vam'
  ) THEN
    ALTER TABLE activity_terrain_analysis ADD COLUMN peak_vam numeric CHECK (peak_vam > 0);
  END IF;

  -- Average climb VAM
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_terrain_analysis' AND column_name = 'average_climb_vam'
  ) THEN
    ALTER TABLE activity_terrain_analysis ADD COLUMN average_climb_vam numeric CHECK (average_climb_vam > 0);
  END IF;

  -- First climb VAM (baseline)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_terrain_analysis' AND column_name = 'vam_first_climb'
  ) THEN
    ALTER TABLE activity_terrain_analysis ADD COLUMN vam_first_climb numeric CHECK (vam_first_climb > 0);
  END IF;

  -- Last climb VAM (fatigued state)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_terrain_analysis' AND column_name = 'vam_last_climb'
  ) THEN
    ALTER TABLE activity_terrain_analysis ADD COLUMN vam_last_climb numeric CHECK (vam_last_climb > 0);
  END IF;

  -- Fatigue slope (regression-based)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_terrain_analysis' AND column_name = 'vam_fatigue_slope_pct'
  ) THEN
    ALTER TABLE activity_terrain_analysis ADD COLUMN vam_fatigue_slope_pct numeric;
  END IF;

  -- First-to-last dropoff (simple comparison)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_terrain_analysis' AND column_name = 'vam_first_to_last_dropoff_pct'
  ) THEN
    ALTER TABLE activity_terrain_analysis ADD COLUMN vam_first_to_last_dropoff_pct numeric;
  END IF;

  -- Total climbing time
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_terrain_analysis' AND column_name = 'total_climbing_time_min'
  ) THEN
    ALTER TABLE activity_terrain_analysis ADD COLUMN total_climbing_time_min numeric CHECK (total_climbing_time_min >= 0);
  END IF;

  -- Total climbing distance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_terrain_analysis' AND column_name = 'total_climbing_distance_km'
  ) THEN
    ALTER TABLE activity_terrain_analysis ADD COLUMN total_climbing_distance_km numeric CHECK (total_climbing_distance_km >= 0);
  END IF;

  -- Count of significant climbs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_terrain_analysis' AND column_name = 'significant_climbs_count'
  ) THEN
    ALTER TABLE activity_terrain_analysis ADD COLUMN significant_climbs_count int DEFAULT 0 CHECK (significant_climbs_count >= 0);
  END IF;
END $$;

-- Add index for VAM queries
CREATE INDEX IF NOT EXISTS idx_terrain_analysis_peak_vam ON activity_terrain_analysis(peak_vam) WHERE peak_vam IS NOT NULL;