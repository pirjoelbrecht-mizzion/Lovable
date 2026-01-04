/*
  # Create Sport Contribution Factor Tables

  ## Overview
  Establishes explicit tables for sport classification and load contribution factors.
  Prepares foundation for Phase 2 multi-dimensional training load tracking while
  maintaining backward compatibility with Phase 1 binary classification.

  ## New Tables

  ### 1. `sport_families`
  Central registry of all supported sport types grouped by family.

  **Columns:**
  - `id` (uuid, PK) - Unique identifier
  - `family_name` (text) - Family group (run, walk, cycling, etc.)
  - `sport_type` (text, unique) - Specific sport type from Strava/GPS
  - `display_name` (text) - Human-readable name
  - `icon` (text) - Display icon/emoji
  - `created_at` (timestamptz) - Timestamp

  ### 2. `sport_contribution_factors`
  Multi-dimensional load contribution factors for each sport type.

  **Columns:**
  - `id` (uuid, PK) - Unique identifier
  - `sport_type` (text, FK -> sport_families.sport_type) - Sport type reference
  - `counts_for_running_load` (boolean) - Phase 1: Binary running classification
  - `fatigue_contribution` (numeric) - Phase 2: Fatigue accumulation factor (0.0-1.5)
  - `cardio_contribution` (numeric) - Phase 2: Cardiovascular load factor (0.0-1.5)
  - `neuromuscular_contribution` (numeric) - Phase 2: Neuromuscular load factor (0.0-1.5)
  - `metabolic_contribution` (numeric) - Phase 2: Metabolic load factor (0.0-1.5)
  - `running_specificity` (numeric) - Phase 2: Running-specific adaptation (0.0-1.0)
  - `notes` (text) - Explanation of contribution values
  - `updated_at` (timestamptz) - Last modified timestamp

  ## Contribution Factor Scale
  - 0.0 = No contribution
  - 0.5 = Moderate contribution
  - 1.0 = Full contribution (equivalent to running)
  - >1.0 = Higher demand than standard running (e.g., trail running with steep terrain)

  ## Phase Strategy

  **Phase 1 (Current):**
  - Uses only `counts_for_running_load` boolean
  - Binary classification: runs count, everything else doesn't
  - Zero breaking changes

  **Phase 2 (Future):**
  - Activates multi-dimensional contribution factors
  - Separates fatigue accumulation from performance gains
  - Enables personalized load calibration

  ## Security
  - Enable RLS on both tables
  - Public read access (reference data)
  - Restrict writes to service role only
*/

-- Create sport_families table
CREATE TABLE IF NOT EXISTS sport_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_name text NOT NULL,
  sport_type text UNIQUE NOT NULL,
  display_name text NOT NULL,
  icon text NOT NULL DEFAULT '🏅',
  created_at timestamptz DEFAULT now()
);

-- Create sport_contribution_factors table
CREATE TABLE IF NOT EXISTS sport_contribution_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_type text UNIQUE NOT NULL REFERENCES sport_families(sport_type) ON DELETE CASCADE,

  -- Phase 1: Binary classification (currently active)
  counts_for_running_load boolean NOT NULL DEFAULT false,

  -- Phase 2: Multi-dimensional contribution factors (for future use)
  -- Range 0.0-1.5 allows for activities more demanding than standard running
  fatigue_contribution numeric(3,2) NOT NULL DEFAULT 0.0 CHECK (fatigue_contribution BETWEEN 0.0 AND 1.5),
  cardio_contribution numeric(3,2) NOT NULL DEFAULT 0.0 CHECK (cardio_contribution BETWEEN 0.0 AND 1.5),
  neuromuscular_contribution numeric(3,2) NOT NULL DEFAULT 0.0 CHECK (neuromuscular_contribution BETWEEN 0.0 AND 1.5),
  metabolic_contribution numeric(3,2) NOT NULL DEFAULT 0.0 CHECK (metabolic_contribution BETWEEN 0.0 AND 1.5),
  running_specificity numeric(3,2) NOT NULL DEFAULT 0.0 CHECK (running_specificity BETWEEN 0.0 AND 1.0),

  notes text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE sport_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_contribution_factors ENABLE ROW LEVEL SECURITY;

-- Public read access (reference data)
CREATE POLICY "Anyone can read sport families"
  ON sport_families FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can read contribution factors"
  ON sport_contribution_factors FOR SELECT
  TO authenticated, anon
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sport_families_family_name
  ON sport_families(family_name);

CREATE INDEX IF NOT EXISTS idx_sport_families_sport_type
  ON sport_families(sport_type);

CREATE INDEX IF NOT EXISTS idx_sport_contribution_sport_type
  ON sport_contribution_factors(sport_type);

-- Seed sport_families with current sport type mappings
INSERT INTO sport_families (family_name, sport_type, display_name, icon) VALUES
  -- Run family
  ('run', 'Run', 'Run', '🏃'),
  ('run', 'TrailRun', 'Trail Run', '🏃'),
  ('run', 'VirtualRun', 'Virtual Run', '🏃'),

  -- Walk family
  ('walk', 'Walk', 'Walk', '🚶'),
  ('walk', 'Hike', 'Hike', '🥾'),
  ('walk', 'SpeedWalk', 'Speed Walk', '🚶'),

  -- Cycling family
  ('cycling', 'Ride', 'Ride', '🚴'),
  ('cycling', 'VirtualRide', 'Virtual Ride', '🚴'),
  ('cycling', 'EBikeRide', 'E-Bike Ride', '🚴'),
  ('cycling', 'Handcycle', 'Handcycle', '🚴'),
  ('cycling', 'Velomobile', 'Velomobile', '🚴'),

  -- Fitness family
  ('fitness', 'Workout', 'Workout', '💪'),
  ('fitness', 'WeightTraining', 'Weight Training', '💪'),
  ('fitness', 'Crossfit', 'CrossFit', '💪'),
  ('fitness', 'CircuitTraining', 'Circuit Training', '💪'),
  ('fitness', 'Yoga', 'Yoga', '🧘'),
  ('fitness', 'Pilates', 'Pilates', '🧘'),
  ('fitness', 'StairStepper', 'Stair Stepper', '🪜'),
  ('fitness', 'Elliptical', 'Elliptical', '🏃'),
  ('fitness', 'HighIntensityIntervalTraining', 'HIIT', '💪'),

  -- Water family
  ('water', 'Swim', 'Swim', '🏊'),
  ('water', 'OpenWaterSwim', 'Open Water Swim', '🏊'),
  ('water', 'Surfing', 'Surfing', '🏄'),
  ('water', 'Windsurf', 'Windsurf', '🏄'),
  ('water', 'Kitesurf', 'Kitesurf', '🏄'),
  ('water', 'StandUpPaddling', 'Stand Up Paddling', '🏄'),
  ('water', 'Kayaking', 'Kayaking', '🛶'),
  ('water', 'Canoeing', 'Canoeing', '🛶'),
  ('water', 'Rowing', 'Rowing', '🚣'),
  ('water', 'RowingMachine', 'Rowing Machine', '🚣'),

  -- Winter family
  ('winter', 'AlpineSki', 'Alpine Ski', '⛷️'),
  ('winter', 'BackcountrySki', 'Backcountry Ski', '⛷️'),
  ('winter', 'NordicSki', 'Nordic Ski', '⛷️'),
  ('winter', 'Snowboard', 'Snowboard', '🏂'),
  ('winter', 'Snowshoe', 'Snowshoe', '🥾'),

  -- Other
  ('other', 'InlineSkate', 'Inline Skate', '⛸️'),
  ('other', 'Skateboard', 'Skateboard', '🛹'),
  ('other', 'Wheelchair', 'Wheelchair', '♿')
ON CONFLICT (sport_type) DO NOTHING;

-- Seed sport_contribution_factors with Phase 1 values (binary classification)
-- Phase 2 multi-dimensional factors are populated with research-based estimates
INSERT INTO sport_contribution_factors (
  sport_type,
  counts_for_running_load,
  fatigue_contribution,
  cardio_contribution,
  neuromuscular_contribution,
  metabolic_contribution,
  running_specificity,
  notes
) VALUES
  -- Run family: Full running load contribution
  ('Run', true, 1.00, 1.00, 1.00, 1.00, 1.00, 'Full running activity - counts toward all running metrics'),
  ('TrailRun', true, 1.00, 1.00, 1.10, 1.00, 1.00, 'Trail running - full running load with increased neuromuscular demand'),
  ('VirtualRun', true, 1.00, 1.00, 0.95, 1.00, 1.00, 'Virtual running - full running load with slightly reduced neuromuscular demand'),

  -- Walk family: No running load, but contributes to fatigue
  ('Walk', false, 0.40, 0.50, 0.30, 0.40, 0.20, 'Walking - maintains aerobic base, light fatigue'),
  ('Hike', false, 0.70, 0.60, 0.60, 0.50, 0.30, 'Hiking - moderate fatigue, terrain-dependent neuromuscular load'),
  ('SpeedWalk', false, 0.60, 0.70, 0.50, 0.60, 0.40, 'Speed walking - moderate cardiovascular load'),

  -- Cycling family: Cross-training, no running specificity
  ('Ride', false, 0.50, 0.80, 0.30, 0.70, 0.00, 'Cycling - high cardio, low impact, no running specificity'),
  ('VirtualRide', false, 0.45, 0.75, 0.25, 0.65, 0.00, 'Virtual cycling - similar to outdoor with controlled environment'),
  ('EBikeRide', false, 0.30, 0.50, 0.20, 0.40, 0.00, 'E-bike - reduced effort, light cardiovascular load'),
  ('Handcycle', false, 0.40, 0.70, 0.50, 0.60, 0.00, 'Handcycle - upper body emphasis'),
  ('Velomobile', false, 0.35, 0.60, 0.25, 0.50, 0.00, 'Velomobile - reduced wind resistance, moderate effort'),

  -- Fitness family: Strength and conditioning
  ('Workout', false, 0.30, 0.40, 0.50, 0.50, 0.10, 'General workout - varies by content'),
  ('WeightTraining', false, 0.30, 0.20, 0.80, 0.40, 0.10, 'Weight training - high neuromuscular, low cardio'),
  ('Crossfit', false, 0.50, 0.60, 0.70, 0.70, 0.15, 'CrossFit - mixed cardio and strength'),
  ('CircuitTraining', false, 0.45, 0.70, 0.60, 0.70, 0.15, 'Circuit training - cardiovascular emphasis'),
  ('Yoga', false, 0.15, 0.10, 0.30, 0.20, 0.05, 'Yoga - flexibility and recovery focus'),
  ('Pilates', false, 0.20, 0.15, 0.40, 0.25, 0.10, 'Pilates - core strength, light fatigue'),
  ('StairStepper', false, 0.45, 0.70, 0.50, 0.60, 0.20, 'Stair stepper - leg-focused cardiovascular work'),
  ('Elliptical', false, 0.35, 0.65, 0.40, 0.55, 0.15, 'Elliptical - low-impact cardio'),
  ('HighIntensityIntervalTraining', false, 0.60, 0.80, 0.70, 0.90, 0.15, 'HIIT - high metabolic and cardiovascular demand'),

  -- Water family: Non-weight bearing
  ('Swim', false, 0.40, 0.80, 0.50, 0.70, 0.00, 'Swimming - high cardio, non-weight bearing'),
  ('OpenWaterSwim', false, 0.45, 0.85, 0.55, 0.75, 0.00, 'Open water swimming - increased difficulty'),
  ('Surfing', false, 0.35, 0.60, 0.70, 0.50, 0.00, 'Surfing - explosive neuromuscular with rest periods'),
  ('Windsurf', false, 0.40, 0.65, 0.75, 0.55, 0.00, 'Windsurfing - sustained neuromuscular and cardio'),
  ('Kitesurf', false, 0.40, 0.65, 0.75, 0.55, 0.00, 'Kitesurfing - similar to windsurfing'),
  ('StandUpPaddling', false, 0.30, 0.50, 0.60, 0.40, 0.00, 'SUP - moderate full-body workout'),
  ('Kayaking', false, 0.35, 0.60, 0.65, 0.50, 0.00, 'Kayaking - upper body emphasis'),
  ('Canoeing', false, 0.35, 0.55, 0.60, 0.45, 0.00, 'Canoeing - similar to kayaking'),
  ('Rowing', false, 0.50, 0.85, 0.70, 0.80, 0.00, 'Rowing - high full-body cardio'),
  ('RowingMachine', false, 0.45, 0.80, 0.65, 0.75, 0.00, 'Rowing machine - controlled high-intensity work'),

  -- Winter family: Seasonal sports
  ('AlpineSki', false, 0.50, 0.60, 0.80, 0.60, 0.00, 'Alpine skiing - explosive leg work with rest periods'),
  ('BackcountrySki', false, 0.65, 0.75, 0.85, 0.70, 0.00, 'Backcountry skiing - sustained uphill effort'),
  ('NordicSki', false, 0.60, 0.85, 0.70, 0.80, 0.00, 'Nordic skiing - high cardio, full-body'),
  ('Snowboard', false, 0.45, 0.55, 0.75, 0.55, 0.00, 'Snowboarding - leg emphasis with rest periods'),
  ('Snowshoe', false, 0.55, 0.65, 0.70, 0.60, 0.25, 'Snowshoeing - similar to hiking with increased load'),

  -- Other
  ('InlineSkate', false, 0.45, 0.70, 0.60, 0.65, 0.10, 'Inline skating - similar motion to running'),
  ('Skateboard', false, 0.25, 0.30, 0.60, 0.35, 0.00, 'Skateboarding - explosive with rest periods'),
  ('Wheelchair', false, 0.50, 0.75, 0.70, 0.70, 0.00, 'Wheelchair - upper body cardiovascular work')
ON CONFLICT (sport_type) DO NOTHING;

-- Create function to get contribution factors for a sport type
CREATE OR REPLACE FUNCTION get_sport_contribution_factors(p_sport_type text)
RETURNS TABLE (
  counts_for_running_load boolean,
  fatigue_contribution numeric,
  cardio_contribution numeric,
  neuromuscular_contribution numeric,
  metabolic_contribution numeric,
  running_specificity numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    scf.counts_for_running_load,
    scf.fatigue_contribution,
    scf.cardio_contribution,
    scf.neuromuscular_contribution,
    scf.metabolic_contribution,
    scf.running_specificity
  FROM sport_contribution_factors scf
  WHERE scf.sport_type = p_sport_type;

  -- If no match found, return default (other/unknown sport)
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0.0::numeric, 0.0::numeric, 0.0::numeric, 0.0::numeric, 0.0::numeric;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
