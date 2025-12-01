/*
  # Workout Completion & Feedback System

  1. New Tables
    - `workout_completions`
      - Links log entries to planned workouts
      - Tracks which activity fulfilled which plan
      - Handles multiple activities per day

    - `daily_feedback`
      - Post-workout subjective feedback
      - RPE (Rate of Perceived Exertion)
      - Pain/soreness tracking
      - Mood/feeling state
      - Links to log entries

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
    - Policies for select, insert, update operations

  3. Indexes
    - Performance indexes on foreign keys
    - Indexes on date fields for queries
*/

-- Create workout_completions table
CREATE TABLE IF NOT EXISTS workout_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_date date NOT NULL,
  planned_workout_id text,
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE CASCADE NOT NULL,
  match_type text CHECK (match_type IN ('exact', 'combined', 'manual')) DEFAULT 'exact',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create daily_feedback table
CREATE TABLE IF NOT EXISTS daily_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE SET NULL,
  workout_completion_id uuid REFERENCES workout_completions(id) ON DELETE SET NULL,

  -- Subjective metrics
  rpe integer CHECK (rpe >= 1 AND rpe <= 10) NOT NULL,
  feeling text CHECK (feeling IN ('great', 'good', 'tired', 'exhausted', 'sick', 'injured')) NOT NULL,
  pain_areas text[] DEFAULT '{}',

  -- Optional notes
  notes text,

  -- Motivation/compliance tracking
  motivation_level integer CHECK (motivation_level >= 1 AND motivation_level <= 10),
  sleep_quality integer CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  stress_level integer CHECK (stress_level >= 1 AND stress_level <= 10),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_completions_user_date ON workout_completions(user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_completions_log_entry ON workout_completions(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_daily_feedback_user_date ON daily_feedback(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_feedback_log_entry ON daily_feedback(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_daily_feedback_workout_completion ON daily_feedback(workout_completion_id);

-- Enable Row Level Security
ALTER TABLE workout_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_completions
CREATE POLICY "Users can view own workout completions"
  ON workout_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout completions"
  ON workout_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout completions"
  ON workout_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout completions"
  ON workout_completions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for daily_feedback
CREATE POLICY "Users can view own daily feedback"
  ON daily_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily feedback"
  ON daily_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily feedback"
  ON daily_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily feedback"
  ON daily_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_workout_completions_updated_at ON workout_completions;
CREATE TRIGGER update_workout_completions_updated_at
  BEFORE UPDATE ON workout_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_feedback_updated_at ON daily_feedback;
CREATE TRIGGER update_daily_feedback_updated_at
  BEFORE UPDATE ON daily_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
