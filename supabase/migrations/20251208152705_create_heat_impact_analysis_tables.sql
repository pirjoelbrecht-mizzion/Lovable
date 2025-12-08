/*
  # Heat Impact Analysis System

  1. New Tables
    - `race_weather_raw`
      - Stores hourly weather data from Open-Meteo archive API
      - Includes temperature, humidity, dew point, wind speed, solar radiation
      - One row per hour for each activity date/location

    - `race_weather_adjusted`
      - Elevation-corrected weather for each activity stream point
      - Uses lapse rate physics to adjust temperature/humidity by elevation
      - One row per stream point matching activity data resolution

    - `race_heat_stress_metrics`
      - Aggregated physiological stress metrics
      - Tracks HR drift, pace degradation, VAM decline, cadence drops
      - Includes heat/humidity scores and environmental risk classification

    - `race_heat_ai_insights`
      - LLM-generated analysis and recommendations
      - Stores OpenAI GPT-4o-mini insights about heat impact
      - Includes summary, key events, and personalized recommendations

  2. Security
    - Enable RLS on all tables
    - Users can only access their own heat impact data
    - Policies enforce user_id matching for all operations

  3. Indexes
    - Foreign key indexes for efficient joins
    - Composite indexes for time-series queries
    - Stream index for fast point-by-point retrieval
*/

-- Race Weather Raw: Hourly weather data from Open-Meteo
CREATE TABLE IF NOT EXISTS race_weather_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_entry_id uuid NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  hour_timestamp timestamptz NOT NULL,
  temperature_c real NOT NULL,
  humidity_percent real NOT NULL,
  dew_point_c real,
  wind_speed_kmh real,
  wind_direction_deg real,
  solar_radiation_wm2 real,
  weather_code integer,
  data_quality_score real DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(log_entry_id, hour_timestamp)
);

-- Race Weather Adjusted: Elevation-corrected weather per stream point
CREATE TABLE IF NOT EXISTS race_weather_adjusted (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_entry_id uuid NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  stream_index integer NOT NULL,
  timestamp timestamptz NOT NULL,
  elevation_m real NOT NULL,
  temperature_c real NOT NULL,
  humidity_percent real NOT NULL,
  heat_index_c real NOT NULL,
  dew_point_c real,
  feels_like_c real,
  created_at timestamptz DEFAULT now(),
  UNIQUE(log_entry_id, stream_index)
);

-- Race Heat Stress Metrics: Aggregated stress analysis
CREATE TABLE IF NOT EXISTS race_heat_stress_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_entry_id uuid NOT NULL UNIQUE REFERENCES log_entries(id) ON DELETE CASCADE,

  -- Heat Impact Scores
  heat_impact_score real NOT NULL DEFAULT 0,
  humidity_strain_score real NOT NULL DEFAULT 0,
  cooling_benefit_score real DEFAULT 0,
  overall_severity text CHECK (overall_severity IN ('LOW', 'MODERATE', 'HIGH', 'EXTREME')),

  -- Temperature Stats
  avg_temperature_c real,
  max_temperature_c real,
  min_temperature_c real,
  avg_heat_index_c real,
  max_heat_index_c real,

  -- Humidity Stats
  avg_humidity_percent real,
  max_humidity_percent real,
  time_above_80_humidity_minutes real DEFAULT 0,

  -- Physiological Stress Indicators
  hr_drift_detected boolean DEFAULT false,
  hr_drift_magnitude_bpm real,
  hr_drift_start_km real,
  pace_degradation_detected boolean DEFAULT false,
  pace_degradation_percent real,
  pace_degradation_start_km real,
  vam_decline_detected boolean DEFAULT false,
  vam_decline_percent real,
  cadence_drop_detected boolean DEFAULT false,
  cadence_drop_percent real,

  -- Environmental Risk Zones
  time_in_danger_zone_minutes real DEFAULT 0,
  time_in_extreme_danger_minutes real DEFAULT 0,
  peak_heat_period_start_km real,
  peak_heat_period_end_km real,

  -- Analysis Metadata
  analysis_confidence real DEFAULT 1.0,
  data_completeness_score real DEFAULT 1.0,
  analyzed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Race Heat AI Insights: LLM-generated analysis
CREATE TABLE IF NOT EXISTS race_heat_ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_entry_id uuid NOT NULL UNIQUE REFERENCES log_entries(id) ON DELETE CASCADE,

  -- LLM Insights
  summary text NOT NULL,
  key_events jsonb DEFAULT '[]'::jsonb,
  recommendations text[],

  -- Heat Tolerance Context
  athlete_heat_tolerance_level text,
  comparative_analysis text,

  -- LLM Metadata
  llm_model text DEFAULT 'gpt-4o-mini',
  llm_tokens_used integer,
  llm_cost_usd real,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_race_weather_raw_log_entry
  ON race_weather_raw(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_race_weather_raw_user
  ON race_weather_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_race_weather_raw_timestamp
  ON race_weather_raw(hour_timestamp);

CREATE INDEX IF NOT EXISTS idx_race_weather_adjusted_log_entry
  ON race_weather_adjusted(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_race_weather_adjusted_user
  ON race_weather_adjusted(user_id);
CREATE INDEX IF NOT EXISTS idx_race_weather_adjusted_stream
  ON race_weather_adjusted(log_entry_id, stream_index);

CREATE INDEX IF NOT EXISTS idx_race_heat_stress_metrics_user
  ON race_heat_stress_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_race_heat_stress_metrics_severity
  ON race_heat_stress_metrics(overall_severity)
  WHERE overall_severity IN ('HIGH', 'EXTREME');

CREATE INDEX IF NOT EXISTS idx_race_heat_ai_insights_user
  ON race_heat_ai_insights(user_id);

-- Enable Row Level Security
ALTER TABLE race_weather_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_weather_adjusted ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_heat_stress_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_heat_ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for race_weather_raw
CREATE POLICY "Users can view own weather data"
  ON race_weather_raw FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weather data"
  ON race_weather_raw FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weather data"
  ON race_weather_raw FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weather data"
  ON race_weather_raw FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for race_weather_adjusted
CREATE POLICY "Users can view own adjusted weather"
  ON race_weather_adjusted FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adjusted weather"
  ON race_weather_adjusted FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own adjusted weather"
  ON race_weather_adjusted FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own adjusted weather"
  ON race_weather_adjusted FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for race_heat_stress_metrics
CREATE POLICY "Users can view own heat metrics"
  ON race_heat_stress_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own heat metrics"
  ON race_heat_stress_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own heat metrics"
  ON race_heat_stress_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own heat metrics"
  ON race_heat_stress_metrics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for race_heat_ai_insights
CREATE POLICY "Users can view own AI insights"
  ON race_heat_ai_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI insights"
  ON race_heat_ai_insights FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI insights"
  ON race_heat_ai_insights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI insights"
  ON race_heat_ai_insights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
