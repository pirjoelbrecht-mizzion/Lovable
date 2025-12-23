/*
  # Exercise Logging System for Strength Training

  1. New Tables
    - `exercise_logs` - Records individual exercise sets during strength sessions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `session_id` (uuid, for grouping exercises in a workout)
      - `exercise_name` (text) - Name of the exercise
      - `set_number` (integer) - Which set (1, 2, 3, etc.)
      - `reps` (integer) - Number of reps completed
      - `weight_kg` (decimal) - Weight used in kilograms
      - `rpe` (decimal) - Rate of perceived exertion (1-10)
      - `notes` (text) - Any notes about the set
      - `completed_at` (timestamptz) - When this set was completed
      - `created_at` (timestamptz)
    
    - `strength_sessions` - Groups exercise logs into workout sessions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `template_id` (text) - Reference to ME session template
      - `started_at` (timestamptz) - When workout started
      - `completed_at` (timestamptz) - When workout completed (null if in progress)
      - `total_duration_minutes` (integer)
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
*/

-- Create strength_sessions table
CREATE TABLE IF NOT EXISTS strength_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id text,
  template_name text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_duration_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create exercise_logs table
CREATE TABLE IF NOT EXISTS exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES strength_sessions(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  set_number integer NOT NULL DEFAULT 1,
  target_reps integer,
  actual_reps integer,
  weight_kg decimal(6,2),
  rpe decimal(3,1),
  notes text,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_id ON exercise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_session_id ON exercise_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_name ON exercise_logs(exercise_name);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_completed_at ON exercise_logs(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_strength_sessions_user_id ON strength_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_strength_sessions_started_at ON strength_sessions(started_at DESC);

-- Enable RLS
ALTER TABLE strength_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strength_sessions
CREATE POLICY "Users can view own strength sessions"
  ON strength_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strength sessions"
  ON strength_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strength sessions"
  ON strength_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own strength sessions"
  ON strength_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for exercise_logs
CREATE POLICY "Users can view own exercise logs"
  ON exercise_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise logs"
  ON exercise_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise logs"
  ON exercise_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise logs"
  ON exercise_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
