/*
  # Backfill Sport Type Data Normalization

  ## Purpose
  Normalizes sport_type data for old activities that only have the legacy `type` column.
  This ensures all activities have proper sport_type values for consistent classification.

  ## Changes
  1. Backfill `sport_type` from `type` column for activities with NULL sport_type
  2. Add index on sport_type for efficient filtering and queries
  3. Update `counts_for_running_load` based on sport classification

  ## Data Impact
  - **Before**: Activities with sport_type = NULL, type = 'run' (or other values)
  - **After**: Activities with sport_type = 'Run' (or proper mapped value)

  ## Safety
  - Uses UPDATE WHERE sport_type IS NULL to only affect old records
  - Idempotent - can be run multiple times safely
  - No data loss - preserves all existing data
*/

-- Step 1: Backfill sport_type from type column
-- Maps legacy type values to proper sport_type values
UPDATE log_entries
SET sport_type = CASE
  -- Map common legacy values to proper sport types
  WHEN lower(type) = 'run' THEN 'Run'
  WHEN lower(type) IN ('trail', 'trail run', 'trailrun') THEN 'TrailRun'
  WHEN lower(type) IN ('virtual run', 'virtualrun') THEN 'VirtualRun'
  WHEN lower(type) = 'walk' THEN 'Walk'
  WHEN lower(type) = 'hike' THEN 'Hike'
  WHEN lower(type) IN ('ride', 'bike', 'cycling') THEN 'Ride'
  WHEN lower(type) IN ('virtual ride', 'virtualride') THEN 'VirtualRide'
  WHEN lower(type) IN ('swim', 'swimming') THEN 'Swim'
  WHEN lower(type) = 'workout' THEN 'Workout'
  WHEN lower(type) IN ('weight training', 'weights', 'strength') THEN 'WeightTraining'
  WHEN lower(type) = 'yoga' THEN 'Yoga'
  WHEN lower(type) = 'elliptical' THEN 'Elliptical'
  -- Default fallback for unrecognized types
  ELSE 'Run'
END
WHERE sport_type IS NULL
  AND type IS NOT NULL;

-- Step 2: For any remaining NULL sport_type values, set to 'Run' as safe default
UPDATE log_entries
SET sport_type = 'Run'
WHERE sport_type IS NULL;

-- Step 3: Create index on sport_type for efficient queries
CREATE INDEX IF NOT EXISTS idx_log_entries_sport_type
  ON log_entries(user_id, sport_type, date);

-- Step 4: Create composite index for sport-based filtering with running load flag
CREATE INDEX IF NOT EXISTS idx_log_entries_sport_counts_date
  ON log_entries(user_id, counts_for_running_load, sport_type, date)
  WHERE counts_for_running_load IS NOT NULL;

-- Step 5: Update internal_sport_category based on sport_type
-- This ensures consistency with the sport_families table
UPDATE log_entries
SET internal_sport_category = CASE
  -- Run family
  WHEN sport_type IN ('Run', 'TrailRun', 'VirtualRun') THEN 'run'
  -- Walk family
  WHEN sport_type IN ('Walk', 'Hike', 'SpeedWalk') THEN 'walk'
  -- Cycling family
  WHEN sport_type IN ('Ride', 'VirtualRide', 'EBikeRide', 'Handcycle', 'Velomobile') THEN 'cross_train'
  -- Fitness family
  WHEN sport_type IN ('Workout', 'WeightTraining', 'Crossfit', 'CircuitTraining', 
                       'Yoga', 'Pilates', 'StairStepper', 'Elliptical', 
                       'HighIntensityIntervalTraining') THEN 'strength'
  -- Water family
  WHEN sport_type IN ('Swim', 'OpenWaterSwim', 'Surfing', 'Windsurf', 'Kitesurf',
                       'StandUpPaddling', 'Kayaking', 'Canoeing', 'Rowing', 
                       'RowingMachine') THEN 'water'
  -- Winter family
  WHEN sport_type IN ('AlpineSki', 'BackcountrySki', 'NordicSki', 'Snowboard', 
                       'Snowshoe') THEN 'winter'
  -- Other
  WHEN sport_type IN ('InlineSkate', 'Skateboard', 'Wheelchair') THEN 'other'
  -- Default
  ELSE 'other'
END
WHERE internal_sport_category IS NULL
   OR internal_sport_category = 'run';  -- Update old 'run' defaults

-- Step 6: Update counts_for_running_load based on sport_type
-- Only running activities should count toward running load
UPDATE log_entries
SET counts_for_running_load = (sport_type IN ('Run', 'TrailRun', 'VirtualRun'))
WHERE counts_for_running_load IS NULL
   OR counts_for_running_load = true;  -- Recalculate for activities previously marked as true
