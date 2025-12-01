/*
  # Deduplicate race locations and add unique constraint

  1. Changes
    - Remove duplicate race location entries
    - Add unique constraint to prevent duplicate location entries
  
  2. Purpose
    - Fix duplicate race locations in Unity
    - Prevent future duplicates from being created
*/

-- Delete duplicate race locations, keeping only the oldest one
DELETE FROM user_locations
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, location_label, start_date, end_date, location_source
             ORDER BY created_at ASC
           ) as row_num
    FROM user_locations
  ) t
  WHERE t.row_num > 1
);

-- Add unique constraint to prevent duplicates
-- This ensures one unique location per user, label, dates, and source
CREATE UNIQUE INDEX IF NOT EXISTS user_locations_unique_entry
ON user_locations(user_id, location_label, COALESCE(start_date, '1970-01-01'::date), COALESCE(end_date, '1970-01-01'::date), location_source);
