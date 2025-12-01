/*
  # Fix Security Issues - Part 4: Community, Settings, and Duplicate Policies (Fixed)

  1. Fix Duplicate Policies
    - Remove old policies on user_settings (keep "Users can X their own settings")

  2. Optimize Remaining Tables
    - community_profiles, community_connections (use partner_id, not connected_user_id)
    - run_invites, user_locations, events, travel_locations
*/

-- Remove duplicate user_settings policies (keep "their own" version)
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

-- Optimize existing "their own" policies
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON user_settings;

CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own settings" ON user_settings
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- community_profiles
DROP POLICY IF EXISTS "Users can view their own community profile" ON community_profiles;
DROP POLICY IF EXISTS "Users can insert their own community profile" ON community_profiles;
DROP POLICY IF EXISTS "Users can update their own community profile" ON community_profiles;
DROP POLICY IF EXISTS "Users can delete their own community profile" ON community_profiles;

CREATE POLICY "Users can view their own community profile" ON community_profiles
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own community profile" ON community_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own community profile" ON community_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own community profile" ON community_profiles
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- community_connections (use partner_id)
DROP POLICY IF EXISTS "Users can view their own connections" ON community_connections;
DROP POLICY IF EXISTS "Users can create connections" ON community_connections;
DROP POLICY IF EXISTS "Users can update their connections" ON community_connections;
DROP POLICY IF EXISTS "Users can delete their connections" ON community_connections;

CREATE POLICY "Users can view their own connections" ON community_connections
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR partner_id = (select auth.uid()));

CREATE POLICY "Users can create connections" ON community_connections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their connections" ON community_connections
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()) OR partner_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()) OR partner_id = (select auth.uid()));

CREATE POLICY "Users can delete their connections" ON community_connections
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- run_invites
DROP POLICY IF EXISTS "Users can view invites they sent or received" ON run_invites;
DROP POLICY IF EXISTS "Users can create run invites" ON run_invites;
DROP POLICY IF EXISTS "Recipients can update invite status" ON run_invites;
DROP POLICY IF EXISTS "Senders can delete their invites" ON run_invites;

CREATE POLICY "Users can view invites they sent or received" ON run_invites
  FOR SELECT TO authenticated
  USING (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()));

CREATE POLICY "Users can create run invites" ON run_invites
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Recipients can update invite status" ON run_invites
  FOR UPDATE TO authenticated
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (recipient_id = (select auth.uid()));

CREATE POLICY "Senders can delete their invites" ON run_invites
  FOR DELETE TO authenticated
  USING (sender_id = (select auth.uid()));

-- events
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;

CREATE POLICY "Users can view own events" ON events
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own events" ON events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- travel_locations
DROP POLICY IF EXISTS "Users can view own travel locations" ON travel_locations;
DROP POLICY IF EXISTS "Users can insert own travel locations" ON travel_locations;
DROP POLICY IF EXISTS "Users can update own travel locations" ON travel_locations;
DROP POLICY IF EXISTS "Users can delete own travel locations" ON travel_locations;

CREATE POLICY "Users can view own travel locations" ON travel_locations
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own travel locations" ON travel_locations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own travel locations" ON travel_locations
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own travel locations" ON travel_locations
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));
