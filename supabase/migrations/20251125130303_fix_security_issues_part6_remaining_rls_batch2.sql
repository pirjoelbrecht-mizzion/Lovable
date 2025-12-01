/*
  # Fix Security Issues - Part 6: Remaining RLS Optimizations (Batch 2)

  1. Optimize RLS for additional tables
    - user_locations, availability_slots, coach_conversations, coach_messages
    - motivation_history, training_analysis_cache, athlete_learning_state
    - derived_metrics_weekly, metric_computation_log
*/

-- user_locations
DROP POLICY IF EXISTS "Users can view their own locations" ON user_locations;
DROP POLICY IF EXISTS "Users can insert their own locations" ON user_locations;
DROP POLICY IF EXISTS "Users can update their own locations" ON user_locations;
DROP POLICY IF EXISTS "Users can delete their own locations" ON user_locations;

CREATE POLICY "Users can view their own locations" ON user_locations
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own locations" ON user_locations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own locations" ON user_locations
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own locations" ON user_locations
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- availability_slots
DROP POLICY IF EXISTS "Users can view their own availability" ON availability_slots;
DROP POLICY IF EXISTS "Users can insert their own availability" ON availability_slots;
DROP POLICY IF EXISTS "Users can update their own availability" ON availability_slots;
DROP POLICY IF EXISTS "Users can delete their own availability" ON availability_slots;

CREATE POLICY "Users can view their own availability" ON availability_slots
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own availability" ON availability_slots
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own availability" ON availability_slots
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own availability" ON availability_slots
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- coach_conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON coach_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON coach_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON coach_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON coach_conversations;

CREATE POLICY "Users can view their own conversations" ON coach_conversations
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create their own conversations" ON coach_conversations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own conversations" ON coach_conversations
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own conversations" ON coach_conversations
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- coach_messages
DROP POLICY IF EXISTS "Users can view their own messages" ON coach_messages;
DROP POLICY IF EXISTS "Users can create their own messages" ON coach_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON coach_messages;

CREATE POLICY "Users can view their own messages" ON coach_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.id = coach_messages.conversation_id 
    AND coach_conversations.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can create their own messages" ON coach_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.id = coach_messages.conversation_id 
    AND coach_conversations.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can delete their own messages" ON coach_messages
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM coach_conversations 
    WHERE coach_conversations.id = coach_messages.conversation_id 
    AND coach_conversations.user_id = (select auth.uid())
  ));

-- motivation_history
DROP POLICY IF EXISTS "Users can view their own motivation history" ON motivation_history;
DROP POLICY IF EXISTS "Users can insert their own motivation history" ON motivation_history;
DROP POLICY IF EXISTS "Users can delete their own motivation history" ON motivation_history;

CREATE POLICY "Users can view their own motivation history" ON motivation_history
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own motivation history" ON motivation_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own motivation history" ON motivation_history
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- training_analysis_cache
DROP POLICY IF EXISTS "Users can view their own training analysis" ON training_analysis_cache;
DROP POLICY IF EXISTS "Users can insert their own training analysis" ON training_analysis_cache;
DROP POLICY IF EXISTS "Users can update their own training analysis" ON training_analysis_cache;
DROP POLICY IF EXISTS "Users can delete their own training analysis" ON training_analysis_cache;

CREATE POLICY "Users can view their own training analysis" ON training_analysis_cache
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own training analysis" ON training_analysis_cache
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own training analysis" ON training_analysis_cache
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own training analysis" ON training_analysis_cache
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- athlete_learning_state
DROP POLICY IF EXISTS "Users can view own learning state" ON athlete_learning_state;
DROP POLICY IF EXISTS "Users can insert own learning state" ON athlete_learning_state;
DROP POLICY IF EXISTS "Users can update own learning state" ON athlete_learning_state;
DROP POLICY IF EXISTS "Users can delete own learning state" ON athlete_learning_state;

CREATE POLICY "Users can view own learning state" ON athlete_learning_state
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own learning state" ON athlete_learning_state
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own learning state" ON athlete_learning_state
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own learning state" ON athlete_learning_state
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- derived_metrics_weekly
DROP POLICY IF EXISTS "Users can view own derived metrics" ON derived_metrics_weekly;
DROP POLICY IF EXISTS "Users can insert own derived metrics" ON derived_metrics_weekly;
DROP POLICY IF EXISTS "Users can update own derived metrics" ON derived_metrics_weekly;
DROP POLICY IF EXISTS "Users can delete own derived metrics" ON derived_metrics_weekly;

CREATE POLICY "Users can view own derived metrics" ON derived_metrics_weekly
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own derived metrics" ON derived_metrics_weekly
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own derived metrics" ON derived_metrics_weekly
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own derived metrics" ON derived_metrics_weekly
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- metric_computation_log
DROP POLICY IF EXISTS "Users can view own computation logs" ON metric_computation_log;
DROP POLICY IF EXISTS "System can insert computation logs" ON metric_computation_log;

CREATE POLICY "Users can view own computation logs" ON metric_computation_log
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "System can insert computation logs" ON metric_computation_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
