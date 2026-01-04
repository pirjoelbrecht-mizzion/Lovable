/*
  # Multi-Sport Contribution Factor Constraints & Views

  1. Data Cleanup
    - Clamps any out-of-range contribution factors to [0.0, 1.0]
    - Ensures existing data meets constraint requirements

  2. Constraints
    - Validates that all contribution factors are between 0.0 and 1.0
    - Ensures data integrity at database level
    - Prevents invalid factor values from being inserted

  3. Views
    - `v_active_sport_factors`: Read-only view that respects phase_2_enabled flag
    - Returns Phase 1 binary values when Phase 2 is disabled
    - Automatically switches to weighted values when Phase 2 is enabled

  4. Functions
    - Helper function to get current phase_2_enabled state
    - Used by view to determine which values to return

  5. Notes
    - Phase 1 pattern: counts_for_running_load=true, fatigue=1.0 for cardio activities
    - Phase 2 pattern: weighted factors based on actual database values
*/

-- First, clamp any out-of-range values
UPDATE sport_contribution_factors
SET 
  fatigue_contribution = LEAST(GREATEST(fatigue_contribution, 0.0), 1.0),
  cardio_contribution = LEAST(GREATEST(cardio_contribution, 0.0), 1.0),
  neuromuscular_contribution = LEAST(GREATEST(neuromuscular_contribution, 0.0), 1.0),
  metabolic_contribution = LEAST(GREATEST(metabolic_contribution, 0.0), 1.0),
  running_specificity = LEAST(GREATEST(running_specificity, 0.0), 1.0)
WHERE 
  fatigue_contribution < 0.0 OR fatigue_contribution > 1.0
  OR cardio_contribution < 0.0 OR cardio_contribution > 1.0
  OR neuromuscular_contribution < 0.0 OR neuromuscular_contribution > 1.0
  OR metabolic_contribution < 0.0 OR metabolic_contribution > 1.0
  OR running_specificity < 0.0 OR running_specificity > 1.0;

-- Add CHECK constraints to validate contribution factor ranges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sport_contribution_factors_fatigue_range'
  ) THEN
    ALTER TABLE sport_contribution_factors
      ADD CONSTRAINT sport_contribution_factors_fatigue_range
      CHECK (fatigue_contribution >= 0.0 AND fatigue_contribution <= 1.0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sport_contribution_factors_cardio_range'
  ) THEN
    ALTER TABLE sport_contribution_factors
      ADD CONSTRAINT sport_contribution_factors_cardio_range
      CHECK (cardio_contribution >= 0.0 AND cardio_contribution <= 1.0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sport_contribution_factors_neuromuscular_range'
  ) THEN
    ALTER TABLE sport_contribution_factors
      ADD CONSTRAINT sport_contribution_factors_neuromuscular_range
      CHECK (neuromuscular_contribution >= 0.0 AND neuromuscular_contribution <= 1.0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sport_contribution_factors_metabolic_range'
  ) THEN
    ALTER TABLE sport_contribution_factors
      ADD CONSTRAINT sport_contribution_factors_metabolic_range
      CHECK (metabolic_contribution >= 0.0 AND metabolic_contribution <= 1.0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sport_contribution_factors_specificity_range'
  ) THEN
    ALTER TABLE sport_contribution_factors
      ADD CONSTRAINT sport_contribution_factors_specificity_range
      CHECK (running_specificity >= 0.0 AND running_specificity <= 1.0);
  END IF;
END $$;

-- Function to check if Phase 2 is enabled
CREATE OR REPLACE FUNCTION is_phase_2_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT (config_value)::boolean 
     FROM system_config 
     WHERE config_key = 'phase_2_enabled'),
    false
  );
$$;

-- Read-only view that respects phase_2_enabled flag
CREATE OR REPLACE VIEW v_active_sport_factors AS
SELECT 
  sport_type,
  counts_for_running_load,
  CASE 
    WHEN is_phase_2_enabled() THEN fatigue_contribution
    WHEN counts_for_running_load THEN 1.0
    ELSE 0.0
  END as fatigue_contribution,
  CASE 
    WHEN is_phase_2_enabled() THEN cardio_contribution
    WHEN counts_for_running_load THEN 1.0
    ELSE 0.0
  END as cardio_contribution,
  CASE 
    WHEN is_phase_2_enabled() THEN neuromuscular_contribution
    ELSE 0.0
  END as neuromuscular_contribution,
  CASE 
    WHEN is_phase_2_enabled() THEN metabolic_contribution
    ELSE 0.0
  END as metabolic_contribution,
  CASE 
    WHEN is_phase_2_enabled() THEN running_specificity
    WHEN counts_for_running_load THEN 1.0
    ELSE 0.0
  END as running_specificity,
  is_phase_2_enabled() as phase_2_active,
  notes
FROM sport_contribution_factors;

-- Grant access to the view
GRANT SELECT ON v_active_sport_factors TO authenticated;

-- Add helpful comment
COMMENT ON VIEW v_active_sport_factors IS 
'Read-only view that returns Phase 1 binary values when phase_2_enabled=false, or actual weighted values when phase_2_enabled=true. Use this view instead of querying sport_contribution_factors directly to ensure governance compliance.';