/*
  # Add Pacing Integration to What-If Scenarios

  1. Schema Changes
    - Add pacing columns to whatif_scenarios table
      - `pacing_mode` (TEXT): Pacing strategy mode (manual/auto/none)
      - `pacing_segments` (JSONB): Array of pacing segments with distance, pace, HR, notes

  2. Purpose
    - Unifies pacing strategy with what-if simulation scenarios
    - Eliminates need for separate pacing_strategies table lookups
    - Enables comprehensive race planning in single unified model
    - Supports real-time simulation updates when pacing changes

  3. Pacing Segment Structure
    Each segment in pacing_segments array contains:
    - distanceKm: cumulative distance at segment end
    - targetPace: pace in min/km
    - targetHR: optional heart rate target
    - notes: optional segment notes

  4. Backwards Compatibility
    - All new columns are nullable
    - Existing scenarios work without pacing data
    - Default mode is 'none' when pacing not specified
    - Application handles migration from old pacing_strategies table

  5. Integration Notes
    - Pacing segments feed into physiological simulation engine
    - Energy/fatigue curves adjust based on segment-level intensity
    - Strategy tab can edit pacing inline with live chart updates
    - No RLS changes needed (inherits from existing table policies)
*/

-- Add pacing mode column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatif_scenarios' AND column_name = 'pacing_mode'
  ) THEN
    ALTER TABLE whatif_scenarios
    ADD COLUMN pacing_mode TEXT DEFAULT 'none' CHECK (pacing_mode IN ('manual', 'auto', 'none'));
  END IF;
END $$;

-- Add pacing segments JSONB column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatif_scenarios' AND column_name = 'pacing_segments'
  ) THEN
    ALTER TABLE whatif_scenarios
    ADD COLUMN pacing_segments JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_whatif_scenarios_pacing_segments
ON whatif_scenarios USING gin(pacing_segments)
WHERE pacing_segments IS NOT NULL AND pacing_segments != '[]'::jsonb;

-- Add helpful comments
COMMENT ON COLUMN whatif_scenarios.pacing_mode IS 'Pacing strategy mode: manual (user-defined), auto (generated), or none';
COMMENT ON COLUMN whatif_scenarios.pacing_segments IS 'Array of pacing segments [{distanceKm, targetPace, targetHR?, notes?}]';

-- Create helper function to validate pacing segments
CREATE OR REPLACE FUNCTION validate_pacing_segments(segments JSONB, race_distance NUMERIC)
RETURNS BOOLEAN AS $$
DECLARE
  segment JSONB;
  prev_distance NUMERIC := 0;
  last_distance NUMERIC;
BEGIN
  -- Empty segments are valid
  IF segments IS NULL OR jsonb_array_length(segments) = 0 THEN
    RETURN TRUE;
  END IF;

  -- Validate each segment
  FOR segment IN SELECT * FROM jsonb_array_elements(segments)
  LOOP
    -- Check required fields exist
    IF NOT (segment ? 'distanceKm' AND segment ? 'targetPace') THEN
      RETURN FALSE;
    END IF;

    -- Check distance is sequential
    IF (segment->>'distanceKm')::NUMERIC <= prev_distance THEN
      RETURN FALSE;
    END IF;

    -- Check distance doesn't exceed race distance
    IF (segment->>'distanceKm')::NUMERIC > race_distance THEN
      RETURN FALSE;
    END IF;

    -- Check pace is within valid range (3:00 to 15:00 min/km)
    IF (segment->>'targetPace')::NUMERIC < 3.0 OR (segment->>'targetPace')::NUMERIC > 15.0 THEN
      RETURN FALSE;
    END IF;

    -- Check heart rate if provided
    IF segment ? 'targetHR' THEN
      IF (segment->>'targetHR')::INTEGER < 100 OR (segment->>'targetHR')::INTEGER > 220 THEN
        RETURN FALSE;
      END IF;
    END IF;

    prev_distance := (segment->>'distanceKm')::NUMERIC;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_pacing_segments IS 'Validates pacing segments array structure and values';
