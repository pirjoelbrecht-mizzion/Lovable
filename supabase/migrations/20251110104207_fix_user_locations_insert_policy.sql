/*
  # Fix user_locations INSERT policy

  ## Issue
  The INSERT policy for user_locations is missing a WITH CHECK clause,
  preventing users from adding new locations.

  ## Fix
  Drop and recreate the INSERT policy with proper WITH CHECK clause
  to verify that users can only insert their own locations.
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own locations" ON user_locations;

-- Recreate with proper WITH CHECK clause
CREATE POLICY "Users can insert their own locations"
  ON user_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
