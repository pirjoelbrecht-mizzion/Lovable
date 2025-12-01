/*
  # Environmental Learning System

  1. Schema Changes
    - Add environmental columns to log_entries table
    - Create environmental_adaptations table for learned coefficients
    - Create environmental_training_data table for analysis

  2. New Tables
    - `environmental_adaptations`
      - Stores learned adaptation profiles (heat, altitude, terrain, time)
      - Contains statistical coefficients and confidence scores
      - One row per adaptation type per user
    
    - `environmental_training_data`
      - Rich environmental context for each training session
      - Links to log_entries for performance analysis
      - Enables machine learning of environmental impact

  3. Security
    - Enable RLS on all tables
    - Users can only access their own environmental data

  4. Important Notes
    - Supports heat tolerance learning with acclimatization tracking
    - Altitude response with degradation curves
    - Optimal training time detection
    - Terrain efficiency analysis
    - Builds over time as more data accumulates
*/

-- Add environmental columns to log_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'altitude_m'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN altitude_m integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'terrain_type'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN terrain_type text 
      CHECK (terrain_type IN ('road', 'trail', 'technical', 'mixed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'log_entries' AND column_name = 'weather_data'
  ) THEN
    ALTER TABLE log_entries ADD COLUMN weather_data jsonb;
  END IF;
END $$;

-- Create environmental_adaptations table
CREATE TABLE IF NOT EXISTS environmental_adaptations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  adaptation_type text NOT NULL CHECK (adaptation_type IN ('heat_tolerance', 'altitude_response', 'terrain_efficiency', 'optimal_time')),
  learned_coefficients jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_points_count integer DEFAULT 0,
  confidence_score numeric DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, adaptation_type)
);

-- Create environmental_training_data table
CREATE TABLE IF NOT EXISTS environmental_training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE CASCADE,
  temperature_c numeric,
  humidity_pct integer,
  wind_kph numeric,
  altitude_m integer,
  terrain_type text CHECK (terrain_type IN ('road', 'trail', 'technical', 'mixed')),
  time_of_day text CHECK (time_of_day IN ('early_morning', 'morning', 'afternoon', 'evening', 'night')),
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_env_adaptations_user ON environmental_adaptations(user_id);
CREATE INDEX IF NOT EXISTS idx_env_training_user ON environmental_training_data(user_id);
CREATE INDEX IF NOT EXISTS idx_env_training_log_entry ON environmental_training_data(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_env_training_temp ON environmental_training_data(temperature_c);
CREATE INDEX IF NOT EXISTS idx_env_training_altitude ON environmental_training_data(altitude_m);

-- Enable RLS
ALTER TABLE environmental_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE environmental_training_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for environmental_adaptations
CREATE POLICY "Users can view their adaptations"
  ON environmental_adaptations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their adaptations"
  ON environmental_adaptations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their adaptations"
  ON environmental_adaptations FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their adaptations"
  ON environmental_adaptations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for environmental_training_data
CREATE POLICY "Users can view their training data"
  ON environmental_training_data FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their training data"
  ON environmental_training_data FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their training data"
  ON environmental_training_data FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their training data"
  ON environmental_training_data FOR DELETE TO authenticated
  USING (user_id = auth.uid());