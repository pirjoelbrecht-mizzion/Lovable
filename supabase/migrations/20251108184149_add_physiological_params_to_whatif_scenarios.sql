/*
  # Add Physiological Parameters to What-If Scenarios

  1. Schema Changes
    - Add physiological input columns to whatif_scenarios table
      - `fueling_rate` (REAL): Carbohydrate intake in grams per hour
      - `fluid_intake` (REAL): Fluid consumption in milliliters per hour
      - `sodium_intake` (REAL): Sodium consumption in milligrams per hour
    - Add computed result columns
      - `hydration_pct` (REAL): Calculated hydration percentage at finish
      - `gi_risk_pct` (REAL): GI distress risk percentage
      - `performance_penalty_pct` (REAL): Overall performance penalty percentage

  2. Purpose
    - Unifies race conditions and physiological parameters in single scenario
    - Enables comprehensive scenario saving including nutrition strategy
    - Stores both input parameters and computed results for quick comparison
    - Supports integrated What-If simulation combining all factors

  3. Backwards Compatibility
    - All new columns are nullable with sensible defaults
    - Existing scenarios remain valid
    - Application provides default values when loading old scenarios

  4. Notes
    - Default values align with DEFAULT_PHYSIOLOGICAL_INPUTS from types/physiology.ts
    - Computed results are stored for historical comparison even if simulation logic changes
    - No RLS changes needed (inherits from existing table policies)
*/

-- Add physiological input columns
DO $$
BEGIN
  -- Fueling rate (g carbs/hr)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatif_scenarios' AND column_name = 'fueling_rate'
  ) THEN
    ALTER TABLE whatif_scenarios
    ADD COLUMN fueling_rate REAL DEFAULT 60 CHECK (fueling_rate >= 0 AND fueling_rate <= 120);
  END IF;

  -- Fluid intake (ml/hr)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatif_scenarios' AND column_name = 'fluid_intake'
  ) THEN
    ALTER TABLE whatif_scenarios
    ADD COLUMN fluid_intake REAL DEFAULT 600 CHECK (fluid_intake >= 0 AND fluid_intake <= 1200);
  END IF;

  -- Sodium intake (mg/hr)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatif_scenarios' AND column_name = 'sodium_intake'
  ) THEN
    ALTER TABLE whatif_scenarios
    ADD COLUMN sodium_intake REAL DEFAULT 800 CHECK (sodium_intake >= 0 AND sodium_intake <= 1500);
  END IF;

  -- Hydration percentage result
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatif_scenarios' AND column_name = 'hydration_pct'
  ) THEN
    ALTER TABLE whatif_scenarios
    ADD COLUMN hydration_pct REAL CHECK (hydration_pct >= 0 AND hydration_pct <= 100);
  END IF;

  -- GI risk percentage result
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatif_scenarios' AND column_name = 'gi_risk_pct'
  ) THEN
    ALTER TABLE whatif_scenarios
    ADD COLUMN gi_risk_pct REAL CHECK (gi_risk_pct >= 0 AND gi_risk_pct <= 100);
  END IF;

  -- Performance penalty percentage result
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatif_scenarios' AND column_name = 'performance_penalty_pct'
  ) THEN
    ALTER TABLE whatif_scenarios
    ADD COLUMN performance_penalty_pct REAL CHECK (performance_penalty_pct >= 0);
  END IF;
END $$;

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_whatif_scenarios_fueling ON whatif_scenarios(fueling_rate)
WHERE fueling_rate IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatif_scenarios_gi_risk ON whatif_scenarios(gi_risk_pct)
WHERE gi_risk_pct IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN whatif_scenarios.fueling_rate IS 'Carbohydrate intake rate in grams per hour (0-120)';
COMMENT ON COLUMN whatif_scenarios.fluid_intake IS 'Fluid intake rate in milliliters per hour (0-1200)';
COMMENT ON COLUMN whatif_scenarios.sodium_intake IS 'Sodium intake in milligrams per hour (0-1500)';
COMMENT ON COLUMN whatif_scenarios.hydration_pct IS 'Calculated hydration percentage at race finish';
COMMENT ON COLUMN whatif_scenarios.gi_risk_pct IS 'GI distress risk percentage (0-100)';
COMMENT ON COLUMN whatif_scenarios.performance_penalty_pct IS 'Overall performance penalty as percentage';