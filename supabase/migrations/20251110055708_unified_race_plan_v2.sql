/*
  # Unified Race Plan Architecture - V2 Schema Evolution

  1. Schema Changes
    - Add `schema_version` (INT) - Track data model versions (v1=flat, v2=unified)
    - Add `scenario_type` (TEXT) - Distinguish 'race', 'whatif', 'training' scenarios
    - Add `race_plan` (JSONB) - Unified structure containing inputs/outputs/context
    - Add `parent_id` (UUID) - Enable version lineage and comparison tracking

  2. Structure
    The `race_plan` JSONB column contains:
    ```
    {
      "race": { id, name, distanceKm, elevationM, surface, terrain, location, dateISO },
      "inputs": {
        "conditions": { temperature, humidity, elevationGain, readiness, surfaceType },
        "nutrition": { fuelingRate, fluidIntake, sodiumIntake },
        "pacing": [{ startKm, endKm, targetPace, targetHR, effort, notes }],
        "overrides": { ... additional physiological parameters }
      },
      "outputs": {
        "predictedTimeMin": number,
        "predictedTimeFormatted": string,
        "avgPace": number,
        "paceFormatted": string,
        "factors": { terrainFactor, elevationFactor, climateFactor, fatiguePenalty, confidence },
        "physiological": { energyFatigueDynamics, hydration, giRisk, performance, timeToExhaustion },
        "performance": { combinedPenalty, performanceFactors[], extended }
      },
      "context": {
        "readiness": { score, category, factors },
        "training": { basePace, baseDistance, fitnessLevel },
        "weather": { temperature, humidity, conditions, windSpeed, impact }
      },
      "ui": {
        "message": string,
        "confidence": "high" | "medium" | "low",
        "tabs": string[]
      },
      "metadata": {
        "pacingStrategyId": uuid,
        "created_at": timestamp,
        "updated_at": timestamp
      }
    }
    ```

  3. Migration Strategy
    - Phased approach: v1 and v2 coexist during transition
    - Legacy columns remain for backward compatibility
    - Lazy migration: convert v1→v2 on read
    - Batch migration available via script

  4. Benefits
    - Unified data model for Race Mode, What-If, and Pacing
    - Versioning enables future schema evolution
    - Parent tracking allows "compare scenarios" feature
    - Eliminates duplication across multiple tables

  5. Security
    - Existing RLS policies apply to new columns
    - No changes to access control model
*/

-- Add new columns to race_simulations table
DO $$
BEGIN
  -- Add schema_version column (default 1 for existing records, 2 for new)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'race_simulations' AND column_name = 'schema_version'
  ) THEN
    ALTER TABLE race_simulations
    ADD COLUMN schema_version INTEGER DEFAULT 1;
  END IF;

  -- Add scenario_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'race_simulations' AND column_name = 'scenario_type'
  ) THEN
    ALTER TABLE race_simulations
    ADD COLUMN scenario_type TEXT DEFAULT 'race' CHECK (scenario_type IN ('race', 'whatif', 'training'));
  END IF;

  -- Add race_plan JSONB column for unified structure
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'race_simulations' AND column_name = 'race_plan'
  ) THEN
    ALTER TABLE race_simulations
    ADD COLUMN race_plan JSONB;
  END IF;

  -- Add parent_id for version lineage tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'race_simulations' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE race_simulations
    ADD COLUMN parent_id UUID REFERENCES race_simulations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_race_simulations_schema_version
  ON race_simulations(schema_version);

CREATE INDEX IF NOT EXISTS idx_race_simulations_scenario_type
  ON race_simulations(scenario_type);

CREATE INDEX IF NOT EXISTS idx_race_simulations_parent_id
  ON race_simulations(parent_id);

CREATE INDEX IF NOT EXISTS idx_race_simulations_race_plan_gin
  ON race_simulations USING gin(race_plan);

-- Create index for efficient filtering of v2 records
CREATE INDEX IF NOT EXISTS idx_race_simulations_v2_active
  ON race_simulations(user_id, scenario_type, created_at DESC)
  WHERE schema_version = 2;

-- Helper function to migrate a single v1 record to v2 format
CREATE OR REPLACE FUNCTION migrate_race_simulation_v1_to_v2(sim_id UUID)
RETURNS JSONB AS $$
DECLARE
  v1_record RECORD;
  v2_plan JSONB;
BEGIN
  -- Fetch the v1 record
  SELECT * INTO v1_record
  FROM race_simulations
  WHERE id = sim_id AND schema_version = 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Build v2 unified structure
  v2_plan := jsonb_build_object(
    'race', jsonb_build_object(
      'id', v1_record.race_id,
      'name', v1_record.race_name,
      'distanceKm', v1_record.race_distance_km,
      'dateISO', v1_record.race_date
    ),
    'inputs', jsonb_build_object(
      'conditions', jsonb_build_object(
        'temperature', COALESCE((v1_record.race_plan->>'temperature')::numeric, 20),
        'humidity', COALESCE((v1_record.race_plan->>'humidity')::numeric, 50),
        'elevationGain', 0,
        'readiness', COALESCE(v1_record.readiness_score, 80),
        'surfaceType', 'road'
      ),
      'nutrition', jsonb_build_object(
        'fuelingRate', 60,
        'fluidIntake', 700,
        'sodiumIntake', 800
      ),
      'pacing', '[]'::jsonb
    ),
    'outputs', jsonb_build_object(
      'predictedTimeMin', v1_record.predicted_time_min,
      'predictedTimeFormatted', '',
      'avgPace', v1_record.avg_pace,
      'paceFormatted', '',
      'factors', jsonb_build_object(
        'terrainFactor', COALESCE(v1_record.terrain_factor, 1.0),
        'elevationFactor', COALESCE(v1_record.elevation_factor, 1.0),
        'climateFactor', COALESCE(v1_record.climate_factor, 1.0),
        'fatiguePenalty', COALESCE(v1_record.fatigue_penalty, 1.0),
        'confidence', COALESCE(v1_record.confidence_score, 0.75)
      ),
      'physiological', '{}'::jsonb,
      'performance', '{}'::jsonb
    ),
    'context', jsonb_build_object(
      'readiness', jsonb_build_object(
        'score', COALESCE(v1_record.readiness_score, 80),
        'category', COALESCE(v1_record.confidence, 'medium')
      ),
      'training', '{}'::jsonb,
      'weather', '{}'::jsonb
    ),
    'ui', jsonb_build_object(
      'message', COALESCE(v1_record.simulation_message, ''),
      'confidence', COALESCE(v1_record.confidence, 'medium'),
      'tabs', '["Conditions", "Nutrition", "Strategy", "Results"]'::jsonb
    ),
    'metadata', jsonb_build_object(
      'created_at', v1_record.created_at,
      'updated_at', v1_record.updated_at
    )
  );

  RETURN v2_plan;
END;
$$ LANGUAGE plpgsql;

-- Function to batch migrate all v1 records to v2
CREATE OR REPLACE FUNCTION migrate_all_v1_to_v2()
RETURNS TABLE(migrated_count INTEGER, error_count INTEGER) AS $$
DECLARE
  total_migrated INTEGER := 0;
  total_errors INTEGER := 0;
  sim_record RECORD;
  v2_data JSONB;
BEGIN
  FOR sim_record IN
    SELECT id FROM race_simulations WHERE schema_version = 1
  LOOP
    BEGIN
      v2_data := migrate_race_simulation_v1_to_v2(sim_record.id);

      IF v2_data IS NOT NULL THEN
        UPDATE race_simulations
        SET
          race_plan = v2_data,
          schema_version = 2,
          updated_at = NOW()
        WHERE id = sim_record.id;

        total_migrated := total_migrated + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      total_errors := total_errors + 1;
      RAISE NOTICE 'Error migrating record %: %', sim_record.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT total_migrated, total_errors;
END;
$$ LANGUAGE plpgsql;

-- View for easy access to v2 unified race plans
CREATE OR REPLACE VIEW race_plans_v2 AS
SELECT
  id,
  user_id,
  scenario_type,
  race_plan,
  parent_id,
  created_at,
  updated_at,
  (race_plan->'race'->>'name') as race_name,
  (race_plan->'race'->>'distanceKm')::numeric as distance_km,
  (race_plan->'outputs'->>'predictedTimeMin')::numeric as predicted_time_min,
  (race_plan->'ui'->>'confidence') as confidence
FROM race_simulations
WHERE schema_version = 2 AND race_plan IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON race_plans_v2 TO authenticated;

-- Add comment explaining the migration
COMMENT ON COLUMN race_simulations.schema_version IS
  'Data model version: 1=legacy flat structure, 2=unified JSONB structure';

COMMENT ON COLUMN race_simulations.scenario_type IS
  'Type of simulation: race=actual race plan, whatif=scenario comparison, training=training plan';

COMMENT ON COLUMN race_simulations.race_plan IS
  'Unified JSONB structure containing inputs, outputs, context, ui, and metadata';

COMMENT ON COLUMN race_simulations.parent_id IS
  'Reference to parent simulation for version tracking and scenario comparison';
