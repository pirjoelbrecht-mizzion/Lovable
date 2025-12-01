/*
  # Fix Security Issues - Part 2: RLS Policy Optimization

  1. RLS Performance Optimization
    - Replace auth.uid() with (select auth.uid()) in all policies
    - This prevents re-evaluation for each row, improving performance at scale

  2. Critical Tables Optimized
    - log_entries (4 policies)
    - weekly_metrics (4 policies)
    - fitness_index (4 policies)
    - user_profiles (4 policies)
    - And all other tables with similar issues

  3. Implementation
    - Drop existing policies
    - Recreate with optimized auth function calls
*/

-- log_entries policies
DROP POLICY IF EXISTS "Users can view own log entries" ON log_entries;
DROP POLICY IF EXISTS "Users can insert own log entries" ON log_entries;
DROP POLICY IF EXISTS "Users can update own log entries" ON log_entries;
DROP POLICY IF EXISTS "Users can delete own log entries" ON log_entries;

CREATE POLICY "Users can view own log entries" ON log_entries
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own log entries" ON log_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own log entries" ON log_entries
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own log entries" ON log_entries
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- weekly_metrics policies
DROP POLICY IF EXISTS "Users can view own weekly metrics" ON weekly_metrics;
DROP POLICY IF EXISTS "Users can insert own weekly metrics" ON weekly_metrics;
DROP POLICY IF EXISTS "Users can update own weekly metrics" ON weekly_metrics;
DROP POLICY IF EXISTS "Users can delete own weekly metrics" ON weekly_metrics;

CREATE POLICY "Users can view own weekly metrics" ON weekly_metrics
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own weekly metrics" ON weekly_metrics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own weekly metrics" ON weekly_metrics
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own weekly metrics" ON weekly_metrics
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- fitness_index policies
DROP POLICY IF EXISTS "Users can view own fitness index" ON fitness_index;
DROP POLICY IF EXISTS "Users can insert own fitness index" ON fitness_index;
DROP POLICY IF EXISTS "Users can update own fitness index" ON fitness_index;
DROP POLICY IF EXISTS "Users can delete own fitness index" ON fitness_index;

CREATE POLICY "Users can view own fitness index" ON fitness_index
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own fitness index" ON fitness_index
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own fitness index" ON fitness_index
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own fitness index" ON fitness_index
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- user_profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
