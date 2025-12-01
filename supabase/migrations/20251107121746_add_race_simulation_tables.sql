-- Race simulations table
CREATE TABLE IF NOT EXISTS race_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_id TEXT NOT NULL,
  race_name TEXT NOT NULL,
  race_distance_km NUMERIC NOT NULL,
  race_date DATE NOT NULL,
  
  -- Prediction results
  predicted_time_min NUMERIC NOT NULL,
  avg_pace NUMERIC NOT NULL,
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),
  
  -- Factors
  terrain_factor NUMERIC DEFAULT 1.0,
  elevation_factor NUMERIC DEFAULT 1.0,
  climate_factor NUMERIC DEFAULT 1.0,
  fatigue_penalty NUMERIC DEFAULT 1.0,
  confidence_score NUMERIC DEFAULT 0.75,
  
  -- Context
  readiness_score INTEGER,
  weeks_to_race NUMERIC,
  simulation_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(user_id, race_id, created_at)
);

CREATE INDEX IF NOT EXISTS idx_race_simulations_user_id ON race_simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_race_simulations_race_date ON race_simulations(race_date);
CREATE INDEX IF NOT EXISTS idx_race_simulations_created_at ON race_simulations(created_at DESC);

-- Readiness scores table
CREATE TABLE IF NOT EXISTS readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Score components
  value INTEGER NOT NULL CHECK (value >= 0 AND value <= 100),
  category TEXT CHECK (category IN ('high', 'moderate', 'low')),
  
  -- Component breakdown
  recovery_index NUMERIC,
  freshness NUMERIC,
  sleep NUMERIC,
  hrv NUMERIC,
  fatigue NUMERIC,
  
  -- Manual inputs
  sleep_hours NUMERIC,
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  fatigue_level INTEGER CHECK (fatigue_level >= 1 AND fatigue_level <= 10),
  hrv_value NUMERIC,
  hrv_baseline NUMERIC,
  
  -- Metadata
  source TEXT DEFAULT 'auto' CHECK (source IN ('auto', 'manual', 'garmin', 'oura', 'coros', 'apple')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_readiness_scores_user_id ON readiness_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_readiness_scores_date ON readiness_scores(date DESC);
CREATE INDEX IF NOT EXISTS idx_readiness_scores_category ON readiness_scores(category);

-- Row Level Security
ALTER TABLE race_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_scores ENABLE ROW LEVEL SECURITY;

-- Policies for race_simulations
CREATE POLICY "Users can view their own race simulations"
  ON race_simulations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own race simulations"
  ON race_simulations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own race simulations"
  ON race_simulations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own race simulations"
  ON race_simulations FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for readiness_scores
CREATE POLICY "Users can view their own readiness scores"
  ON readiness_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own readiness scores"
  ON readiness_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own readiness scores"
  ON readiness_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own readiness scores"
  ON readiness_scores FOR DELETE
  USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_race_simulations_updated_at BEFORE UPDATE ON race_simulations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_readiness_scores_updated_at BEFORE UPDATE ON readiness_scores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
