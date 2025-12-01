/*
  # Create Taper Management System

  ## Overview
  This migration creates the foundational tables for the race-aware taper engine,
  which automatically adjusts training plans based on race priorities, distances,
  and timing while incorporating AI learning loops for continuous improvement.

  ## New Tables

  ### 1. `taper_templates`
  Stores pre-defined taper patterns organized by race type and priority.
  - Templates define volume reduction curves and workout types
  - Distance-based taper durations (5-14 days based on race length)
  - Separate patterns for A, B, and C priority races

  ### 2. `training_goal_state`
  Tracks the currently active training goal based on longest upcoming race.
  - One row per user with current training plan type
  - Updated automatically when race calendar changes
  - Drives season plan generation and taper application

  ### 3. `taper_adjustments_log`
  Records all AI-driven taper modifications for analysis and learning.
  - Logs taper duration changes and rationale
  - Tracks effectiveness based on race outcomes
  - Enables continuous improvement of taper recommendations

  ### 4. `race_feedback`
  Captures post-race reflections for AI learning loops.
  - Subjective feelings (too fresh, too tired, just right)
  - Objective metrics (actual vs predicted time)
  - Used to personalize future taper recommendations

  ## Security
  - Row Level Security enabled on all tables
  - Users can only access their own data
  - Policies enforce authentication requirements
*/

-- ============================================================================
-- Taper Templates Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS taper_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  race_priority text NOT NULL CHECK (race_priority IN ('A', 'B', 'C')),
  min_distance_km numeric NOT NULL DEFAULT 0,
  max_distance_km numeric,
  taper_duration_days integer NOT NULL,
  volume_reduction_curve jsonb NOT NULL DEFAULT '[]',
  workout_modifications jsonb DEFAULT '{}',
  is_system_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_distance_range CHECK (max_distance_km IS NULL OR max_distance_km >= min_distance_km),
  CONSTRAINT valid_taper_duration CHECK (taper_duration_days > 0 AND taper_duration_days <= 21)
);

CREATE INDEX IF NOT EXISTS idx_taper_templates_user_id ON taper_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_taper_templates_priority ON taper_templates(race_priority);
CREATE INDEX IF NOT EXISTS idx_taper_templates_distance ON taper_templates(min_distance_km, max_distance_km);

ALTER TABLE taper_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own taper templates"
  ON taper_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_system_template = true);

CREATE POLICY "Users can create own taper templates"
  ON taper_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own taper templates"
  ON taper_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own taper templates"
  ON taper_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- Training Goal State Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_goal_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_distance_km numeric NOT NULL,
  plan_type text NOT NULL,
  target_race_id text,
  target_race_name text,
  target_race_date date,
  next_race_id text,
  next_race_name text,
  next_race_date date,
  computation_metadata jsonb DEFAULT '{}',
  last_computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_goal_state_user_id ON training_goal_state(user_id);

ALTER TABLE training_goal_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training goal state"
  ON training_goal_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training goal state"
  ON training_goal_state
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training goal state"
  ON training_goal_state
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Taper Adjustments Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS taper_adjustments_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_id text NOT NULL,
  race_name text NOT NULL,
  race_date date NOT NULL,
  race_priority text NOT NULL CHECK (race_priority IN ('A', 'B', 'C')),
  original_taper_days integer NOT NULL,
  adjusted_taper_days integer NOT NULL,
  adjustment_reason text NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('ai_learning', 'readiness_based', 'manual', 'proximity_conflict')),
  readiness_score numeric,
  fatigue_score numeric,
  confidence_score numeric,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taper_adjustments_user_id ON taper_adjustments_log(user_id);
CREATE INDEX IF NOT EXISTS idx_taper_adjustments_race_id ON taper_adjustments_log(race_id);
CREATE INDEX IF NOT EXISTS idx_taper_adjustments_date ON taper_adjustments_log(created_at DESC);

ALTER TABLE taper_adjustments_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own taper adjustments"
  ON taper_adjustments_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own taper adjustments"
  ON taper_adjustments_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Race Feedback Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS race_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_id text NOT NULL,
  race_name text NOT NULL,
  race_date date NOT NULL,
  race_distance_km numeric NOT NULL,
  race_priority text NOT NULL CHECK (race_priority IN ('A', 'B', 'C')),

  -- Taper feedback
  taper_duration_days integer NOT NULL,
  taper_feeling text CHECK (taper_feeling IN ('too_fresh', 'just_right', 'too_tired', 'unsure')),
  taper_quality_score integer CHECK (taper_quality_score >= 1 AND taper_quality_score <= 10),

  -- Performance feedback
  predicted_time_min numeric,
  actual_time_min numeric,
  time_delta_min numeric,
  perceived_effort integer CHECK (perceived_effort >= 1 AND perceived_effort <= 10),
  performance_rating text CHECK (performance_rating IN ('exceeded', 'met', 'below', 'far_below')),

  -- Qualitative feedback
  what_went_well text,
  what_to_improve text,
  nutrition_notes text,
  pacing_notes text,

  -- Physiological data
  avg_hr integer,
  max_hr integer,
  hrv_7day_avg numeric,
  readiness_race_day numeric,
  sleep_quality_avg numeric,

  -- Metadata
  weather_conditions jsonb,
  course_difficulty text,
  used_ai_recommendations boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT race_feedback_unique_race UNIQUE(user_id, race_id)
);

CREATE INDEX IF NOT EXISTS idx_race_feedback_user_id ON race_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_race_feedback_race_date ON race_feedback(race_date DESC);
CREATE INDEX IF NOT EXISTS idx_race_feedback_priority ON race_feedback(race_priority);
CREATE INDEX IF NOT EXISTS idx_race_feedback_taper_feeling ON race_feedback(taper_feeling);

ALTER TABLE race_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own race feedback"
  ON race_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own race feedback"
  ON race_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own race feedback"
  ON race_feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own race feedback"
  ON race_feedback
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- Seed System Taper Templates
-- ============================================================================

INSERT INTO taper_templates (user_id, name, race_priority, min_distance_km, max_distance_km, taper_duration_days, volume_reduction_curve, workout_modifications, is_system_template)
VALUES
  -- A Race Templates
  (NULL, 'A Race: 5-10km', 'A', 5, 10, 5,
   '[{"day": -5, "volumePercent": 85}, {"day": -4, "volumePercent": 80}, {"day": -3, "volumePercent": 75}, {"day": -2, "volumePercent": 65}, {"day": -1, "volumePercent": 50}]'::jsonb,
   '{"sharpness": "maintain", "longRun": "reduce_30pct"}'::jsonb,
   true),

  (NULL, 'A Race: Half Marathon', 'A', 10.1, 25, 7,
   '[{"day": -7, "volumePercent": 85}, {"day": -6, "volumePercent": 80}, {"day": -5, "volumePercent": 75}, {"day": -4, "volumePercent": 70}, {"day": -3, "volumePercent": 65}, {"day": -2, "volumePercent": 55}, {"day": -1, "volumePercent": 45}]'::jsonb,
   '{"sharpness": "short_intervals", "longRun": "reduce_40pct"}'::jsonb,
   true),

  (NULL, 'A Race: Marathon to 50km', 'A', 25.1, 50, 10,
   '[{"day": -10, "volumePercent": 90}, {"day": -9, "volumePercent": 85}, {"day": -8, "volumePercent": 80}, {"day": -7, "volumePercent": 75}, {"day": -6, "volumePercent": 70}, {"day": -5, "volumePercent": 65}, {"day": -4, "volumePercent": 60}, {"day": -3, "volumePercent": 55}, {"day": -2, "volumePercent": 50}, {"day": -1, "volumePercent": 40}]'::jsonb,
   '{"sharpness": "race_pace_touches", "longRun": "reduce_50pct"}'::jsonb,
   true),

  (NULL, 'A Race: 50-100km Ultra', 'A', 50.1, 100, 12,
   '[{"day": -12, "volumePercent": 90}, {"day": -11, "volumePercent": 85}, {"day": -10, "volumePercent": 80}, {"day": -9, "volumePercent": 75}, {"day": -8, "volumePercent": 70}, {"day": -7, "volumePercent": 65}, {"day": -6, "volumePercent": 60}, {"day": -5, "volumePercent": 55}, {"day": -4, "volumePercent": 50}, {"day": -3, "volumePercent": 45}, {"day": -2, "volumePercent": 40}, {"day": -1, "volumePercent": 35}]'::jsonb,
   '{"sharpness": "minimal", "longRun": "reduce_60pct"}'::jsonb,
   true),

  (NULL, 'A Race: 100+ Mile Ultra', 'A', 100.1, NULL, 14,
   '[{"day": -14, "volumePercent": 90}, {"day": -13, "volumePercent": 85}, {"day": -12, "volumePercent": 80}, {"day": -11, "volumePercent": 75}, {"day": -10, "volumePercent": 70}, {"day": -9, "volumePercent": 65}, {"day": -8, "volumePercent": 60}, {"day": -7, "volumePercent": 55}, {"day": -6, "volumePercent": 50}, {"day": -5, "volumePercent": 45}, {"day": -4, "volumePercent": 40}, {"day": -3, "volumePercent": 35}, {"day": -2, "volumePercent": 30}, {"day": -1, "volumePercent": 25}]'::jsonb,
   '{"sharpness": "none", "longRun": "reduce_70pct"}'::jsonb,
   true),

  -- B Race Templates (Mini-tapers)
  (NULL, 'B Race: Under 30km', 'B', 0, 30, 3,
   '[{"day": -3, "volumePercent": 90}, {"day": -2, "volumePercent": 80}, {"day": -1, "volumePercent": 70}]'::jsonb,
   '{"sharpness": "maintain", "longRun": "normal"}'::jsonb,
   true),

  (NULL, 'B Race: 30-60km', 'B', 30.1, 60, 5,
   '[{"day": -5, "volumePercent": 90}, {"day": -4, "volumePercent": 85}, {"day": -3, "volumePercent": 80}, {"day": -2, "volumePercent": 70}, {"day": -1, "volumePercent": 60}]'::jsonb,
   '{"sharpness": "light", "longRun": "reduce_30pct"}'::jsonb,
   true),

  (NULL, 'B Race: 60km+', 'B', 60.1, NULL, 7,
   '[{"day": -7, "volumePercent": 90}, {"day": -6, "volumePercent": 85}, {"day": -5, "volumePercent": 80}, {"day": -4, "volumePercent": 75}, {"day": -3, "volumePercent": 70}, {"day": -2, "volumePercent": 65}, {"day": -1, "volumePercent": 55}]'::jsonb,
   '{"sharpness": "moderate", "longRun": "reduce_40pct"}'::jsonb,
   true),

  -- C Race Templates (Minimal to no taper)
  (NULL, 'C Race: Train Through', 'C', 0, NULL, 1,
   '[{"day": -1, "volumePercent": 90}]'::jsonb,
   '{"sharpness": "normal", "longRun": "normal", "racePacing": "effort_based"}'::jsonb,
   true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get appropriate taper template for a race
CREATE OR REPLACE FUNCTION get_taper_template_for_race(
  p_user_id uuid,
  p_race_priority text,
  p_distance_km numeric
)
RETURNS TABLE (
  id uuid,
  name text,
  taper_duration_days integer,
  volume_reduction_curve jsonb,
  workout_modifications jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.taper_duration_days,
    t.volume_reduction_curve,
    t.workout_modifications
  FROM taper_templates t
  WHERE
    t.race_priority = p_race_priority
    AND p_distance_km >= t.min_distance_km
    AND (t.max_distance_km IS NULL OR p_distance_km <= t.max_distance_km)
    AND (t.user_id = p_user_id OR t.is_system_template = true)
  ORDER BY
    t.user_id IS NOT NULL DESC,  -- Prefer user templates over system
    t.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to compute training goal from race calendar
CREATE OR REPLACE FUNCTION compute_training_goal(p_user_id uuid)
RETURNS TABLE (
  goal_distance_km numeric,
  plan_type text,
  target_race_id text,
  target_race_name text,
  target_race_date date,
  next_race_id text,
  next_race_name text,
  next_race_date date
) AS $$
DECLARE
  v_longest_race record;
  v_next_race record;
BEGIN
  -- Find the longest upcoming race
  SELECT
    e.id,
    e.name,
    e.date,
    COALESCE(e.distance_km, 42.195) as distance_km
  INTO v_longest_race
  FROM events e
  WHERE
    e.user_id = p_user_id
    AND e.date >= CURRENT_DATE
    AND e.type IN ('street', 'trail')
  ORDER BY
    COALESCE(e.distance_km, 42.195) DESC,
    e.date ASC
  LIMIT 1;

  -- Find the next upcoming race
  SELECT
    e.id,
    e.name,
    e.date
  INTO v_next_race
  FROM events e
  WHERE
    e.user_id = p_user_id
    AND e.date >= CURRENT_DATE
    AND e.type IN ('street', 'trail')
  ORDER BY e.date ASC
  LIMIT 1;

  IF v_longest_race IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 'BASE'::text, NULL::text, NULL::text, NULL::date, NULL::text, NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Map distance to plan type
  RETURN QUERY
  SELECT
    v_longest_race.distance_km,
    CASE
      WHEN v_longest_race.distance_km >= 200 THEN '200M'
      WHEN v_longest_race.distance_km >= 160 THEN '100M'
      WHEN v_longest_race.distance_km >= 120 THEN '100K'
      WHEN v_longest_race.distance_km >= 80 THEN '50M'
      WHEN v_longest_race.distance_km >= 42 THEN '50K'
      WHEN v_longest_race.distance_km >= 21 THEN 'MARATHON'
      WHEN v_longest_race.distance_km >= 10 THEN 'HALF'
      ELSE '10K'
    END,
    v_longest_race.id::text,
    v_longest_race.name,
    v_longest_race.date::date,
    v_next_race.id::text,
    v_next_race.name,
    v_next_race.date::date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
