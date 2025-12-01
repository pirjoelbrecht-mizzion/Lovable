/*
  # Add metadata column to weekly_metrics table

  1. Changes
    - Add `metadata` JSONB column to `weekly_metrics` table
    - Set default to empty JSON object '{}'
    - Column is nullable to support existing records

  2. Purpose
    - Allow storing additional flexible data with weekly metrics
    - Support future extensibility without schema changes
*/

-- Add metadata column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_metrics' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE weekly_metrics ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;
