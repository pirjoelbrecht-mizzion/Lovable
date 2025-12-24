/*
  # Add Core Training System

  ## Overview
  This migration adds a comprehensive core training system aligned with mountain
  endurance training methodology. Supports VK, Ultra, and Skimo athletes.

  ## 1. New Tables
  - core_exercises: Library of categorized core exercises
  - user_core_progress: Tracks user core training progress
  - user_me_progress: Tracks ME workout progression (1-12)
  - user_me_session_history: History of completed ME sessions
  - user_core_session_history: History of completed core sessions

  ## 2. Updates
  - Adds eccentric_load column to strength_exercises if missing
  - Adds core category columns

  ## 3. Security
  - RLS enabled on all new tables
  - Users can only access their own progress data
*/

-- Core Exercises Library
CREATE TABLE IF NOT EXISTS core_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  core_categories text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  eccentric_load text NOT NULL DEFAULT 'low' CHECK (eccentric_load IN ('low', 'moderate', 'high')),
  equipment text[] DEFAULT '{}',
  contraindications text[] DEFAULT '{}',
  technique_cues text[] DEFAULT '{}',
  video_url text,
  duration_seconds integer,
  reps_default integer,
  description text,
  created_at timestamptz DEFAULT now()
);

-- User Core Progress
CREATE TABLE IF NOT EXISTS user_core_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_emphasis text[] DEFAULT '{}',
  sessions_this_week integer DEFAULT 0,
  last_session_date timestamptz,
  soreness_level decimal CHECK (soreness_level >= 0 AND soreness_level <= 10),
  soreness_reported_at timestamptz,
  volume_adjustment_percent integer DEFAULT 0 CHECK (volume_adjustment_percent >= -100 AND volume_adjustment_percent <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

-- User ME Progress
CREATE TABLE IF NOT EXISTS user_me_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  current_workout_number integer NOT NULL DEFAULT 1 CHECK (current_workout_number >= 1 AND current_workout_number <= 12),
  last_session_date timestamptz,
  total_sessions_completed integer DEFAULT 0,
  current_load_percent integer DEFAULT 0,
  current_rest_seconds integer DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, category)
);

-- User ME Session History
CREATE TABLE IF NOT EXISTS user_me_session_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES me_session_templates(id),
  workout_number integer NOT NULL,
  category text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  duration_minutes integer,
  load_percent integer,
  rest_seconds integer,
  soreness_rating integer CHECK (soreness_rating >= 1 AND soreness_rating <= 10),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- User Core Session History
CREATE TABLE IF NOT EXISTS user_core_session_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  duration_minutes integer,
  emphasis_categories text[] DEFAULT '{}',
  exercises_completed jsonb DEFAULT '[]',
  soreness_rating integer CHECK (soreness_rating >= 1 AND soreness_rating <= 10),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add eccentric_load to strength_exercises if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strength_exercises' AND column_name = 'eccentric_load'
  ) THEN
    ALTER TABLE strength_exercises ADD COLUMN eccentric_load text DEFAULT 'low' CHECK (eccentric_load IN ('low', 'moderate', 'high'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE core_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_core_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_me_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_me_session_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_core_session_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for core_exercises (read-only for authenticated)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'core_exercises' AND policyname = 'Authenticated users can read core exercises') THEN
    CREATE POLICY "Authenticated users can read core exercises"
      ON core_exercises FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- RLS Policies for user_core_progress
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_core_progress' AND policyname = 'Users can read own core progress') THEN
    CREATE POLICY "Users can read own core progress"
      ON user_core_progress FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_core_progress' AND policyname = 'Users can insert own core progress') THEN
    CREATE POLICY "Users can insert own core progress"
      ON user_core_progress FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_core_progress' AND policyname = 'Users can update own core progress') THEN
    CREATE POLICY "Users can update own core progress"
      ON user_core_progress FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_core_progress' AND policyname = 'Users can delete own core progress') THEN
    CREATE POLICY "Users can delete own core progress"
      ON user_core_progress FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policies for user_me_progress
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_me_progress' AND policyname = 'Users can read own ME progress') THEN
    CREATE POLICY "Users can read own ME progress"
      ON user_me_progress FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_me_progress' AND policyname = 'Users can insert own ME progress') THEN
    CREATE POLICY "Users can insert own ME progress"
      ON user_me_progress FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_me_progress' AND policyname = 'Users can update own ME progress') THEN
    CREATE POLICY "Users can update own ME progress"
      ON user_me_progress FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_me_progress' AND policyname = 'Users can delete own ME progress') THEN
    CREATE POLICY "Users can delete own ME progress"
      ON user_me_progress FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policies for user_me_session_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_me_session_history' AND policyname = 'Users can read own ME history') THEN
    CREATE POLICY "Users can read own ME history"
      ON user_me_session_history FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_me_session_history' AND policyname = 'Users can insert own ME history') THEN
    CREATE POLICY "Users can insert own ME history"
      ON user_me_session_history FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- RLS Policies for user_core_session_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_core_session_history' AND policyname = 'Users can read own core history') THEN
    CREATE POLICY "Users can read own core history"
      ON user_core_session_history FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_core_session_history' AND policyname = 'Users can insert own core history') THEN
    CREATE POLICY "Users can insert own core history"
      ON user_core_session_history FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_core_exercises_categories ON core_exercises USING GIN (core_categories);
CREATE INDEX IF NOT EXISTS idx_user_core_progress_user ON user_core_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_user_me_progress_user ON user_me_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_user_me_history_user ON user_me_session_history (user_id);
CREATE INDEX IF NOT EXISTS idx_user_core_history_user ON user_core_session_history (user_id);
