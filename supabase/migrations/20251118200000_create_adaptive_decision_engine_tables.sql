/*
  # Adaptive Decision Engine (ADE) - Database Schema

  1. New Tables
    - `athlete_intelligence_profile`
      - Unified athlete learning state profile
      - Single source of truth for all learning systems
      - Contains classification, ACWR, climate, motivation, terrain, race data

    - `adaptive_decisions`
      - Logs every decision made by the ADE
      - Stores original plan, modified plan, reasoning, and confidence
      - Tracks which adjustment layers were applied

    - `adjustment_layers`
      - Detailed log of each adjustment layer per decision
      - Stores changes, reasoning, priority, safety overrides
      - Links to parent adaptive_decisions record

  2. Security
    - Enable RLS on all tables
    - Users can only read/write their own data
    - Authenticated users only

  3. Important Notes
    - This is Module 4 implementation - the "brain" of the adaptive coach
    - Integrates ALL existing learning systems into one unified intelligence
    - Provides complete transparency and auditability of AI decisions
*/

-- =====================================================================
-- TABLE 1: Athlete Intelligence Profile (Unified Learning State)
-- =====================================================================

CREATE TABLE IF NOT EXISTS athlete_intelligence_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile data (JSONB for flexibility)
  profile_data jsonb NOT NULL,

  -- Metadata
  completeness_score integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  -- Ensure one profile per user
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_aip_user_id ON athlete_intelligence_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_aip_completeness ON athlete_intelligence_profile(completeness_score);

-- RLS Policies
ALTER TABLE athlete_intelligence_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intelligence profile"
  ON athlete_intelligence_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intelligence profile"
  ON athlete_intelligence_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intelligence profile"
  ON athlete_intelligence_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- TABLE 2: Adaptive Decisions Log
-- =====================================================================

CREATE TABLE IF NOT EXISTS adaptive_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan data
  original_plan jsonb NOT NULL,
  modified_plan jsonb NOT NULL,

  -- Decision metadata
  confidence numeric(3, 2) DEFAULT 0.80 CHECK (confidence >= 0 AND confidence <= 1),
  applied_at timestamptz DEFAULT now(),

  -- Context snapshot
  context_snapshot jsonb,

  -- Reasoning
  final_reasoning text[],
  safety_flags text[],
  warnings text[],

  -- Timestamps
  created_at timestamptz DEFAULT now(),

  -- Index for queries
  week_start_date date
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_user_id ON adaptive_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_applied_at ON adaptive_decisions(applied_at);
CREATE INDEX IF NOT EXISTS idx_ad_week_start ON adaptive_decisions(week_start_date);
CREATE INDEX IF NOT EXISTS idx_ad_confidence ON adaptive_decisions(confidence);

-- RLS Policies
ALTER TABLE adaptive_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own adaptive decisions"
  ON adaptive_decisions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own adaptive decisions"
  ON adaptive_decisions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- TABLE 3: Adjustment Layers (Detailed Changes)
-- =====================================================================

CREATE TABLE IF NOT EXISTS adjustment_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES adaptive_decisions(id) ON DELETE CASCADE,

  -- Layer identification
  layer_name text NOT NULL,
  layer_priority integer DEFAULT 1,
  applied boolean DEFAULT false,
  safety_override boolean DEFAULT false,

  -- Reasoning
  reasoning text,

  -- Changes (JSONB array of modifications)
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_al_decision_id ON adjustment_layers(decision_id);
CREATE INDEX IF NOT EXISTS idx_al_layer_name ON adjustment_layers(layer_name);
CREATE INDEX IF NOT EXISTS idx_al_applied ON adjustment_layers(applied);
CREATE INDEX IF NOT EXISTS idx_al_safety_override ON adjustment_layers(safety_override);

-- RLS Policies
ALTER TABLE adjustment_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own adjustment layers"
  ON adjustment_layers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM adaptive_decisions
      WHERE adaptive_decisions.id = adjustment_layers.decision_id
      AND adaptive_decisions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own adjustment layers"
  ON adjustment_layers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM adaptive_decisions
      WHERE adaptive_decisions.id = adjustment_layers.decision_id
      AND adaptive_decisions.user_id = auth.uid()
    )
  );

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function to get latest adaptive decision for user
CREATE OR REPLACE FUNCTION get_latest_adaptive_decision(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT
    jsonb_build_object(
      'id', ad.id,
      'confidence', ad.confidence,
      'applied_at', ad.applied_at,
      'final_reasoning', ad.final_reasoning,
      'safety_flags', ad.safety_flags,
      'warnings', ad.warnings,
      'layers', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', al.layer_name,
            'applied', al.applied,
            'reasoning', al.reasoning,
            'changes', al.changes,
            'priority', al.layer_priority,
            'safety_override', al.safety_override
          )
        )
        FROM adjustment_layers al
        WHERE al.decision_id = ad.id
      )
    ) INTO result
  FROM adaptive_decisions ad
  WHERE ad.user_id = p_user_id
  ORDER BY ad.applied_at DESC
  LIMIT 1;

  RETURN result;
END;
$$;

-- Function to get adaptive decision history
CREATE OR REPLACE FUNCTION get_adaptive_decision_history(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  confidence numeric,
  applied_at timestamptz,
  final_reasoning text[],
  safety_flags text[],
  warnings text[],
  layer_count bigint,
  safety_override_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ad.id,
    ad.confidence,
    ad.applied_at,
    ad.final_reasoning,
    ad.safety_flags,
    ad.warnings,
    COUNT(al.id) as layer_count,
    COUNT(al.id) FILTER (WHERE al.safety_override = true) as safety_override_count
  FROM adaptive_decisions ad
  LEFT JOIN adjustment_layers al ON al.decision_id = ad.id
  WHERE ad.user_id = p_user_id
  GROUP BY ad.id, ad.confidence, ad.applied_at, ad.final_reasoning, ad.safety_flags, ad.warnings
  ORDER BY ad.applied_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to count safety overrides in last N days
CREATE OR REPLACE FUNCTION count_recent_safety_overrides(
  p_user_id uuid,
  p_days integer DEFAULT 14
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  override_count integer;
BEGIN
  SELECT COUNT(DISTINCT ad.id) INTO override_count
  FROM adaptive_decisions ad
  INNER JOIN adjustment_layers al ON al.decision_id = ad.id
  WHERE ad.user_id = p_user_id
    AND al.safety_override = true
    AND ad.applied_at >= (now() - (p_days || ' days')::interval);

  RETURN COALESCE(override_count, 0);
END;
$$;
