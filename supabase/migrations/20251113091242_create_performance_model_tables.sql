/*
  # Create Performance Model and Calibration Tables

  ## Summary
  Creates infrastructure for adaptive race prediction learning system that personalizes
  performance curve for each athlete based on real race results and training data.

  ## New Tables

  ### 1. performance_models
  Stores each athlete's personalized performance baseline and decay factor
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `baseline_id` (text) - ID of baseline race or activity
  - `baseline_type` (text) - Type: 'real' (actual race) or 'derived' (from training)
  - `baseline_distance_km` (numeric) - Distance of baseline performance in kilometers
  - `baseline_time_min` (numeric) - Time of baseline performance in minutes
  - `baseline_date` (date) - Date of baseline performance
  - `performance_decay` (numeric) - Personal endurance decay factor (default 1.06)
  - `calibration_count` (integer) - Number of calibrations performed
  - `last_calibration_date` (timestamptz) - When last calibrated
  - `confidence_score` (numeric) - Model confidence 0-1 based on data quality
  - `metadata` (jsonb) - Additional model parameters and notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. performance_calibrations
  Audit trail of calibration events showing model evolution
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `performance_model_id` (uuid, foreign key) - Link to performance model
  - `race_id` (text) - ID of race used for calibration
  - `race_name` (text) - Name of race
  - `race_distance_km` (numeric) - Race distance
  - `predicted_time_min` (numeric) - What model predicted
  - `actual_time_min` (numeric) - What athlete actually ran
  - `time_delta_min` (numeric) - Difference (actual - predicted)
  - `old_decay` (numeric) - Decay factor before calibration
  - `new_decay` (numeric) - Decay factor after calibration
  - `decay_delta` (numeric) - Change in decay factor
  - `improvement_pct` (numeric) - Percentage improvement in model accuracy
  - `calibration_quality` (numeric) - Quality score 0-1 for this calibration
  - `notes` (text) - Optional calibration notes
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own performance models
  - All policies restrict by auth.uid() = user_id
  - Calibration history is read-only after creation

  ## Performance Indexes
  - Index on user_id for fast user model lookup
  - Index on (user_id, baseline_type) for baseline filtering
  - Index on last_calibration_date for staleness detection
  - Index on (user_id, created_at) for calibration history queries

  ## Notes
  - performance_decay typically ranges from 1.03 (excellent endurance) to 1.12 (building endurance)
  - Calibrations use weighted averaging to prevent overcorrection
  - Real race baselines have higher confidence than derived baselines
  - System auto-updates when new race data suggests better baseline
*/

-- Create performance_models table
CREATE TABLE IF NOT EXISTS performance_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  baseline_id text,
  baseline_type text DEFAULT 'derived' CHECK (baseline_type IN ('real', 'derived')),
  baseline_distance_km numeric CHECK (baseline_distance_km IS NULL OR (baseline_distance_km > 0 AND baseline_distance_km <= 200)),
  baseline_time_min numeric CHECK (baseline_time_min IS NULL OR baseline_time_min > 0),
  baseline_date date,
  performance_decay numeric DEFAULT 1.06 CHECK (performance_decay >= 1.0 AND performance_decay <= 1.15),
  calibration_count integer DEFAULT 0 CHECK (calibration_count >= 0),
  last_calibration_date timestamptz,
  confidence_score numeric DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create performance_calibrations table
CREATE TABLE IF NOT EXISTS performance_calibrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  performance_model_id uuid REFERENCES performance_models(id) ON DELETE CASCADE NOT NULL,
  race_id text NOT NULL,
  race_name text NOT NULL,
  race_distance_km numeric NOT NULL CHECK (race_distance_km > 0),
  predicted_time_min numeric NOT NULL CHECK (predicted_time_min > 0),
  actual_time_min numeric NOT NULL CHECK (actual_time_min > 0),
  time_delta_min numeric NOT NULL,
  old_decay numeric NOT NULL CHECK (old_decay >= 1.0),
  new_decay numeric NOT NULL CHECK (new_decay >= 1.0),
  decay_delta numeric NOT NULL,
  improvement_pct numeric,
  calibration_quality numeric DEFAULT 0.8 CHECK (calibration_quality >= 0 AND calibration_quality <= 1),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE performance_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_calibrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_models
CREATE POLICY "Users can view own performance model"
  ON performance_models FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own performance model"
  ON performance_models FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own performance model"
  ON performance_models FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own performance model"
  ON performance_models FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for performance_calibrations
CREATE POLICY "Users can view own calibration history"
  ON performance_calibrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calibrations"
  ON performance_calibrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS performance_models_user_id_idx
  ON performance_models(user_id);

CREATE INDEX IF NOT EXISTS performance_models_baseline_type_idx
  ON performance_models(user_id, baseline_type);

CREATE INDEX IF NOT EXISTS performance_models_last_calibration_idx
  ON performance_models(last_calibration_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS performance_models_confidence_idx
  ON performance_models(confidence_score DESC);

CREATE INDEX IF NOT EXISTS performance_calibrations_user_idx
  ON performance_calibrations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS performance_calibrations_model_idx
  ON performance_calibrations(performance_model_id, created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_performance_model_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_performance_models_timestamp ON performance_models;
CREATE TRIGGER update_performance_models_timestamp
  BEFORE UPDATE ON performance_models
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_model_timestamp();

-- Create view for performance model with quality indicators
CREATE OR REPLACE VIEW performance_models_with_status AS
SELECT
  pm.*,
  CASE
    WHEN pm.baseline_type = 'real' AND pm.calibration_count >= 3 THEN 'excellent'
    WHEN pm.baseline_type = 'real' AND pm.calibration_count >= 1 THEN 'good'
    WHEN pm.baseline_type = 'derived' THEN 'fair'
    ELSE 'initial'
  END as model_quality,
  CASE
    WHEN pm.last_calibration_date IS NULL THEN false
    WHEN pm.last_calibration_date > now() - interval '90 days' THEN true
    ELSE false
  END as is_fresh,
  CASE
    WHEN pm.performance_decay < 1.055 THEN 'excellent_endurance'
    WHEN pm.performance_decay < 1.065 THEN 'strong_endurance'
    WHEN pm.performance_decay < 1.075 THEN 'good_endurance'
    ELSE 'building_endurance'
  END as endurance_category,
  pm.calibration_count as total_calibrations
FROM performance_models pm;

-- Create helper function to get or create performance model for user
CREATE OR REPLACE FUNCTION get_or_create_performance_model(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  model_id uuid;
BEGIN
  -- Try to get existing model
  SELECT id INTO model_id
  FROM performance_models
  WHERE user_id = p_user_id;

  -- Create if doesn't exist
  IF model_id IS NULL THEN
    INSERT INTO performance_models (user_id, performance_decay, confidence_score)
    VALUES (p_user_id, 1.06, 0.5)
    RETURNING id INTO model_id;
  END IF;

  RETURN model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
