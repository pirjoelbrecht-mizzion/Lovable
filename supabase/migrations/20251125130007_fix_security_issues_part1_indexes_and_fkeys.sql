/*
  # Fix Security Issues - Part 1: Indexes and Foreign Keys

  1. Missing Indexes
    - Add index for saved_routes.shared_by foreign key

  2. Duplicate Indexes
    - Drop duplicate index idx_log_entries_user_date (keep log_entries_user_date_idx)

  3. Notes
    - This migration focuses on index-related security issues
    - Part 2 will handle RLS policy optimizations
*/

-- Add missing foreign key index
CREATE INDEX IF NOT EXISTS idx_saved_routes_shared_by ON saved_routes(shared_by);

-- Drop duplicate index (keeping the original one)
DROP INDEX IF EXISTS idx_log_entries_user_date;
