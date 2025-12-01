/*
  # Fix Security Issues - Part 5: Remaining RLS Optimizations (Batch 1)

  1. Optimize RLS for additional tables
    - race_simulations, readiness_scores, whatif_scenarios
    - wearable_connections, wearable_sync_history, wearable_raw_metrics
    - provider_priority_settings, pacing_strategies
*/

-- race_simulations
DROP POLICY IF EXISTS "Users can view their own race simulations" ON race_simulations;
DROP POLICY IF EXISTS "Users can insert their own race simulations" ON race_simulations;
DROP POLICY IF EXISTS "Users can update their own race simulations" ON race_simulations;
DROP POLICY IF EXISTS "Users can delete their own race simulations" ON race_simulations;

CREATE POLICY "Users can view their own race simulations" ON race_simulations
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own race simulations" ON race_simulations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own race simulations" ON race_simulations
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own race simulations" ON race_simulations
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- readiness_scores
DROP POLICY IF EXISTS "Users can view their own readiness scores" ON readiness_scores;
DROP POLICY IF EXISTS "Users can insert their own readiness scores" ON readiness_scores;
DROP POLICY IF EXISTS "Users can update their own readiness scores" ON readiness_scores;
DROP POLICY IF EXISTS "Users can delete their own readiness scores" ON readiness_scores;

CREATE POLICY "Users can view their own readiness scores" ON readiness_scores
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own readiness scores" ON readiness_scores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own readiness scores" ON readiness_scores
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own readiness scores" ON readiness_scores
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- whatif_scenarios
DROP POLICY IF EXISTS "Users can view their own what-if scenarios" ON whatif_scenarios;
DROP POLICY IF EXISTS "Users can insert their own what-if scenarios" ON whatif_scenarios;
DROP POLICY IF EXISTS "Users can update their own what-if scenarios" ON whatif_scenarios;
DROP POLICY IF EXISTS "Users can delete their own what-if scenarios" ON whatif_scenarios;

CREATE POLICY "Users can view their own what-if scenarios" ON whatif_scenarios
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own what-if scenarios" ON whatif_scenarios
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own what-if scenarios" ON whatif_scenarios
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own what-if scenarios" ON whatif_scenarios
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- wearable_connections
DROP POLICY IF EXISTS "Users can view own wearable connections" ON wearable_connections;
DROP POLICY IF EXISTS "Users can insert own wearable connections" ON wearable_connections;
DROP POLICY IF EXISTS "Users can update own wearable connections" ON wearable_connections;
DROP POLICY IF EXISTS "Users can delete own wearable connections" ON wearable_connections;

CREATE POLICY "Users can view own wearable connections" ON wearable_connections
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own wearable connections" ON wearable_connections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own wearable connections" ON wearable_connections
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own wearable connections" ON wearable_connections
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- wearable_sync_history
DROP POLICY IF EXISTS "Users can view own sync history" ON wearable_sync_history;
DROP POLICY IF EXISTS "Users can insert own sync history" ON wearable_sync_history;

CREATE POLICY "Users can view own sync history" ON wearable_sync_history
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own sync history" ON wearable_sync_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- wearable_raw_metrics
DROP POLICY IF EXISTS "Users can view own raw metrics" ON wearable_raw_metrics;
DROP POLICY IF EXISTS "Users can insert own raw metrics" ON wearable_raw_metrics;
DROP POLICY IF EXISTS "Users can update own raw metrics" ON wearable_raw_metrics;

CREATE POLICY "Users can view own raw metrics" ON wearable_raw_metrics
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own raw metrics" ON wearable_raw_metrics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own raw metrics" ON wearable_raw_metrics
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- provider_priority_settings
DROP POLICY IF EXISTS "Users can view own priority settings" ON provider_priority_settings;
DROP POLICY IF EXISTS "Users can insert own priority settings" ON provider_priority_settings;
DROP POLICY IF EXISTS "Users can update own priority settings" ON provider_priority_settings;

CREATE POLICY "Users can view own priority settings" ON provider_priority_settings
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own priority settings" ON provider_priority_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own priority settings" ON provider_priority_settings
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- pacing_strategies
DROP POLICY IF EXISTS "Users can view own pacing strategies" ON pacing_strategies;
DROP POLICY IF EXISTS "Users can insert own pacing strategies" ON pacing_strategies;
DROP POLICY IF EXISTS "Users can update own pacing strategies" ON pacing_strategies;
DROP POLICY IF EXISTS "Users can delete own pacing strategies" ON pacing_strategies;

CREATE POLICY "Users can view own pacing strategies" ON pacing_strategies
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own pacing strategies" ON pacing_strategies
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own pacing strategies" ON pacing_strategies
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own pacing strategies" ON pacing_strategies
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
