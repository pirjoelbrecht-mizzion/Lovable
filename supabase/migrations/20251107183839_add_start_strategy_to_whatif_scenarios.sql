/*
  # Add Starting Strategy to What-If Scenarios

  1. Schema Changes
    - Add `start_strategy` column to whatif_scenarios table
    - Stores pacing strategy choice: conservative, target, or aggressive
    - Allows null for backwards compatibility with existing scenarios

  2. Details
    - Column type: TEXT with constraint
    - Valid values: 'conservative', 'target', 'aggressive'
    - Default: NULL (falls back to 'target' in application logic)
    - No RLS changes needed (inherits from table policies)

  3. Purpose
    - Enables storage of starting pace strategy as part of scenario parameters
    - Supports race simulation with different pacing approaches
    - Allows comparison of conservative vs aggressive starts under same conditions
*/

-- Add start_strategy column to whatif_scenarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatif_scenarios' AND column_name = 'start_strategy'
  ) THEN
    ALTER TABLE whatif_scenarios
    ADD COLUMN start_strategy TEXT CHECK (start_strategy IN ('conservative', 'target', 'aggressive'));
  END IF;
END $$;

-- Create index for querying by strategy
CREATE INDEX IF NOT EXISTS idx_whatif_scenarios_start_strategy ON whatif_scenarios(start_strategy)
WHERE start_strategy IS NOT NULL;
