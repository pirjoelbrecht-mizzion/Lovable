/*
  # What-If Scenarios - Database Schema

  1. New Tables
    - `whatif_scenarios`
      - Stores user-created what-if scenarios for race simulations
      - Links to race IDs and user accounts
      - Contains override parameters (temperature, humidity, elevation, readiness, surface)
      - Tracks predicted time from adjusted conditions
      - Supports scenario naming and notes

  2. Security
    - Enable RLS on whatif_scenarios table
    - Users can only access their own scenarios
    - Full CRUD policies for authenticated users

  3. Features
    - JSON storage for flexible override parameters
    - Automatic timestamps with update triggers
    - Proper indexing for fast scenario retrieval
    - Ready for scenario comparison features
*/

CREATE TABLE IF NOT EXISTS whatif_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_id TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Override parameters stored as JSONB for flexibility
  temperature NUMERIC,
  humidity NUMERIC,
  elevation NUMERIC,
  readiness INTEGER CHECK (readiness >= 0 AND readiness <= 100),
  surface TEXT CHECK (surface IN ('road', 'trail', 'mixed')),

  -- Prediction results with overrides applied
  predicted_time_min NUMERIC NOT NULL,

  -- Optional notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  UNIQUE(user_id, race_id, name)
);

CREATE INDEX IF NOT EXISTS idx_whatif_scenarios_user_id ON whatif_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_whatif_scenarios_race_id ON whatif_scenarios(race_id);
CREATE INDEX IF NOT EXISTS idx_whatif_scenarios_created_at ON whatif_scenarios(created_at DESC);

-- Row Level Security
ALTER TABLE whatif_scenarios ENABLE ROW LEVEL SECURITY;

-- Policies for whatif_scenarios
CREATE POLICY "Users can view their own what-if scenarios"
  ON whatif_scenarios FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own what-if scenarios"
  ON whatif_scenarios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own what-if scenarios"
  ON whatif_scenarios FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own what-if scenarios"
  ON whatif_scenarios FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_whatif_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_whatif_scenarios_updated_at
  BEFORE UPDATE ON whatif_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_whatif_scenarios_updated_at();
