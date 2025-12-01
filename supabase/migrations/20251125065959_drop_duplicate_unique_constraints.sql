/*
  # Drop Duplicate Unique Constraints

  1. Changes
    - Drop the `log_entries_user_date_duration_unique` index
    - Drop the `log_entries_user_id_date_km_key` constraint
    - Keep only `log_entries_external_unique` (user_id, external_id, data_source)
  
  2. Reason
    - Multiple unique constraints cause conflicts during upsert
    - external_id constraint is the most reliable for Strava activities
    - Removes redundant constraints that prevent proper deduplication

  3. Security
    - No RLS changes needed
    - Data integrity maintained through external_id constraint
*/

-- Drop the duration-based unique index
DROP INDEX IF EXISTS log_entries_user_date_duration_unique;

-- Drop the km-based unique constraint
ALTER TABLE log_entries DROP CONSTRAINT IF EXISTS log_entries_user_id_date_km_key;
