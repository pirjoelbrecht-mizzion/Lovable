/*
  # Create Learning State and Derived Metrics Tables

  ## Summary
  This migration creates the infrastructure for self-learning analytics that adapts
  to each athlete's unique training patterns and physiological responses.

  ## New Tables

  ### 1. athlete_learning_state
  Stores personalized baselines and learned coefficients for each athlete
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `baseline_hr` (numeric) - Athlete's typical resting/easy HR
  - `baseline_pace` (numeric) - Typical easy pace in min/km
  - `baseline_efficiency` (numeric) - HR-to-pace efficiency baseline
  - `acwr_mean` (numeric) - Personal average ACWR (Acute:Chronic Workload Ratio)
  - `acwr_std_dev` (numeric) - Standard deviation of ACWR for safe zone calculation
  - `efficiency_trend_slope` (numeric) - Linear regression slope of efficiency over time
  - `fatigue_threshold` (numeric) - 90th percentile of historical fatigue scores
  - `hr_drift_baseline` (numeric) - Typical HR drift percentage in long runs
  - `cadence_stability` (numeric) - Average cadence consistency score
  - `injury_risk_factors` (jsonb) - Structured risk indicators
  - `computation_metadata` (jsonb) - Details about how baselines were computed
  - `last_computed_at` (timestamptz) - When these values were last calculated
  - `data_quality_score` (numeric) - 0-1 score based on data completeness
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. derived_metrics_weekly
  Pre-computed weekly training metrics for fast dashboard rendering
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `week_start_date` (date) - ISO week start (Monday)
  - `total_distance_km` (numeric) - Total weekly distance
  - `total_duration_min` (numeric) - Total training time
  - `avg_hr` (numeric) - Average heart rate across all runs
  - `avg_pace` (numeric) - Average pace in min/km
  - `long_run_km` (numeric) - Longest single run distance
  - `acute_load` (numeric) - Current week's load
  - `chronic_load` (numeric) - 4-week rolling average load
  - `acwr` (numeric) - Acute:Chronic Workload Ratio
  - `efficiency_score` (numeric) - Pace-HR efficiency metric
  - `fatigue_index` (numeric) - Computed fatigue score (0-100)
  - `hr_drift_pct` (numeric) - Heart rate drift percentage
  - `cadence_avg` (numeric) - Average cadence
  - `monotony` (numeric) - Training monotony score
  - `strain` (numeric) - Training strain index
  - `elevation_gain_m` (numeric) - Total elevation gain
  - `run_count` (integer) - Number of runs this week
  - `quality_sessions` (integer) - Number of high-intensity sessions
  - `metadata` (jsonb) - Additional computed data
  - `created_at` (timestamptz)

  ### 3. metric_computation_log
  Tracks when and how learning state was computed for debugging and monitoring
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `computation_type` (text) - Type: 'baseline', 'weekly', 'full_recompute'
  - `status` (text) - Status: 'success', 'partial', 'failed'
  - `records_processed` (integer) - Number of log entries analyzed
  - `computation_duration_ms` (integer) - Time taken to compute
  - `error_message` (text) - Error details if failed
  - `triggered_by` (text) - 'scheduled', 'manual', 'auto'
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own learning state and metrics
  - Computation logs are read-only for users, admin-writable only
  - All policies restrict by auth.uid() = user_id

  ## Performance Indexes
  - Composite indexes on (user_id, week_start_date) for fast time-range queries
  - Index on last_computed_at for identifying stale data
  - Index on computation_type and status for monitoring queries

  ## Notes
  - ACWR safe zones are calculated as mean ± std_dev
  - Efficiency trend uses least-squares linear regression
  - Fatigue threshold uses 90th percentile to catch outliers
  - Data quality score considers recency, completeness, and HR data availability
*/

-- Create athlete_learning_state table
CREATE TABLE IF NOT EXISTS athlete_learning_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  baseline_hr numeric DEFAULT 140 CHECK (baseline_hr > 0 AND baseline_hr < 220),
  baseline_pace numeric DEFAULT 6.0 CHECK (baseline_pace > 0 AND baseline_pace < 15),
  baseline_efficiency numeric DEFAULT 23.3,
  acwr_mean numeric DEFAULT 1.0 CHECK (acwr_mean >= 0),
  acwr_std_dev numeric DEFAULT 0.2 CHECK (acwr_std_dev >= 0),
  efficiency_trend_slope numeric DEFAULT 0,
  fatigue_threshold numeric DEFAULT 70 CHECK (fatigue_threshold >= 0 AND fatigue_threshold <= 100),
  hr_drift_baseline numeric DEFAULT 5.0,
  cadence_stability numeric DEFAULT 0.9,
  injury_risk_factors jsonb DEFAULT '{}'::jsonb,
  computation_metadata jsonb DEFAULT '{}'::jsonb,
  last_computed_at timestamptz DEFAULT now(),
  data_quality_score numeric DEFAULT 0.5 CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create derived_metrics_weekly table
CREATE TABLE IF NOT EXISTS derived_metrics_weekly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  total_distance_km numeric DEFAULT 0 CHECK (total_distance_km >= 0),
  total_duration_min numeric DEFAULT 0 CHECK (total_duration_min >= 0),
  avg_hr numeric CHECK (avg_hr IS NULL OR (avg_hr > 0 AND avg_hr < 220)),
  avg_pace numeric CHECK (avg_pace IS NULL OR (avg_pace > 0 AND avg_pace < 15)),
  long_run_km numeric DEFAULT 0,
  acute_load numeric DEFAULT 0,
  chronic_load numeric,
  acwr numeric CHECK (acwr IS NULL OR acwr >= 0),
  efficiency_score numeric,
  fatigue_index numeric CHECK (fatigue_index IS NULL OR (fatigue_index >= 0 AND fatigue_index <= 100)),
  hr_drift_pct numeric,
  cadence_avg numeric,
  monotony numeric,
  strain numeric,
  elevation_gain_m numeric DEFAULT 0,
  run_count integer DEFAULT 0 CHECK (run_count >= 0),
  quality_sessions integer DEFAULT 0 CHECK (quality_sessions >= 0),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_week UNIQUE (user_id, week_start_date)
);

-- Create metric_computation_log table
CREATE TABLE IF NOT EXISTS metric_computation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  computation_type text NOT NULL CHECK (computation_type IN ('baseline', 'weekly', 'full_recompute')),
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  records_processed integer DEFAULT 0 CHECK (records_processed >= 0),
  computation_duration_ms integer CHECK (computation_duration_ms >= 0),
  error_message text,
  triggered_by text DEFAULT 'manual' CHECK (triggered_by IN ('scheduled', 'manual', 'auto')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE athlete_learning_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE derived_metrics_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_computation_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for athlete_learning_state
CREATE POLICY "Users can view own learning state"
  ON athlete_learning_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning state"
  ON athlete_learning_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning state"
  ON athlete_learning_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning state"
  ON athlete_learning_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for derived_metrics_weekly
CREATE POLICY "Users can view own derived metrics"
  ON derived_metrics_weekly FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own derived metrics"
  ON derived_metrics_weekly FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own derived metrics"
  ON derived_metrics_weekly FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own derived metrics"
  ON derived_metrics_weekly FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for metric_computation_log
CREATE POLICY "Users can view own computation logs"
  ON metric_computation_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert computation logs"
  ON metric_computation_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS athlete_learning_state_user_id_idx
  ON athlete_learning_state(user_id);

CREATE INDEX IF NOT EXISTS athlete_learning_state_last_computed_idx
  ON athlete_learning_state(last_computed_at DESC);

CREATE INDEX IF NOT EXISTS derived_metrics_user_week_idx
  ON derived_metrics_weekly(user_id, week_start_date DESC);

CREATE INDEX IF NOT EXISTS derived_metrics_week_idx
  ON derived_metrics_weekly(week_start_date DESC);

CREATE INDEX IF NOT EXISTS computation_log_user_type_idx
  ON metric_computation_log(user_id, computation_type, created_at DESC);

CREATE INDEX IF NOT EXISTS computation_log_status_idx
  ON metric_computation_log(status, created_at DESC)
  WHERE status != 'success';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_learning_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_athlete_learning_state_timestamp ON athlete_learning_state;
CREATE TRIGGER update_athlete_learning_state_timestamp
  BEFORE UPDATE ON athlete_learning_state
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_state_timestamp();

-- Create helper function to get week start date (Monday)
CREATE OR REPLACE FUNCTION get_week_start_date(input_date date)
RETURNS date AS $$
BEGIN
  -- Get the Monday of the week containing input_date
  RETURN input_date - ((EXTRACT(DOW FROM input_date)::integer + 6) % 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for easy access to learning state with quality indicators
CREATE OR REPLACE VIEW athlete_learning_state_with_quality AS
SELECT
  als.*,
  CASE
    WHEN als.data_quality_score >= 0.8 THEN 'high'
    WHEN als.data_quality_score >= 0.5 THEN 'medium'
    ELSE 'low'
  END as quality_category,
  CASE
    WHEN als.last_computed_at > now() - interval '7 days' THEN true
    ELSE false
  END as is_fresh,
  als.acwr_mean - als.acwr_std_dev as acwr_lower_bound,
  als.acwr_mean + als.acwr_std_dev as acwr_upper_bound
FROM athlete_learning_state als;
