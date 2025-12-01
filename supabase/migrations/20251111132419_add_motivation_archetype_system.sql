/*
  # Add Motivation Archetype System

  ## Overview
  Implements the motivation-aware coaching system that automatically detects and tracks
  runner archetypes based on training behavior, preferences, and self-reported motivations.

  ## 1. New Columns in user_profiles
    - `motivation_archetype` (JSONB): Current motivation scores for all six archetypes
      - performer, adventurer, mindful, health, transformer, connector (0-1 scale each)
    - `dominant_archetype` (TEXT): The primary archetype (highest score)
    - `archetype_confidence` (NUMERIC): Confidence level in current classification (0-1)
    - `archetype_last_updated` (TIMESTAMPTZ): When archetype was last recalculated
    - `onboarding_responses` (JSONB): Stores raw onboarding conversation data
    - `coach_tone_preference` (TEXT): User override for coach tone (optional)

  ## 2. New Table: motivation_history
    - Tracks how user's motivation archetype evolves over time
    - Stores snapshots every 30 days or when significant change detected
    - Enables "motivation evolution timeline" feature
    - Fields: archetype scores, trigger event, training context

  ## 3. New Table: training_analysis_cache
    - Stores pre-computed training metrics for fast motivation detection
    - Aggregates from log_entries: weekly km, HR zones, rest patterns
    - Refreshed daily via scheduled job or on-demand
    - Reduces computation time for archetype scoring

  ## 4. Security
    - Enable RLS on all new tables
    - Users can only access their own motivation data
    - Archetype calculations server-side only (no public exposure)

  ## 5. Performance
    - GIN indexes on JSONB columns for fast archetype queries
    - Composite indexes for time-based analysis queries
    - Partial indexes for active archetype tracking
*/

-- =====================================================
-- 1. Extend user_profiles with motivation fields
-- =====================================================

DO $$
BEGIN
  -- Motivation archetype scores (all 6 types, 0-1 scale)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'motivation_archetype') THEN
    ALTER TABLE user_profiles ADD COLUMN motivation_archetype JSONB DEFAULT '{
      "performer": 0.0,
      "adventurer": 0.0,
      "mindful": 0.0,
      "health": 0.0,
      "transformer": 0.0,
      "connector": 0.0
    }'::jsonb;
  END IF;

  -- Dominant archetype (text label for quick access)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'dominant_archetype') THEN
    ALTER TABLE user_profiles ADD COLUMN dominant_archetype TEXT;
  END IF;

  -- Confidence in current classification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'archetype_confidence') THEN
    ALTER TABLE user_profiles ADD COLUMN archetype_confidence NUMERIC DEFAULT 0.0 CHECK (archetype_confidence >= 0 AND archetype_confidence <= 1);
  END IF;

  -- Last update timestamp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'archetype_last_updated') THEN
    ALTER TABLE user_profiles ADD COLUMN archetype_last_updated TIMESTAMPTZ;
  END IF;

  -- Onboarding conversation responses (raw data for analysis)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'onboarding_responses') THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_responses JSONB;
  END IF;

  -- Optional coach tone override
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'coach_tone_preference') THEN
    ALTER TABLE user_profiles ADD COLUMN coach_tone_preference TEXT;
  END IF;
END $$;

-- Add check constraint for valid archetype names
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_dominant_archetype_check') THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_dominant_archetype_check 
    CHECK (dominant_archetype IS NULL OR dominant_archetype IN ('performer', 'adventurer', 'mindful', 'health', 'transformer', 'connector'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_coach_tone_check') THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_coach_tone_check 
    CHECK (coach_tone_preference IS NULL OR coach_tone_preference IN ('auto', 'supportive', 'challenging', 'educational', 'fun'));
  END IF;
END $$;

-- =====================================================
-- 2. Create motivation_history table
-- =====================================================

CREATE TABLE IF NOT EXISTS motivation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Snapshot of archetype scores at this point in time
  archetype_scores JSONB NOT NULL,
  dominant_archetype TEXT NOT NULL,
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  -- What triggered this snapshot
  trigger_event TEXT NOT NULL,
  trigger_details JSONB,

  -- Training context at time of snapshot
  training_context JSONB,

  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT motivation_history_dominant_archetype_check 
  CHECK (dominant_archetype IN ('performer', 'adventurer', 'mindful', 'health', 'transformer', 'connector')),
  
  CONSTRAINT motivation_history_trigger_event_check 
  CHECK (trigger_event IN ('onboarding', 'scheduled_update', 'significant_change', 'manual_recalculation', 'training_pattern_shift'))
);

-- =====================================================
-- 3. Create training_analysis_cache table
-- =====================================================

CREATE TABLE IF NOT EXISTS training_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time period this analysis covers
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Aggregated metrics
  total_km NUMERIC DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  avg_session_km NUMERIC,
  longest_run_km NUMERIC,
  
  -- Intensity distribution (% of time in each zone)
  hr_zone_distribution JSONB,
  
  -- Patterns
  rest_days_count INTEGER DEFAULT 0,
  consistency_score NUMERIC,
  
  -- Terrain preferences
  trail_percentage NUMERIC DEFAULT 0,
  elevation_total_m NUMERIC DEFAULT 0,
  
  -- Frequency patterns
  avg_sessions_per_week NUMERIC,
  
  -- HR data
  avg_hr NUMERIC,
  hr_data_available BOOLEAN DEFAULT false,

  -- Metadata
  computed_at TIMESTAMPTZ DEFAULT now(),
  is_valid BOOLEAN DEFAULT true,

  -- Ensure one cache entry per user per period
  CONSTRAINT training_analysis_cache_user_period_unique UNIQUE(user_id, period_start, period_end)
);

-- =====================================================
-- 4. Create indexes
-- =====================================================

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_motivation_archetype_gin 
ON user_profiles USING gin(motivation_archetype) 
WHERE motivation_archetype IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_dominant_archetype 
ON user_profiles(dominant_archetype) 
WHERE dominant_archetype IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_archetype_updated 
ON user_profiles(archetype_last_updated DESC) 
WHERE archetype_last_updated IS NOT NULL;

-- Motivation history indexes
CREATE INDEX IF NOT EXISTS idx_motivation_history_user_recorded 
ON motivation_history(user_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_motivation_history_dominant 
ON motivation_history(dominant_archetype, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_motivation_history_trigger 
ON motivation_history(trigger_event, recorded_at DESC);

-- Training analysis cache indexes
CREATE INDEX IF NOT EXISTS idx_training_analysis_cache_user_period 
ON training_analysis_cache(user_id, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_training_analysis_cache_valid 
ON training_analysis_cache(user_id, is_valid) 
WHERE is_valid = true;

-- =====================================================
-- 5. Enable Row Level Security
-- =====================================================

ALTER TABLE motivation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_analysis_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for motivation_history

CREATE POLICY "Users can view their own motivation history"
  ON motivation_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own motivation history"
  ON motivation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own motivation history"
  ON motivation_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for training_analysis_cache

CREATE POLICY "Users can view their own training analysis"
  ON training_analysis_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training analysis"
  ON training_analysis_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training analysis"
  ON training_analysis_cache
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training analysis"
  ON training_analysis_cache
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. Helper Functions
-- =====================================================

-- Function to record a motivation history snapshot
CREATE OR REPLACE FUNCTION record_motivation_snapshot(
  p_user_id UUID,
  p_archetype_scores JSONB,
  p_dominant_archetype TEXT,
  p_confidence NUMERIC,
  p_trigger_event TEXT,
  p_trigger_details JSONB DEFAULT NULL,
  p_training_context JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
BEGIN
  INSERT INTO motivation_history (
    user_id,
    archetype_scores,
    dominant_archetype,
    confidence,
    trigger_event,
    trigger_details,
    training_context,
    recorded_at
  ) VALUES (
    p_user_id,
    p_archetype_scores,
    p_dominant_archetype,
    p_confidence,
    p_trigger_event,
    p_trigger_details,
    p_training_context,
    now()
  )
  RETURNING id INTO v_snapshot_id;

  -- Also update the user profile with latest archetype
  UPDATE user_profiles
  SET
    motivation_archetype = p_archetype_scores,
    dominant_archetype = p_dominant_archetype,
    archetype_confidence = p_confidence,
    archetype_last_updated = now()
  WHERE user_id = p_user_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's archetype evolution
CREATE OR REPLACE FUNCTION get_archetype_evolution(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  recorded_at TIMESTAMPTZ,
  dominant_archetype TEXT,
  confidence NUMERIC,
  trigger_event TEXT,
  archetype_scores JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mh.recorded_at,
    mh.dominant_archetype,
    mh.confidence,
    mh.trigger_event,
    mh.archetype_scores
  FROM motivation_history mh
  WHERE mh.user_id = p_user_id
  ORDER BY mh.recorded_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. Comments
-- =====================================================

COMMENT ON COLUMN user_profiles.motivation_archetype IS
  'JSONB object containing scores (0-1) for all six motivation archetypes: performer, adventurer, mindful, health, transformer, connector';

COMMENT ON COLUMN user_profiles.dominant_archetype IS
  'Primary motivation archetype with highest score - determines UI theme and coach tone';

COMMENT ON COLUMN user_profiles.archetype_confidence IS
  'Confidence level in current archetype classification (0-1). Values >0.6 indicate strong classification';

COMMENT ON COLUMN user_profiles.onboarding_responses IS
  'Raw onboarding conversation data including selected options, free text, and timing';

COMMENT ON TABLE motivation_history IS
  'Historical snapshots of user motivation archetype changes, enabling evolution timeline visualization';

COMMENT ON TABLE training_analysis_cache IS
  'Pre-computed training metrics aggregated from log_entries for fast motivation detection and archetype scoring';

COMMENT ON FUNCTION record_motivation_snapshot IS
  'Records a new motivation archetype snapshot and updates user profile. Used by motivation detection engine';

COMMENT ON FUNCTION get_archetype_evolution IS
  'Retrieves chronological history of archetype changes for a user, showing motivation evolution over time';
