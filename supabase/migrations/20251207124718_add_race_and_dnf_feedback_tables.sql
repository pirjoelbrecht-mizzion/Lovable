/*
  # Race and DNF Feedback System

  1. New Tables
    - `race_feedback`
      - Captures race-specific feedback including difficulty ratings, limiters, and fuel logs
      - Linked to log entries via foreign key
      - Includes event type classification (race, simulation, time_trial)

    - `dnf_events`
      - Records DNF situations with detailed cause analysis
      - Tracks automatic detection vs manual flagging
      - Supports recovery protocol activation

    - `feedback_weights`
      - Lookup table for learning multipliers
      - Defines how much each feedback type influences model updates

  2. Schema Extensions
    - Extends `daily_feedback` table with session importance classification
    - Adds feedback prompting tracking to prevent duplicate prompts

  3. Security
    - Enable RLS on all new tables
    - Policies restrict access to authenticated users viewing their own data only

  4. Indexes
    - Composite indexes on (user_id, date, event_type) for efficient retrieval
    - Foreign key indexes for join performance
*/

-- Race Feedback Table
CREATE TABLE IF NOT EXISTS race_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('race', 'simulation', 'time_trial')),

  -- Difficulty ratings (1-5 scale)
  climbing_difficulty integer CHECK (climbing_difficulty BETWEEN 1 AND 5),
  downhill_difficulty integer CHECK (downhill_difficulty BETWEEN 1 AND 5),
  heat_perception integer CHECK (heat_perception BETWEEN 1 AND 5),
  technicality integer CHECK (technicality BETWEEN 1 AND 5),

  -- Performance limiters
  biggest_limiter text CHECK (biggest_limiter IN ('legs', 'stomach', 'heat', 'pacing', 'mindset', 'equipment', 'other')),
  limiter_notes text,

  -- Nutrition and fueling
  fuel_log text,
  issues_start_km numeric,

  -- Strengths
  strongest_performance_area text,

  -- Completion status
  completion_status text NOT NULL CHECK (completion_status IN ('completed', 'dnf', 'dns')) DEFAULT 'completed',

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- DNF Events Table
CREATE TABLE IF NOT EXISTS dnf_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE CASCADE,
  event_date date NOT NULL,

  -- DNF analysis
  dnf_cause text NOT NULL CHECK (dnf_cause IN ('injury', 'heat', 'stomach', 'pacing', 'mental', 'equipment', 'other')),
  dnf_cause_notes text,
  km_stopped numeric NOT NULL,
  had_warning_signs boolean DEFAULT false,

  -- Learning insights
  what_would_change text,
  what_went_well text,

  -- Detection metadata
  auto_detected boolean DEFAULT false,
  user_confirmed boolean DEFAULT false,
  detection_confidence numeric CHECK (detection_confidence BETWEEN 0 AND 1),

  -- Recovery protocol
  recovery_protocol_activated_at timestamptz,
  recovery_protocol_completed boolean DEFAULT false,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Feedback Weights Lookup Table
CREATE TABLE IF NOT EXISTS feedback_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_type text UNIQUE NOT NULL,
  weight_multiplier numeric NOT NULL CHECK (weight_multiplier > 0),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insert default feedback weights based on sports science recommendations
INSERT INTO feedback_weights (feedback_type, weight_multiplier, description) VALUES
  ('training_normal', 1.0, 'Regular training sessions - baseline weight'),
  ('training_key_workout', 1.5, 'Key workouts like tempo runs, intervals, or long runs'),
  ('race_simulation', 3.0, 'Race simulations - high quality signals about race readiness'),
  ('race', 5.0, 'Actual races - highest quality performance data'),
  ('dnf', 8.0, 'DNF events - critical learning moments requiring structural adjustments')
ON CONFLICT (feedback_type) DO NOTHING;

-- Extend daily_feedback table with session importance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_feedback' AND column_name = 'session_importance'
  ) THEN
    ALTER TABLE daily_feedback ADD COLUMN session_importance text
      CHECK (session_importance IN ('normal', 'key_workout', 'long_run', 'heat_session', 'back_to_back'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_feedback' AND column_name = 'feedback_prompted'
  ) THEN
    ALTER TABLE daily_feedback ADD COLUMN feedback_prompted boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_feedback' AND column_name = 'feedback_weight_multiplier'
  ) THEN
    ALTER TABLE daily_feedback ADD COLUMN feedback_weight_multiplier numeric DEFAULT 1.0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE race_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnf_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_weights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for race_feedback
CREATE POLICY "Users can view own race feedback"
  ON race_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own race feedback"
  ON race_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own race feedback"
  ON race_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own race feedback"
  ON race_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for dnf_events
CREATE POLICY "Users can view own dnf events"
  ON dnf_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dnf events"
  ON dnf_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dnf events"
  ON dnf_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dnf events"
  ON dnf_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for feedback_weights (read-only for all authenticated users)
CREATE POLICY "All authenticated users can view feedback weights"
  ON feedback_weights FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_race_feedback_user_date
  ON race_feedback(user_id, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_race_feedback_log_entry
  ON race_feedback(log_entry_id);

CREATE INDEX IF NOT EXISTS idx_race_feedback_event_type
  ON race_feedback(user_id, event_type);

CREATE INDEX IF NOT EXISTS idx_dnf_events_user_date
  ON dnf_events(user_id, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_dnf_events_log_entry
  ON dnf_events(log_entry_id);

CREATE INDEX IF NOT EXISTS idx_dnf_events_cause
  ON dnf_events(user_id, dnf_cause);

CREATE INDEX IF NOT EXISTS idx_dnf_events_recovery
  ON dnf_events(user_id, recovery_protocol_completed, recovery_protocol_activated_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_race_feedback_updated_at ON race_feedback;
CREATE TRIGGER update_race_feedback_updated_at
  BEFORE UPDATE ON race_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dnf_events_updated_at ON dnf_events;
CREATE TRIGGER update_dnf_events_updated_at
  BEFORE UPDATE ON dnf_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
