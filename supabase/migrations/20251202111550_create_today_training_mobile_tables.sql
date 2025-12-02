/*
  # Create Today's Training Mobile View Tables

  1. New Tables
    - `weather_cache_training`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `cache_key` (text, unique per user)
      - `location_lat` (numeric, latitude)
      - `location_lon` (numeric, longitude)
      - `date` (date, training date)
      - `weather_data` (jsonb, complete weather data)
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, cache_key)

    - `workout_preparation`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `date` (date, workout date)
      - `checked_items` (text[], gear checklist items)
      - `checked_tasks` (text[], pre-run tasks)
      - `updated_at` (timestamptz)
      - Unique constraint on (user_id, date)

    - `today_training_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `date` (date, training date)
      - `session_data` (jsonb, complete session data)
      - `active_tab` (text, last viewed tab)
      - `updated_at` (timestamptz)
      - Unique constraint on (user_id, date)

    - `user_tab_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `last_active_tab` (text, default 'overview')
      - `tab_order` (text[], custom tab order)
      - `updated_at` (timestamptz)
      - Unique constraint on user_id

    - `user_hydration_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `base_sweat_rate` (numeric, liters per hour)
      - `gut_training_level` (numeric, 0-1 scale)
      - `preferred_carry_method` (text, bottle/vest/handheld)
      - `electrolyte_preference` (text)
      - `updated_at` (timestamptz)
      - Unique constraint on user_id

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add auto-cleanup trigger for old weather cache

  3. Indexes
    - Index on weather_cache_training (user_id, created_at) for fast TTL queries
    - Index on workout_preparation (user_id, date) for quick daily lookups
    - Index on today_training_sessions (user_id, date) for session retrieval

  Notes:
    - Weather cache automatically expires after 24 hours via trigger
    - All timestamps use timestamptz for proper timezone handling
    - JSONB columns allow flexible data storage for weather and session data
    - Unique constraints prevent duplicate entries per user per day
*/

-- Create weather_cache_training table
CREATE TABLE IF NOT EXISTS weather_cache_training (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cache_key text NOT NULL,
  location_lat numeric NOT NULL,
  location_lon numeric NOT NULL,
  date date NOT NULL,
  weather_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT weather_cache_training_unique UNIQUE (user_id, cache_key)
);

-- Create workout_preparation table
CREATE TABLE IF NOT EXISTS workout_preparation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  checked_items text[] DEFAULT '{}',
  checked_tasks text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT workout_preparation_unique UNIQUE (user_id, date)
);

-- Create today_training_sessions table
CREATE TABLE IF NOT EXISTS today_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  session_data jsonb NOT NULL,
  active_tab text DEFAULT 'overview',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT today_training_sessions_unique UNIQUE (user_id, date)
);

-- Create user_tab_preferences table
CREATE TABLE IF NOT EXISTS user_tab_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_active_tab text DEFAULT 'overview',
  tab_order text[] DEFAULT ARRAY['overview', 'intelligence', 'preparation'],
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_tab_preferences_unique UNIQUE (user_id)
);

-- Create user_hydration_settings table
CREATE TABLE IF NOT EXISTS user_hydration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  base_sweat_rate numeric DEFAULT 0.8,
  gut_training_level numeric DEFAULT 0.5,
  preferred_carry_method text DEFAULT 'bottle',
  electrolyte_preference text DEFAULT 'standard',
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_hydration_settings_unique UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weather_cache_training_user_created
  ON weather_cache_training(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workout_preparation_user_date
  ON workout_preparation(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_today_training_sessions_user_date
  ON today_training_sessions(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE weather_cache_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_preparation ENABLE ROW LEVEL SECURITY;
ALTER TABLE today_training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tab_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_hydration_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weather_cache_training
CREATE POLICY "Users can view own weather cache"
  ON weather_cache_training FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weather cache"
  ON weather_cache_training FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weather cache"
  ON weather_cache_training FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weather cache"
  ON weather_cache_training FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for workout_preparation
CREATE POLICY "Users can view own workout preparation"
  ON workout_preparation FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout preparation"
  ON workout_preparation FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout preparation"
  ON workout_preparation FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout preparation"
  ON workout_preparation FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for today_training_sessions
CREATE POLICY "Users can view own training sessions"
  ON today_training_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training sessions"
  ON today_training_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training sessions"
  ON today_training_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training sessions"
  ON today_training_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_tab_preferences
CREATE POLICY "Users can view own tab preferences"
  ON user_tab_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tab preferences"
  ON user_tab_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tab preferences"
  ON user_tab_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tab preferences"
  ON user_tab_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_hydration_settings
CREATE POLICY "Users can view own hydration settings"
  ON user_hydration_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hydration settings"
  ON user_hydration_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hydration settings"
  ON user_hydration_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own hydration settings"
  ON user_hydration_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to auto-delete old weather cache
CREATE OR REPLACE FUNCTION cleanup_old_weather_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM weather_cache_training
  WHERE created_at < (now() - interval '24 hours');
END;
$$;

-- Create trigger to run cleanup daily
CREATE OR REPLACE FUNCTION trigger_cleanup_weather_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM weather_cache_training
  WHERE created_at < (now() - interval '24 hours')
    AND user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_weather_cache_on_insert
  AFTER INSERT ON weather_cache_training
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_weather_cache();
