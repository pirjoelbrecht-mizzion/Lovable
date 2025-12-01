/*
  # Create Personalized Pace Calculation Tables

  1. New Tables
    - `user_pace_profiles`
      - Stores calculated pace metrics per user with terrain-specific adjustments
      - `user_id` (uuid, foreign key to auth.users)
      - `base_flat_pace_min_km` (numeric) - Base pace on flat terrain
      - `uphill_pace_adjustment_factor` (numeric) - Multiplier for uphill segments
      - `downhill_pace_adjustment_factor` (numeric) - Multiplier for downhill segments
      - `grade_bucket_paces` (jsonb) - Detailed pace data per grade bucket
      - `sample_size` (integer) - Number of activities used for calculation
      - `min_segments_per_type` (jsonb) - Count of segments per terrain type
      - `last_calculated_at` (timestamptz) - When pace profile was last updated
      - `calculation_period_days` (integer) - Days of data used (default 90)

    - `activity_terrain_analysis`
      - Caches terrain analysis of past activities for quick lookup
      - `log_entry_id` (uuid, foreign key to log_entries)
      - `user_id` (uuid, foreign key to auth.users)
      - `uphill_distance_km` (numeric)
      - `downhill_distance_km` (numeric)
      - `flat_distance_km` (numeric)
      - `uphill_pace_min_km` (numeric)
      - `downhill_pace_min_km` (numeric)
      - `flat_pace_min_km` (numeric)
      - `avg_grade_pct` (numeric)
      - `segments_data` (jsonb) - Detailed segment breakdown with grade buckets
      - `activity_date` (date) - Date of the activity for recency weighting
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only read/write their own pace data
*/

-- Create user_pace_profiles table
CREATE TABLE IF NOT EXISTS user_pace_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  base_flat_pace_min_km numeric CHECK (base_flat_pace_min_km > 0 AND base_flat_pace_min_km < 30) NOT NULL,
  uphill_pace_adjustment_factor numeric DEFAULT 1.3 CHECK (uphill_pace_adjustment_factor >= 1.0),
  downhill_pace_adjustment_factor numeric DEFAULT 0.85 CHECK (downhill_pace_adjustment_factor > 0 AND downhill_pace_adjustment_factor <= 1.5),
  grade_bucket_paces jsonb DEFAULT '{}'::jsonb,
  sample_size integer DEFAULT 0 CHECK (sample_size >= 0),
  min_segments_per_type jsonb DEFAULT '{"uphill": 0, "downhill": 0, "flat": 0}'::jsonb,
  last_calculated_at timestamptz DEFAULT now(),
  calculation_period_days integer DEFAULT 90 CHECK (calculation_period_days > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create activity_terrain_analysis table
CREATE TABLE IF NOT EXISTS activity_terrain_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  uphill_distance_km numeric DEFAULT 0 CHECK (uphill_distance_km >= 0),
  downhill_distance_km numeric DEFAULT 0 CHECK (downhill_distance_km >= 0),
  flat_distance_km numeric DEFAULT 0 CHECK (flat_distance_km >= 0),
  uphill_pace_min_km numeric CHECK (uphill_pace_min_km IS NULL OR (uphill_pace_min_km > 0 AND uphill_pace_min_km < 30)),
  downhill_pace_min_km numeric CHECK (downhill_pace_min_km IS NULL OR (downhill_pace_min_km > 0 AND downhill_pace_min_km < 30)),
  flat_pace_min_km numeric CHECK (flat_pace_min_km IS NULL OR (flat_pace_min_km > 0 AND flat_pace_min_km < 30)),
  avg_grade_pct numeric,
  segments_data jsonb DEFAULT '[]'::jsonb,
  activity_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(log_entry_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_pace_profiles_user_id ON user_pace_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_terrain_analysis_user_id ON activity_terrain_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_terrain_analysis_activity_date ON activity_terrain_analysis(activity_date);
CREATE INDEX IF NOT EXISTS idx_activity_terrain_analysis_log_entry ON activity_terrain_analysis(log_entry_id);

-- Enable Row Level Security
ALTER TABLE user_pace_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_terrain_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_pace_profiles
CREATE POLICY "Users can view own pace profile"
  ON user_pace_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pace profile"
  ON user_pace_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pace profile"
  ON user_pace_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pace profile"
  ON user_pace_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for activity_terrain_analysis
CREATE POLICY "Users can view own terrain analysis"
  ON activity_terrain_analysis FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own terrain analysis"
  ON activity_terrain_analysis FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own terrain analysis"
  ON activity_terrain_analysis FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own terrain analysis"
  ON activity_terrain_analysis FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);