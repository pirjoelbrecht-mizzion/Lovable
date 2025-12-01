/*
  # Performance Factors Schema

  1. New Tables
    - `race_simulation_factors`
      - Stores detailed factor breakdown for each race simulation
      - Tracks fitness, consistency, long run, taper, weather, altitude factors
      - Links to races via race_id
      - Enables historical analysis and accuracy tracking

    - `weather_forecasts`
      - Caches weather data for race locations
      - Stores temperature, humidity, wind, precipitation
      - Includes heat index calculations
      - Auto-refreshes based on timestamp

    - `training_consistency_metrics`
      - Tracks weekly training consistency over time
      - Stores mean mileage, standard deviation, consistency score
      - Used for performance factor calculations
      - Historical data for trend analysis

    - `performance_factor_weights`
      - Configurable weights for each performance factor
      - Allows admin tuning and personalization
      - Defaults match research-based recommendations
      - Can be customized per user or globally

  2. Security
    - Enable RLS on all tables
    - Users can only access their own performance data
    - Weather forecasts shared across users (cached)
    - Factor weights read-only for users, admin-writable

  3. Indexes
    - race_simulation_factors: race_id, user_id, created_at
    - weather_forecasts: location, date, created_at
    - training_consistency_metrics: user_id, week_start_date
    - performance_factor_weights: user_id, is_default
*/

CREATE TABLE IF NOT EXISTS race_simulation_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  race_id text NOT NULL,

  fitness_factor numeric NOT NULL DEFAULT 1.0,
  consistency_factor numeric NOT NULL DEFAULT 1.0,
  long_run_factor numeric NOT NULL DEFAULT 1.0,
  taper_factor numeric NOT NULL DEFAULT 1.0,
  weather_factor numeric NOT NULL DEFAULT 1.0,
  course_factor numeric NOT NULL DEFAULT 1.0,
  altitude_factor numeric NOT NULL DEFAULT 1.0,
  terrain_factor numeric NOT NULL DEFAULT 1.0,

  total_factor numeric NOT NULL DEFAULT 1.0,
  predicted_time_min numeric NOT NULL,
  base_time_min numeric NOT NULL,

  fitness_score numeric,
  consistency_score numeric,
  long_run_readiness numeric,
  taper_quality numeric,
  weather_conditions jsonb,

  confidence text CHECK (confidence IN ('high', 'medium', 'low')) DEFAULT 'medium',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weather_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  location_lat numeric NOT NULL,
  location_lon numeric NOT NULL,
  location_name text,

  forecast_date date NOT NULL,
  forecast_hour integer CHECK (forecast_hour >= 0 AND forecast_hour <= 23),

  temperature_c numeric NOT NULL,
  humidity_pct numeric NOT NULL,
  wind_speed_kph numeric DEFAULT 0,
  precipitation_mm numeric DEFAULT 0,
  heat_index_c numeric,

  conditions text,
  source text DEFAULT 'open-meteo',

  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '6 hours'),

  UNIQUE(location_lat, location_lon, forecast_date, forecast_hour)
);

CREATE TABLE IF NOT EXISTS training_consistency_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  week_start_date date NOT NULL,
  week_end_date date NOT NULL,

  weekly_mileage numeric NOT NULL DEFAULT 0,
  mean_mileage numeric NOT NULL DEFAULT 0,
  std_dev numeric NOT NULL DEFAULT 0,
  consistency_score numeric NOT NULL DEFAULT 0,

  weeks_analyzed integer NOT NULL DEFAULT 8,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS performance_factor_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  fitness_weight numeric NOT NULL DEFAULT 0.25,
  consistency_weight numeric NOT NULL DEFAULT 0.10,
  long_run_weight numeric NOT NULL DEFAULT 0.10,
  taper_weight numeric NOT NULL DEFAULT 0.15,
  weather_weight numeric NOT NULL DEFAULT 0.15,
  course_weight numeric NOT NULL DEFAULT 0.15,
  altitude_weight numeric NOT NULL DEFAULT 0.10,

  is_default boolean DEFAULT false,
  name text,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE race_simulation_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_consistency_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_factor_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own simulation factors"
  ON race_simulation_factors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulation factors"
  ON race_simulation_factors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own simulation factors"
  ON race_simulation_factors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulation factors"
  ON race_simulation_factors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Weather forecasts are publicly readable"
  ON weather_forecasts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can cache weather"
  ON weather_forecasts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own consistency metrics"
  ON training_consistency_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consistency metrics"
  ON training_consistency_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consistency metrics"
  ON training_consistency_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own consistency metrics"
  ON training_consistency_metrics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view default factor weights"
  ON performance_factor_weights FOR SELECT
  TO authenticated
  USING (is_default = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own factor weights"
  ON performance_factor_weights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_default = false);

CREATE POLICY "Users can update own factor weights"
  ON performance_factor_weights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own factor weights"
  ON performance_factor_weights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_race_simulation_factors_user_race
  ON race_simulation_factors(user_id, race_id);

CREATE INDEX IF NOT EXISTS idx_race_simulation_factors_created
  ON race_simulation_factors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_weather_forecasts_location_date
  ON weather_forecasts(location_lat, location_lon, forecast_date);

CREATE INDEX IF NOT EXISTS idx_weather_forecasts_expires
  ON weather_forecasts(expires_at);

CREATE INDEX IF NOT EXISTS idx_training_consistency_user_date
  ON training_consistency_metrics(user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS idx_performance_weights_user_default
  ON performance_factor_weights(user_id, is_default);

INSERT INTO performance_factor_weights (is_default, name, notes)
VALUES (
  true,
  'Default Research-Based Weights',
  'Based on exercise physiology research and endurance performance studies'
)
ON CONFLICT DO NOTHING;
