/*
  # Fix Security Issues - Part 3: RLS Optimization (More Tables)

  1. Continue RLS Performance Optimization
    - plan_weeks, race_projections, coach_summaries
    - training_metrics_cache, race_simulations, readiness_scores
    - whatif_scenarios, wearable_connections, wearable_sync_history
    - wearable_raw_metrics, provider_priority_settings, pacing_strategies
*/

-- plan_weeks
DROP POLICY IF EXISTS "Users can view own plan weeks" ON plan_weeks;
DROP POLICY IF EXISTS "Users can insert own plan weeks" ON plan_weeks;
DROP POLICY IF EXISTS "Users can update own plan weeks" ON plan_weeks;
DROP POLICY IF EXISTS "Users can delete own plan weeks" ON plan_weeks;

CREATE POLICY "Users can view own plan weeks" ON plan_weeks
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own plan weeks" ON plan_weeks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own plan weeks" ON plan_weeks
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own plan weeks" ON plan_weeks
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- race_projections
DROP POLICY IF EXISTS "Users can view own race projections" ON race_projections;
DROP POLICY IF EXISTS "Users can insert own race projections" ON race_projections;
DROP POLICY IF EXISTS "Users can update own race projections" ON race_projections;
DROP POLICY IF EXISTS "Users can delete own race projections" ON race_projections;

CREATE POLICY "Users can view own race projections" ON race_projections
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own race projections" ON race_projections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own race projections" ON race_projections
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own race projections" ON race_projections
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- coach_summaries
DROP POLICY IF EXISTS "Users can view own coach summaries" ON coach_summaries;
DROP POLICY IF EXISTS "Users can insert own coach summaries" ON coach_summaries;
DROP POLICY IF EXISTS "Users can update own coach summaries" ON coach_summaries;
DROP POLICY IF EXISTS "Users can delete own coach summaries" ON coach_summaries;

CREATE POLICY "Users can view own coach summaries" ON coach_summaries
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own coach summaries" ON coach_summaries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own coach summaries" ON coach_summaries
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own coach summaries" ON coach_summaries
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- training_metrics_cache
DROP POLICY IF EXISTS "Users can view own training metrics" ON training_metrics_cache;
DROP POLICY IF EXISTS "Users can insert own training metrics" ON training_metrics_cache;
DROP POLICY IF EXISTS "Users can update own training metrics" ON training_metrics_cache;
DROP POLICY IF EXISTS "Users can delete own training metrics" ON training_metrics_cache;

CREATE POLICY "Users can view own training metrics" ON training_metrics_cache
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own training metrics" ON training_metrics_cache
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own training metrics" ON training_metrics_cache
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own training metrics" ON training_metrics_cache
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
