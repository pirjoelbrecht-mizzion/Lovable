/*
  # Add Training Intelligence Tables

  ## Summary
  Creates tables for race projections, AI coach summaries, and training metrics caching
  to support the enhanced training intelligence features.

  ## New Tables

  ### 1. race_projections
  Stores predicted race times based on baseline race performances
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `baseline_race_id` (text) - ID of the race used as baseline
  - `baseline_distance_km` (numeric) - Distance of baseline race
  - `baseline_time_min` (numeric) - Time of baseline race in minutes
  - `target_distance_km` (numeric) - Distance to predict
  - `predicted_time_min` (numeric) - Calculated predicted time
  - `confidence_score` (numeric) - 0-1 score based on recency and data quality
  - `is_manual_override` (boolean) - True if user manually set baseline
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. coach_summaries
  Stores AI-generated coaching narratives for the weekly planner
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `summary_text` (text) - The coaching narrative
  - `training_context` (jsonb) - Structured data used to generate summary
  - `week_start_date` (date) - Week this summary applies to
  - `generated_at` (timestamptz)
  - `read_at` (timestamptz) - When user dismissed/read the summary
  - `is_dismissed` (boolean) - Whether user has dismissed this summary

  ### 3. training_metrics_cache
  Caches computed training metrics for performance
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `metric_type` (text) - Type of metric (e.g., 'efficiency', 'hr_drift', 'pace_trend')
  - `period_start` (date) - Start of measurement period
  - `period_end` (date) - End of measurement period
  - `value` (numeric) - Calculated metric value
  - `metadata` (jsonb) - Additional data about the calculation
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Policies for SELECT, INSERT, UPDATE, DELETE operations
*/

-- Create race_projections table
CREATE TABLE IF NOT EXISTS race_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  baseline_race_id text NOT NULL,
  baseline_distance_km numeric NOT NULL CHECK (baseline_distance_km > 0),
  baseline_time_min numeric NOT NULL CHECK (baseline_time_min > 0),
  target_distance_km numeric NOT NULL CHECK (target_distance_km > 0),
  predicted_time_min numeric NOT NULL CHECK (predicted_time_min > 0),
  confidence_score numeric DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_manual_override boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create coach_summaries table
CREATE TABLE IF NOT EXISTS coach_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  summary_text text NOT NULL,
  training_context jsonb DEFAULT '{}'::jsonb,
  week_start_date date NOT NULL,
  generated_at timestamptz DEFAULT now(),
  read_at timestamptz,
  is_dismissed boolean DEFAULT false
);

-- Create training_metrics_cache table
CREATE TABLE IF NOT EXISTS training_metrics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  value numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE race_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_metrics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for race_projections
CREATE POLICY "Users can view own race projections"
  ON race_projections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own race projections"
  ON race_projections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own race projections"
  ON race_projections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own race projections"
  ON race_projections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for coach_summaries
CREATE POLICY "Users can view own coach summaries"
  ON coach_summaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coach summaries"
  ON coach_summaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coach summaries"
  ON coach_summaries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own coach summaries"
  ON coach_summaries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for training_metrics_cache
CREATE POLICY "Users can view own training metrics"
  ON training_metrics_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training metrics"
  ON training_metrics_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training metrics"
  ON training_metrics_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training metrics"
  ON training_metrics_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS race_projections_user_id_idx
  ON race_projections(user_id);

CREATE INDEX IF NOT EXISTS race_projections_baseline_race_idx
  ON race_projections(user_id, baseline_race_id);

CREATE INDEX IF NOT EXISTS coach_summaries_user_week_idx
  ON coach_summaries(user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS training_metrics_user_type_idx
  ON training_metrics_cache(user_id, metric_type, period_end DESC);

-- Add automatic cleanup trigger for old coach summaries (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_coach_summaries()
RETURNS void AS $$
BEGIN
  DELETE FROM coach_summaries
  WHERE generated_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Note: Automatic cleanup can be scheduled via pg_cron or called manually
