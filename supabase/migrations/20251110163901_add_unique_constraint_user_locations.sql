/*
  # Add unique constraint to prevent duplicate locations

  1. Changes
    - Add unique constraint on user_id + location_label + start_date + end_date
    - Prevents duplicate travel locations from being created
  
  2. Notes
    - This allows same location with different dates
    - This allows same dates at different locations
    - Only prevents exact duplicates
*/

-- Add unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS user_locations_unique_travel_idx 
ON user_locations (user_id, location_label, start_date, end_date) 
WHERE location_source = 'travel_calendar';
