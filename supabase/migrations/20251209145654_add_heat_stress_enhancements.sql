/*
  # Heat Stress Analysis Enhancements

  1. Schema Updates
    - Add `heat_stress_timeline` JSONB column to race_heat_stress_metrics
      - Stores array of {km: number, heatStress: number} for chart visualization
    - Add `personalization_factors_used` JSONB column to race_heat_stress_metrics
      - Documents which athlete data informed the analysis
    - Add `recommendation_categories` JSONB column to race_heat_ai_insights
      - Stores categorized recommendations (hydration, pacing, cooling, clothing, acclimation)
    - Add `event_icon_types` TEXT array to race_heat_ai_insights
      - Maps events to visual icons for frontend rendering
    
  2. Athlete Profile Enhancements
    - Add `heat_acclimation_index` numeric column to user_profiles
      - Score 0-100 representing athlete's heat adaptation level
    - Add `body_weight_kg` numeric column to user_profiles
      - Used for personalized hydration and pacing recommendations
    
  3. Indexes
    - GIN index on heat_stress_timeline for efficient JSONB queries
    - Index on heat_acclimation_index for filtering athletes by adaptation level
*/

-- Enhance race_heat_stress_metrics with timeline and personalization data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'race_heat_stress_metrics' AND column_name = 'heat_stress_timeline'
  ) THEN
    ALTER TABLE race_heat_stress_metrics ADD COLUMN heat_stress_timeline jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'race_heat_stress_metrics' AND column_name = 'personalization_factors_used'
  ) THEN
    ALTER TABLE race_heat_stress_metrics ADD COLUMN personalization_factors_used jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Enhance race_heat_ai_insights with categorized recommendations and event icons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'race_heat_ai_insights' AND column_name = 'recommendation_categories'
  ) THEN
    ALTER TABLE race_heat_ai_insights ADD COLUMN recommendation_categories jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'race_heat_ai_insights' AND column_name = 'event_icon_types'
  ) THEN
    ALTER TABLE race_heat_ai_insights ADD COLUMN event_icon_types text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Add heat acclimation index to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'heat_acclimation_index'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN heat_acclimation_index real DEFAULT 50 CHECK (heat_acclimation_index >= 0 AND heat_acclimation_index <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'body_weight_kg'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN body_weight_kg real CHECK (body_weight_kg > 0 AND body_weight_kg < 300);
  END IF;
END $$;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_race_heat_stress_metrics_timeline
  ON race_heat_stress_metrics USING GIN (heat_stress_timeline);

CREATE INDEX IF NOT EXISTS idx_user_profiles_heat_acclimation
  ON user_profiles(heat_acclimation_index)
  WHERE heat_acclimation_index IS NOT NULL;
