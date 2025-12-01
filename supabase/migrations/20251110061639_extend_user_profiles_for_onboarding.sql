/*
  # Extend User Profiles for Onboarding

  1. Changes
    - Add onboarding-related columns to existing user_profiles table
    - Goal type, experience level, training preferences
    - Device integration status
    - Target race information
    - Onboarding completion tracking
    
  2. Security
    - Existing RLS policies apply to new columns
    - No changes to access control
*/

-- Add new columns for onboarding
DO $$
BEGIN
  -- Goal & Experience
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'goal_type') THEN
    ALTER TABLE user_profiles ADD COLUMN goal_type TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'experience_level') THEN
    ALTER TABLE user_profiles ADD COLUMN experience_level TEXT DEFAULT 'beginner';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'motivation') THEN
    ALTER TABLE user_profiles ADD COLUMN motivation TEXT;
  END IF;

  -- Training Schedule
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'days_per_week') THEN
    ALTER TABLE user_profiles ADD COLUMN days_per_week INTEGER DEFAULT 3;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'rest_days') THEN
    ALTER TABLE user_profiles ADD COLUMN rest_days TEXT[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'preferred_run_days') THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_run_days TEXT[];
  END IF;

  -- Preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'surface') THEN
    ALTER TABLE user_profiles ADD COLUMN surface TEXT DEFAULT 'road';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'cross_training') THEN
    ALTER TABLE user_profiles ADD COLUMN cross_training TEXT[];
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'strength_preference') THEN
    ALTER TABLE user_profiles ADD COLUMN strength_preference TEXT DEFAULT 'none';
  END IF;

  -- Current Fitness
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'avg_mileage') THEN
    ALTER TABLE user_profiles ADD COLUMN avg_mileage NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'long_run_distance') THEN
    ALTER TABLE user_profiles ADD COLUMN long_run_distance NUMERIC;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'current_pace') THEN
    ALTER TABLE user_profiles ADD COLUMN current_pace NUMERIC;
  END IF;

  -- Device Integration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'device_connected') THEN
    ALTER TABLE user_profiles ADD COLUMN device_connected BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'device_type') THEN
    ALTER TABLE user_profiles ADD COLUMN device_type TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'device_data') THEN
    ALTER TABLE user_profiles ADD COLUMN device_data JSONB;
  END IF;

  -- Target Race
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'target_race') THEN
    ALTER TABLE user_profiles ADD COLUMN target_race JSONB;
  END IF;

  -- Plan Configuration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'plan_template') THEN
    ALTER TABLE user_profiles ADD COLUMN plan_template TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'plan_start_date') THEN
    ALTER TABLE user_profiles ADD COLUMN plan_start_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'ai_adaptation_level') THEN
    ALTER TABLE user_profiles ADD COLUMN ai_adaptation_level INTEGER DEFAULT 0;
  END IF;

  -- Onboarding Status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed_at') THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add check constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_goal_type_check') THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_goal_type_check 
    CHECK (goal_type IS NULL OR goal_type IN ('5k', '10k', 'half', 'marathon', 'ultra'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_experience_level_check') THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_experience_level_check 
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_days_per_week_check') THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_days_per_week_check 
    CHECK (days_per_week >= 1 AND days_per_week <= 7);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_surface_check') THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_surface_check 
    CHECK (surface IS NULL OR surface IN ('road', 'trail', 'treadmill', 'mixed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_strength_preference_check') THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_strength_preference_check 
    CHECK (strength_preference IN ('none', 'base', 'mountain', 'ultra'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_device_type_check') THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_device_type_check 
    CHECK (device_type IS NULL OR device_type IN ('strava', 'garmin', 'coros', 'apple', 'polar', 'suunto'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_ai_adaptation_level_check') THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_ai_adaptation_level_check 
    CHECK (ai_adaptation_level >= 0 AND ai_adaptation_level <= 2);
  END IF;
END $$;

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_goal_type ON user_profiles(goal_type) WHERE goal_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed ON user_profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_user_profiles_device_data_gin ON user_profiles USING gin(device_data) WHERE device_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_target_race_gin ON user_profiles USING gin(target_race) WHERE target_race IS NOT NULL;

-- Add comments
COMMENT ON COLUMN user_profiles.goal_type IS 
  'Primary running goal from onboarding: 5k, 10k, half marathon, marathon, or ultra';

COMMENT ON COLUMN user_profiles.ai_adaptation_level IS 
  '0=fun only, 1=adaptive training, 2=AI+HR based adaptation';

COMMENT ON COLUMN user_profiles.device_data IS 
  'JSONB containing HR data, mileage, pace, and other metrics from connected devices';

COMMENT ON COLUMN user_profiles.target_race IS 
  'JSONB containing target race details: name, date, distance, location, elevation';

COMMENT ON COLUMN user_profiles.onboarding_completed IS
  'Whether user has completed the onboarding flow';
