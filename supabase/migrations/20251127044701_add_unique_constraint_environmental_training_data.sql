/*
  # Fix Environmental Training Data Unique Constraint

  1. Changes
    - Add unique constraint on log_entry_id to prevent duplicate entries
    - This allows upsert operations to work correctly

  2. Notes
    - Each log entry should have only one environmental training data record
    - This enables proper conflict resolution during bulk imports
*/

-- Add unique constraint on log_entry_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'environmental_training_data_log_entry_unique'
  ) THEN
    -- First, remove any duplicates if they exist
    DELETE FROM environmental_training_data a
    USING environmental_training_data b
    WHERE a.id > b.id 
    AND a.log_entry_id = b.log_entry_id
    AND a.log_entry_id IS NOT NULL;

    -- Add unique constraint
    ALTER TABLE environmental_training_data
    ADD CONSTRAINT environmental_training_data_log_entry_unique
    UNIQUE (log_entry_id);
  END IF;
END $$;
