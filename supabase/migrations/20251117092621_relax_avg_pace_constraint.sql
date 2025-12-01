/*
  # Relax Average Pace Constraint

  ## Overview
  The current constraint on avg_pace in derived_metrics_weekly is too restrictive,
  rejecting valid slow-paced activities (recovery runs, walking, etc).

  ## Changes
  - Drop the existing avg_pace check constraint that limits pace to < 15 min/km
  - Add a new more permissive constraint allowing pace up to 30 min/km
  - This accommodates recovery runs, walk/run activities, and other slow-paced training

  ## Rationale
  - 15 min/km (~4 km/h) is faster than a typical walking pace
  - Some legitimate training includes very slow recovery or walk breaks
  - 30 min/km (~2 km/h) is slow enough to catch obvious data errors while allowing slow activities
*/

-- Drop the existing constraint
ALTER TABLE derived_metrics_weekly 
DROP CONSTRAINT IF EXISTS derived_metrics_weekly_avg_pace_check;

-- Add a more permissive constraint
ALTER TABLE derived_metrics_weekly 
ADD CONSTRAINT derived_metrics_weekly_avg_pace_check 
CHECK (avg_pace IS NULL OR (avg_pace > 0 AND avg_pace < 30));
