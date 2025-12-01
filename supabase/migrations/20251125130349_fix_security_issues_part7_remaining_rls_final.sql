/*
  # Fix Security Issues - Part 7: Final RLS Optimizations

  1. Optimize RLS for final tables
    - performance_models, performance_calibrations, location_history
    - saved_routes, route_segments, user_route_history
    - climate_performance, notification_log, athlete_intelligence_profile
    - adaptive_decisions, adjustment_layers, route_segments_gpx
    - route_comparisons, environmental_adaptations, environmental_training_data
    - activity_terrain_analysis, user_pace_profiles
*/

-- performance_models
DROP POLICY IF EXISTS "Users can view own performance model" ON performance_models;
DROP POLICY IF EXISTS "Users can insert own performance model" ON performance_models;
DROP POLICY IF EXISTS "Users can update own performance model" ON performance_models;
DROP POLICY IF EXISTS "Users can delete own performance model" ON performance_models;

CREATE POLICY "Users can view own performance model" ON performance_models
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own performance model" ON performance_models
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own performance model" ON performance_models
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own performance model" ON performance_models
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- performance_calibrations
DROP POLICY IF EXISTS "Users can view own calibration history" ON performance_calibrations;
DROP POLICY IF EXISTS "Users can insert own calibrations" ON performance_calibrations;

CREATE POLICY "Users can view own calibration history" ON performance_calibrations
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own calibrations" ON performance_calibrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- location_history
DROP POLICY IF EXISTS "Users can view own location history" ON location_history;
DROP POLICY IF EXISTS "Users can insert own location history" ON location_history;
DROP POLICY IF EXISTS "Users can update own location history" ON location_history;
DROP POLICY IF EXISTS "Users can delete own location history" ON location_history;

CREATE POLICY "Users can view own location history" ON location_history
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own location history" ON location_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own location history" ON location_history
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own location history" ON location_history
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- saved_routes (keep duplicate policy for public routes)
DROP POLICY IF EXISTS "Users can view own routes" ON saved_routes;
DROP POLICY IF EXISTS "Users can insert own routes" ON saved_routes;
DROP POLICY IF EXISTS "Users can update own routes" ON saved_routes;
DROP POLICY IF EXISTS "Users can delete own routes" ON saved_routes;
DROP POLICY IF EXISTS "Users can view public routes or own routes" ON saved_routes;

CREATE POLICY "Users can view own routes" ON saved_routes
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can view public routes or own routes" ON saved_routes
  FOR SELECT TO authenticated
  USING (is_public = true OR user_id = (select auth.uid()));

CREATE POLICY "Users can insert own routes" ON saved_routes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own routes" ON saved_routes
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own routes" ON saved_routes
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- route_segments
DROP POLICY IF EXISTS "Users can view segments of own routes" ON route_segments;
DROP POLICY IF EXISTS "Users can insert segments for own routes" ON route_segments;
DROP POLICY IF EXISTS "Users can update segments of own routes" ON route_segments;
DROP POLICY IF EXISTS "Users can delete segments of own routes" ON route_segments;

CREATE POLICY "Users can view segments of own routes" ON route_segments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM saved_routes 
    WHERE saved_routes.id = route_segments.route_id 
    AND saved_routes.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can insert segments for own routes" ON route_segments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM saved_routes 
    WHERE saved_routes.id = route_segments.route_id 
    AND saved_routes.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can update segments of own routes" ON route_segments
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM saved_routes 
    WHERE saved_routes.id = route_segments.route_id 
    AND saved_routes.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM saved_routes 
    WHERE saved_routes.id = route_segments.route_id 
    AND saved_routes.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can delete segments of own routes" ON route_segments
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM saved_routes 
    WHERE saved_routes.id = route_segments.route_id 
    AND saved_routes.user_id = (select auth.uid())
  ));

-- user_route_history
DROP POLICY IF EXISTS "Users can view own route history" ON user_route_history;
DROP POLICY IF EXISTS "Users can insert own route history" ON user_route_history;
DROP POLICY IF EXISTS "Users can update own route history" ON user_route_history;
DROP POLICY IF EXISTS "Users can delete own route history" ON user_route_history;

CREATE POLICY "Users can view own route history" ON user_route_history
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own route history" ON user_route_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own route history" ON user_route_history
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own route history" ON user_route_history
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- climate_performance
DROP POLICY IF EXISTS "Users can view own climate performance" ON climate_performance;
DROP POLICY IF EXISTS "Users can insert own climate performance" ON climate_performance;
DROP POLICY IF EXISTS "Users can update own climate performance" ON climate_performance;
DROP POLICY IF EXISTS "Users can delete own climate performance" ON climate_performance;

CREATE POLICY "Users can view own climate performance" ON climate_performance
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own climate performance" ON climate_performance
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own climate performance" ON climate_performance
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own climate performance" ON climate_performance
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- notification_log
DROP POLICY IF EXISTS "Users can view own notifications" ON notification_log;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notification_log;

CREATE POLICY "Users can view own notifications" ON notification_log
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own notifications" ON notification_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- athlete_intelligence_profile
DROP POLICY IF EXISTS "Users can view own intelligence profile" ON athlete_intelligence_profile;
DROP POLICY IF EXISTS "Users can insert own intelligence profile" ON athlete_intelligence_profile;
DROP POLICY IF EXISTS "Users can update own intelligence profile" ON athlete_intelligence_profile;

CREATE POLICY "Users can view own intelligence profile" ON athlete_intelligence_profile
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own intelligence profile" ON athlete_intelligence_profile
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own intelligence profile" ON athlete_intelligence_profile
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- adaptive_decisions
DROP POLICY IF EXISTS "Users can view own adaptive decisions" ON adaptive_decisions;
DROP POLICY IF EXISTS "Users can insert own adaptive decisions" ON adaptive_decisions;

CREATE POLICY "Users can view own adaptive decisions" ON adaptive_decisions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own adaptive decisions" ON adaptive_decisions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- adjustment_layers
DROP POLICY IF EXISTS "Users can view own adjustment layers" ON adjustment_layers;
DROP POLICY IF EXISTS "Users can insert own adjustment layers" ON adjustment_layers;

CREATE POLICY "Users can view own adjustment layers" ON adjustment_layers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM adaptive_decisions 
    WHERE adaptive_decisions.id = adjustment_layers.decision_id 
    AND adaptive_decisions.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can insert own adjustment layers" ON adjustment_layers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM adaptive_decisions 
    WHERE adaptive_decisions.id = adjustment_layers.decision_id 
    AND adaptive_decisions.user_id = (select auth.uid())
  ));

-- route_segments_gpx
DROP POLICY IF EXISTS "Users can view their route segments" ON route_segments_gpx;
DROP POLICY IF EXISTS "Users can insert their route segments" ON route_segments_gpx;
DROP POLICY IF EXISTS "Users can update their route segments" ON route_segments_gpx;
DROP POLICY IF EXISTS "Users can delete their route segments" ON route_segments_gpx;

CREATE POLICY "Users can view their route segments" ON route_segments_gpx
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_segments_gpx.event_id 
    AND events.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can insert their route segments" ON route_segments_gpx
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_segments_gpx.event_id 
    AND events.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can update their route segments" ON route_segments_gpx
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_segments_gpx.event_id 
    AND events.user_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_segments_gpx.event_id 
    AND events.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can delete their route segments" ON route_segments_gpx
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_segments_gpx.event_id 
    AND events.user_id = (select auth.uid())
  ));

-- route_comparisons
DROP POLICY IF EXISTS "Users can view their route comparisons" ON route_comparisons;
DROP POLICY IF EXISTS "Users can insert their route comparisons" ON route_comparisons;
DROP POLICY IF EXISTS "Users can delete their route comparisons" ON route_comparisons;

CREATE POLICY "Users can view their route comparisons" ON route_comparisons
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_comparisons.event_id 
    AND events.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can insert their route comparisons" ON route_comparisons
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_comparisons.event_id 
    AND events.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can delete their route comparisons" ON route_comparisons
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_comparisons.event_id 
    AND events.user_id = (select auth.uid())
  ));

-- environmental_adaptations
DROP POLICY IF EXISTS "Users can view their adaptations" ON environmental_adaptations;
DROP POLICY IF EXISTS "Users can insert their adaptations" ON environmental_adaptations;
DROP POLICY IF EXISTS "Users can update their adaptations" ON environmental_adaptations;
DROP POLICY IF EXISTS "Users can delete their adaptations" ON environmental_adaptations;

CREATE POLICY "Users can view their adaptations" ON environmental_adaptations
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their adaptations" ON environmental_adaptations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their adaptations" ON environmental_adaptations
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their adaptations" ON environmental_adaptations
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- environmental_training_data
DROP POLICY IF EXISTS "Users can view their training data" ON environmental_training_data;
DROP POLICY IF EXISTS "Users can insert their training data" ON environmental_training_data;
DROP POLICY IF EXISTS "Users can update their training data" ON environmental_training_data;
DROP POLICY IF EXISTS "Users can delete their training data" ON environmental_training_data;

CREATE POLICY "Users can view their training data" ON environmental_training_data
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their training data" ON environmental_training_data
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their training data" ON environmental_training_data
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their training data" ON environmental_training_data
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- activity_terrain_analysis
DROP POLICY IF EXISTS "Users can view own terrain analysis" ON activity_terrain_analysis;
DROP POLICY IF EXISTS "Users can insert own terrain analysis" ON activity_terrain_analysis;
DROP POLICY IF EXISTS "Users can update own terrain analysis" ON activity_terrain_analysis;
DROP POLICY IF EXISTS "Users can delete own terrain analysis" ON activity_terrain_analysis;

CREATE POLICY "Users can view own terrain analysis" ON activity_terrain_analysis
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own terrain analysis" ON activity_terrain_analysis
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own terrain analysis" ON activity_terrain_analysis
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own terrain analysis" ON activity_terrain_analysis
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- user_pace_profiles
DROP POLICY IF EXISTS "Users can view own pace profile" ON user_pace_profiles;
DROP POLICY IF EXISTS "Users can insert own pace profile" ON user_pace_profiles;
DROP POLICY IF EXISTS "Users can update own pace profile" ON user_pace_profiles;
DROP POLICY IF EXISTS "Users can delete own pace profile" ON user_pace_profiles;

CREATE POLICY "Users can view own pace profile" ON user_pace_profiles
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own pace profile" ON user_pace_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own pace profile" ON user_pace_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own pace profile" ON user_pace_profiles
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
