/*
  # GPX Calibration and Ultra Distance Learning Tables

  ## Overview
  This migration creates tables to track GPX prediction accuracy and enable
  the AI learning loop to improve ultra distance race predictions over time.

  ## New Tables

  1. `gpx_prediction_calibrations`
     - Stores predicted vs actual race times for GPX-based predictions
     - Links to race events and log entries
     - Tracks prediction accuracy metrics for learning

  2. `ultra_distance_correction_factors`
     - Stores learned correction factors by distance band
     - Factors for fatigue, terrain, elevation, conditions
     - User-specific adjustments based on race history

  3. `race_segment_analysis`
     - Stores per-segment predictions and actuals
     - Enables learning which segments predictions are off
     - Tracks terrain-specific accuracy

  ## Security
  - All tables have RLS enabled
  - Users can only access their own data
  - Policies enforce ownership checks
*/

-- GPX Prediction Calibrations table
CREATE TABLE IF NOT EXISTS gpx_prediction_calibrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  race_id text,
  race_name text NOT NULL,
  race_date date NOT NULL,
  
  distance_km numeric NOT NULL,
  elevation_gain_m numeric DEFAULT 0,
  surface_type text DEFAULT 'mixed',
  
  gpx_predicted_time_min numeric NOT NULL,
  actual_time_min numeric,
  
  prediction_method text DEFAULT 'gpx',
  used_personalized_pace boolean DEFAULT false,
  pace_profile_confidence text DEFAULT 'medium',
  
  temperature_c numeric,
  humidity_pct numeric,
  had_night_section boolean DEFAULT false,
  
  aid_station_predicted_min numeric DEFAULT 0,
  aid_station_actual_min numeric,
  
  fatigue_factor_used numeric DEFAULT 1.0,
  fatigue_factor_actual numeric,
  
  time_delta_min numeric,
  time_delta_pct numeric,
  
  calibration_quality numeric DEFAULT 0.5,
  applied_to_model boolean DEFAULT false,
  
  segment_count integer,
  segments_analyzed jsonb,
  
  athlete_notes text,
  weather_conditions text,
  terrain_difficulty_rating integer,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ultra Distance Correction Factors table
CREATE TABLE IF NOT EXISTS ultra_distance_correction_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  distance_band text NOT NULL,
  
  base_fatigue_factor numeric DEFAULT 1.0,
  elevation_factor_adjustment numeric DEFAULT 0,
  heat_sensitivity_factor numeric DEFAULT 1.0,
  night_running_factor numeric DEFAULT 1.0,
  
  aid_station_time_multiplier numeric DEFAULT 1.0,
  
  terrain_road_factor numeric DEFAULT 1.0,
  terrain_trail_factor numeric DEFAULT 1.0,
  terrain_mountain_factor numeric DEFAULT 1.0,
  
  climb_pace_factor numeric DEFAULT 1.0,
  descent_pace_factor numeric DEFAULT 1.0,
  flat_pace_factor numeric DEFAULT 1.0,
  
  calibration_count integer DEFAULT 0,
  last_calibration_date date,
  confidence_score numeric DEFAULT 50,
  
  race_history jsonb DEFAULT '[]',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_user_distance_band UNIQUE (user_id, distance_band)
);

-- Race Segment Analysis table
CREATE TABLE IF NOT EXISTS race_segment_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calibration_id uuid REFERENCES gpx_prediction_calibrations(id) ON DELETE CASCADE,
  
  segment_index integer NOT NULL,
  segment_distance_km numeric NOT NULL,
  cumulative_distance_km numeric NOT NULL,
  
  elevation_gain_m numeric DEFAULT 0,
  elevation_loss_m numeric DEFAULT 0,
  avg_gradient_pct numeric DEFAULT 0,
  
  terrain_type text DEFAULT 'mixed',
  technical_rating integer DEFAULT 3,
  
  predicted_pace_min_km numeric,
  actual_pace_min_km numeric,
  pace_delta_pct numeric,
  
  predicted_fatigue_factor numeric DEFAULT 1.0,
  estimated_actual_fatigue numeric,
  
  was_night_segment boolean DEFAULT false,
  segment_temperature_c numeric,
  
  notes text,
  
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gpx_calibrations_user_id 
  ON gpx_prediction_calibrations(user_id);
CREATE INDEX IF NOT EXISTS idx_gpx_calibrations_race_date 
  ON gpx_prediction_calibrations(race_date);
CREATE INDEX IF NOT EXISTS idx_gpx_calibrations_distance 
  ON gpx_prediction_calibrations(distance_km);

CREATE INDEX IF NOT EXISTS idx_ultra_correction_user_band 
  ON ultra_distance_correction_factors(user_id, distance_band);

CREATE INDEX IF NOT EXISTS idx_segment_analysis_calibration 
  ON race_segment_analysis(calibration_id);
CREATE INDEX IF NOT EXISTS idx_segment_analysis_user 
  ON race_segment_analysis(user_id);

-- Enable RLS on all tables
ALTER TABLE gpx_prediction_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ultra_distance_correction_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_segment_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gpx_prediction_calibrations
CREATE POLICY "Users can view own gpx calibrations"
  ON gpx_prediction_calibrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gpx calibrations"
  ON gpx_prediction_calibrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gpx calibrations"
  ON gpx_prediction_calibrations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gpx calibrations"
  ON gpx_prediction_calibrations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ultra_distance_correction_factors
CREATE POLICY "Users can view own correction factors"
  ON ultra_distance_correction_factors
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own correction factors"
  ON ultra_distance_correction_factors
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own correction factors"
  ON ultra_distance_correction_factors
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own correction factors"
  ON ultra_distance_correction_factors
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for race_segment_analysis
CREATE POLICY "Users can view own segment analysis"
  ON race_segment_analysis
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own segment analysis"
  ON race_segment_analysis
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own segment analysis"
  ON race_segment_analysis
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own segment analysis"
  ON race_segment_analysis
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
