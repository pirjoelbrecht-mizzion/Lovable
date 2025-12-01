/*
  # Add Physiological Simulation Tables

  ## Overview
  Adds tables to store physiological simulation data including energy dynamics,
  hydration tracking, GI distress risk, and nutrition strategies for race planning.

  ## New Tables

  ### `physiological_simulations`
  Stores complete physiological simulations with all inputs and outputs.
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users)
  - `race_id` (text, foreign key to races)
  - `fueling_rate` (integer) - grams per hour
  - `fluid_intake` (integer) - ml per hour
  - `sodium_intake` (integer) - mg per hour
  - `temperature` (numeric) - degrees Celsius
  - `humidity` (numeric) - percentage
  - `readiness_score` (integer) - 0-100
  - `hydration_pct` (numeric) - calculated hydration level
  - `sodium_balance_mg` (integer) - calculated sodium balance
  - `gi_risk_pct` (integer) - GI distress risk percentage
  - `gi_risk_level` (text) - low/moderate/high/very-high
  - `performance_penalty_pct` (integer) - total performance penalty
  - `adjusted_time_min` (numeric) - predicted finish time with penalties
  - `insights` (jsonb) - array of coach insights
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `energy_dynamics_snapshots`
  Stores energy/fatigue state at different distances for each simulation.
  - `id` (uuid, primary key)
  - `simulation_id` (uuid, foreign key to physiological_simulations)
  - `strategy` (text) - conservative/target/aggressive
  - `distance_km` (numeric)
  - `glycogen_pct` (numeric)
  - `fatigue_pct` (numeric)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own simulation data
  - Policies for SELECT, INSERT, UPDATE, DELETE
*/

CREATE TABLE IF NOT EXISTS physiological_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  race_id text NOT NULL,
  fueling_rate integer NOT NULL DEFAULT 60,
  fluid_intake integer NOT NULL DEFAULT 600,
  sodium_intake integer NOT NULL DEFAULT 800,
  temperature numeric NOT NULL DEFAULT 20,
  humidity numeric NOT NULL DEFAULT 50,
  readiness_score integer NOT NULL DEFAULT 70,
  hydration_pct numeric NOT NULL,
  sodium_balance_mg integer NOT NULL,
  gi_risk_pct integer NOT NULL,
  gi_risk_level text NOT NULL CHECK (gi_risk_level IN ('low', 'moderate', 'high', 'very-high')),
  performance_penalty_pct integer NOT NULL,
  adjusted_time_min numeric NOT NULL,
  insights jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS energy_dynamics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES physiological_simulations(id) ON DELETE CASCADE NOT NULL,
  strategy text NOT NULL CHECK (strategy IN ('conservative', 'target', 'aggressive')),
  distance_km numeric NOT NULL,
  glycogen_pct numeric NOT NULL,
  fatigue_pct numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE physiological_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_dynamics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own physiological simulations"
  ON physiological_simulations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own physiological simulations"
  ON physiological_simulations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own physiological simulations"
  ON physiological_simulations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own physiological simulations"
  ON physiological_simulations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own energy dynamics snapshots"
  ON energy_dynamics_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM physiological_simulations
      WHERE physiological_simulations.id = energy_dynamics_snapshots.simulation_id
      AND physiological_simulations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own energy dynamics snapshots"
  ON energy_dynamics_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM physiological_simulations
      WHERE physiological_simulations.id = energy_dynamics_snapshots.simulation_id
      AND physiological_simulations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own energy dynamics snapshots"
  ON energy_dynamics_snapshots
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM physiological_simulations
      WHERE physiological_simulations.id = energy_dynamics_snapshots.simulation_id
      AND physiological_simulations.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_physiological_simulations_user_id ON physiological_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_physiological_simulations_race_id ON physiological_simulations(race_id);
CREATE INDEX IF NOT EXISTS idx_energy_dynamics_snapshots_simulation_id ON energy_dynamics_snapshots(simulation_id);
