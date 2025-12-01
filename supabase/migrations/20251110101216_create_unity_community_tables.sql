/*
  # Unity Community Feature - Community Profiles

  1. Overview
    Creates the foundation for Unity's hybrid local/virtual running companion matching system.
    Enables users to find training partners based on pace, schedule, terrain, and proximity.

  2. New Tables
    - `community_profiles`
      - Core profile data for community matching
      - Includes pace range, availability, terrain preferences
      - Location stored as geography point for proximity searches
      - Visibility controls for privacy

    - `community_connections`
      - Tracks bilateral relationships between runners
      - Stores connection status (pending, accepted, blocked)
      - Records run history count and last activity

    - `run_invites`
      - Manages invitations to run together
      - Supports both local and virtual run coordination
      - Includes meeting details and timezone handling

  3. Security
    - Enable RLS on all tables
    - Users can only view profiles marked as visible
    - Users can only edit their own community profile
    - Connection visibility restricted to participants only
    - Invite visibility restricted to sender and recipient

  4. Performance
    - Spatial index on location for proximity queries
    - Composite indexes on pace_range and availability_days
    - GIN indexes on JSONB fields for flexible querying
*/

-- Enable PostGIS extension for geography support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Community Profiles Table
CREATE TABLE IF NOT EXISTS community_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Matching Criteria
  preferred_run_time TEXT[] DEFAULT ARRAY['morning'],
  preferred_terrain TEXT DEFAULT 'road',
  pace_min NUMERIC(4,2),
  pace_max NUMERIC(4,2),
  availability_days TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Profile Info
  bio TEXT,
  looking_for_partner BOOLEAN DEFAULT false,
  match_preference TEXT DEFAULT 'both',

  -- Location (stored as geography point for distance calculations)
  location GEOGRAPHY(Point, 4326),
  location_label TEXT,
  max_distance_km INTEGER DEFAULT 25,

  -- Privacy
  visible BOOLEAN DEFAULT false,
  share_location BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT community_profiles_user_id_key UNIQUE(user_id),
  CONSTRAINT community_profiles_terrain_check CHECK (preferred_terrain IN ('road', 'trail', 'track', 'mixed')),
  CONSTRAINT community_profiles_match_preference_check CHECK (match_preference IN ('local', 'virtual', 'both')),
  CONSTRAINT community_profiles_pace_check CHECK (pace_min IS NULL OR pace_max IS NULL OR pace_min <= pace_max)
);

-- Community Connections Table
CREATE TABLE IF NOT EXISTS community_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'pending',
  connection_type TEXT DEFAULT 'local',

  -- Activity Tracking
  runs_together INTEGER DEFAULT 0,
  total_km_together NUMERIC(10,2) DEFAULT 0,
  last_run_date DATE,

  -- Metadata
  requested_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT community_connections_unique_pair UNIQUE(user_id, partner_id),
  CONSTRAINT community_connections_no_self_connect CHECK (user_id != partner_id),
  CONSTRAINT community_connections_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'blocked'))
);

-- Run Invites Table
CREATE TABLE IF NOT EXISTS run_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Invite Details
  invite_type TEXT DEFAULT 'local',
  proposed_date DATE NOT NULL,
  proposed_time TIME,
  meeting_location TEXT,
  meeting_lat NUMERIC(10,7),
  meeting_lon NUMERIC(10,7),

  -- Workout Details
  workout_type TEXT,
  distance_km NUMERIC(5,2),
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'pending',

  -- Timezone support for virtual runs
  sender_timezone TEXT,
  recipient_timezone TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,

  CONSTRAINT run_invites_sender_not_recipient CHECK (sender_id != recipient_id),
  CONSTRAINT run_invites_type_check CHECK (invite_type IN ('local', 'virtual')),
  CONSTRAINT run_invites_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed'))
);

-- Create Indexes for Performance

-- Spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_community_profiles_location
ON community_profiles USING GIST(location);

-- Index for visibility and looking_for_partner queries
CREATE INDEX IF NOT EXISTS idx_community_profiles_visible_looking
ON community_profiles(visible, looking_for_partner)
WHERE visible = true AND looking_for_partner = true;

-- Index for pace range queries
CREATE INDEX IF NOT EXISTS idx_community_profiles_pace
ON community_profiles(pace_min, pace_max)
WHERE visible = true;

-- Index for terrain preference
CREATE INDEX IF NOT EXISTS idx_community_profiles_terrain
ON community_profiles(preferred_terrain)
WHERE visible = true;

-- Index for availability days (GIN for array containment)
CREATE INDEX IF NOT EXISTS idx_community_profiles_availability
ON community_profiles USING GIN(availability_days);

-- Index for last active users
CREATE INDEX IF NOT EXISTS idx_community_profiles_last_active
ON community_profiles(last_active_at DESC)
WHERE visible = true;

-- Connection indexes
CREATE INDEX IF NOT EXISTS idx_community_connections_user
ON community_connections(user_id, status);

CREATE INDEX IF NOT EXISTS idx_community_connections_partner
ON community_connections(partner_id, status);

-- Invite indexes
CREATE INDEX IF NOT EXISTS idx_run_invites_recipient
ON run_invites(recipient_id, status)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_run_invites_sender
ON run_invites(sender_id, status);

CREATE INDEX IF NOT EXISTS idx_run_invites_date
ON run_invites(proposed_date)
WHERE status IN ('pending', 'accepted');

-- Enable Row Level Security

ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_profiles

CREATE POLICY "Users can view visible community profiles"
  ON community_profiles
  FOR SELECT
  TO authenticated
  USING (visible = true);

CREATE POLICY "Users can view their own community profile"
  ON community_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own community profile"
  ON community_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own community profile"
  ON community_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own community profile"
  ON community_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for community_connections

CREATE POLICY "Users can view their own connections"
  ON community_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create connections"
  ON community_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their connections"
  ON community_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = partner_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can delete their connections"
  ON community_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for run_invites

CREATE POLICY "Users can view invites they sent or received"
  ON run_invites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create run invites"
  ON run_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update invite status"
  ON run_invites
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id)
  WITH CHECK (auth.uid() = recipient_id OR auth.uid() = sender_id);

CREATE POLICY "Senders can delete their invites"
  ON run_invites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Helper Functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_community_profiles_updated_at
  BEFORE UPDATE ON community_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_connections_updated_at
  BEFORE UPDATE ON community_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE community_profiles IS
  'Community profiles for Unity running companion matching system';

COMMENT ON COLUMN community_profiles.location IS
  'Geography point for proximity matching (PostGIS). Privacy: only distance shown to users, never exact coordinates';

COMMENT ON COLUMN community_profiles.match_preference IS
  'Matching preference: local (nearby only), virtual (remote only), or both';

COMMENT ON COLUMN community_profiles.max_distance_km IS
  'Maximum distance in kilometers for local matches (default 25km)';

COMMENT ON TABLE community_connections IS
  'Bilateral relationships between running companions';

COMMENT ON TABLE run_invites IS
  'Invitations to run together (local meetup or virtual synchronized run)';
