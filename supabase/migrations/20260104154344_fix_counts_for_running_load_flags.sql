/*
  # Fix counts_for_running_load Flags

  1. Problem
    - Some activities were imported with incorrect counts_for_running_load flags
    - Winter sports (BackcountrySki, AlpineSki, NordicSki, Snowboard, Snowshoe) should NOT count
    - Fitness activities (Yoga, WeightTraining, Pilates, etc.) should NOT count
    - Walking/hiking activities should NOT count
    - Cycling, water sports, and other activities should NOT count
    - Only RUN_FAMILY (Run, TrailRun, VirtualRun) should count for running load

  2. Changes
    - Update all log_entries with incorrect counts_for_running_load flags
    - Set counts_for_running_load = false for:
      - Winter sports
      - Fitness activities
      - Walking/hiking
      - Cycling
      - Water sports
      - Other activities
    - Ensure only Run, TrailRun, VirtualRun have counts_for_running_load = true

  3. Impact
    - This fixes data inconsistencies that caused incorrect weekly metrics
    - After this migration, weekly_metrics should be recalculated for affected users
*/

-- Fix winter sports (should NOT count for running load)
UPDATE log_entries
SET counts_for_running_load = false
WHERE sport_type IN ('AlpineSki', 'BackcountrySki', 'NordicSki', 'Snowboard', 'Snowshoe')
  AND counts_for_running_load = true;

-- Fix fitness activities (should NOT count for running load)
UPDATE log_entries
SET counts_for_running_load = false
WHERE sport_type IN ('Workout', 'WeightTraining', 'Crossfit', 'CircuitTraining', 'Yoga', 'Pilates', 'StairStepper', 'Elliptical', 'HighIntensityIntervalTraining')
  AND counts_for_running_load = true;

-- Fix walking/hiking (should NOT count for running load)
UPDATE log_entries
SET counts_for_running_load = false
WHERE sport_type IN ('Walk', 'Hike', 'SpeedWalk')
  AND counts_for_running_load = true;

-- Fix cycling (should NOT count for running load)
UPDATE log_entries
SET counts_for_running_load = false
WHERE sport_type IN ('Ride', 'VirtualRide', 'EBikeRide', 'Handcycle', 'Velomobile', 'InlineSkate', 'Skateboard', 'Wheelchair')
  AND counts_for_running_load = true;

-- Fix water sports (should NOT count for running load)
UPDATE log_entries
SET counts_for_running_load = false
WHERE sport_type IN ('Swim', 'OpenWaterSwim', 'Surfing', 'Windsurf', 'Kitesurf', 'StandUpPaddling', 'Kayaking', 'Canoeing', 'Rowing', 'RowingMachine')
  AND counts_for_running_load = true;

-- Ensure Run family activities ARE counted (defensive - should already be true)
UPDATE log_entries
SET counts_for_running_load = true
WHERE sport_type IN ('Run', 'TrailRun', 'VirtualRun')
  AND counts_for_running_load = false;
