/*
  # Fix Log Entries Duplicate Data Issue

  ## Problem
  Activities with incorrect distance values (e.g., 3.9 km vs 3864 km) are being stored as separate entries
  because the unique constraint uses `user_id,date,km` which treats different km values as different activities.

  ## Changes
  1. **Data Cleanup**
     - Identify and remove duplicate entries where the same activity exists with vastly different km values
     - Keep entries with reasonable km values (< 100) and remove suspicious ones (> 100)
     - For duplicates with same date and duration, keep the one with smaller km value

  2. **Update Unique Constraint**
     - Drop old unique index on `(user_id, date, km)`
     - Create new unique index on `(user_id, date, duration_min)`
     - This prevents storing the same run twice with different distances due to unit conversion bugs

  3. **Add Data Validation**
     - Add check constraint to prevent obviously incorrect km values (> 500)

  ## Security
  - No RLS policy changes needed (already enabled)
  - Maintains existing user_id foreign key relationship
*/

-- Step 1: Clean up duplicate entries with incorrect distances
-- Find and delete entries where same user/date/duration exists with km > 100 when a km < 100 version exists
DO $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  WITH duplicates AS (
    SELECT 
      id,
      user_id,
      date,
      duration_min,
      km,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, date, COALESCE(duration_min, 0) 
        ORDER BY 
          CASE WHEN km > 100 THEN 1 ELSE 0 END,
          km ASC
      ) as rn
    FROM log_entries
    WHERE duration_min IS NOT NULL
  )
  DELETE FROM log_entries
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % duplicate log entries with incorrect distances', deleted_count;
END $$;

-- Step 2: Drop old unique index if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'log_entries' 
    AND indexname = 'log_entries_user_date_km_unique'
  ) THEN
    DROP INDEX IF EXISTS log_entries_user_date_km_unique;
    RAISE NOTICE 'Dropped old unique index on (user_id, date, km)';
  END IF;
END $$;

-- Step 3: Create new unique index on (user_id, date, duration_min)
-- This prevents the same run from being stored twice with different distances
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'log_entries' 
    AND indexname = 'log_entries_user_date_duration_unique'
  ) THEN
    CREATE UNIQUE INDEX log_entries_user_date_duration_unique 
    ON log_entries(user_id, date, COALESCE(duration_min, 0));
    RAISE NOTICE 'Created new unique index on (user_id, date, duration_min)';
  END IF;
END $$;

-- Step 4: Add check constraint to prevent obviously incorrect km values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'log_entries_km_reasonable'
  ) THEN
    ALTER TABLE log_entries 
    ADD CONSTRAINT log_entries_km_reasonable 
    CHECK (km >= 0 AND km <= 500);
    RAISE NOTICE 'Added check constraint for reasonable km values';
  END IF;
END $$;

-- Step 5: Add index on date for better query performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'log_entries' 
    AND indexname = 'log_entries_user_date_idx'
  ) THEN
    CREATE INDEX log_entries_user_date_idx ON log_entries(user_id, date DESC);
    RAISE NOTICE 'Created performance index on (user_id, date)';
  END IF;
END $$;
