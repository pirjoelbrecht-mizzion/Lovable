/*
  # Phase 2 Canary Sport Type

  1. Purpose
    - Creates a test sport type with Phase 2 weighted contribution factors
    - Used for testing Phase 2 activation in staging environments
    - Verifies that governance system correctly switches between Phase 1 and Phase 2
    
  2. Canary Sport Type
    - `CanaryTestSport`: A test sport type with distinctive Phase 2 factors
    - Factors chosen to be easily distinguishable from Phase 1 binary values
    - Should never appear in production data from real activities
    
  3. Testing Strategy
    - With Phase 2 disabled: Should return Phase 1 binary values (0.0 or 1.0)
    - With Phase 2 enabled: Should return actual weighted values (0.42, 0.73, etc.)
    - Confirms view and governance system work correctly before rolling out
*/

-- First, add to sport_families table
INSERT INTO sport_families (
  family_name,
  sport_type,
  display_name,
  icon
)
VALUES (
  'test',
  'CanaryTestSport',
  'Canary Test Sport',
  '🐤'
)
ON CONFLICT (sport_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon;

-- Then add canary sport type with distinctive Phase 2 factors
INSERT INTO sport_contribution_factors (
  sport_type,
  counts_for_running_load,
  fatigue_contribution,
  cardio_contribution,
  neuromuscular_contribution,
  metabolic_contribution,
  running_specificity,
  notes
)
VALUES (
  'CanaryTestSport',
  false,
  0.42,
  0.73,
  0.58,
  0.65,
  0.31,
  'Canary sport type for testing Phase 2 activation. Distinctive values make it easy to verify governance system behavior. Should never appear in real activity data.'
)
ON CONFLICT (sport_type) DO UPDATE SET
  fatigue_contribution = 0.42,
  cardio_contribution = 0.73,
  neuromuscular_contribution = 0.58,
  metabolic_contribution = 0.65,
  running_specificity = 0.31,
  notes = EXCLUDED.notes;

-- Verification query to test canary behavior
-- To use this, run these queries manually:
--
-- TEST 1: Verify Phase 1 behavior (should return 0.0 for all factors)
-- UPDATE system_config SET config_value = 'false'::jsonb WHERE config_key = 'phase_2_enabled';
-- SELECT sport_type, fatigue_contribution, cardio_contribution, phase_2_active
-- FROM v_active_sport_factors
-- WHERE sport_type = 'CanaryTestSport';
--
-- EXPECTED: fatigue_contribution = 0.0, cardio_contribution = 0.0, phase_2_active = false
--
-- TEST 2: Verify Phase 2 behavior (should return actual weighted values)
-- UPDATE system_config SET config_value = 'true'::jsonb WHERE config_key = 'phase_2_enabled';
-- SELECT sport_type, fatigue_contribution, cardio_contribution, phase_2_active
-- FROM v_active_sport_factors
-- WHERE sport_type = 'CanaryTestSport';
--
-- EXPECTED: fatigue_contribution = 0.42, cardio_contribution = 0.73, phase_2_active = true
--
-- TEST 3: Reset to Phase 1 after testing
-- UPDATE system_config SET config_value = 'false'::jsonb WHERE config_key = 'phase_2_enabled';