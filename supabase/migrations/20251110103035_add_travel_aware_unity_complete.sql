/*
  # Travel-Aware Unity Community - Complete Implementation

  ## Overview
  Creates comprehensive travel-aware running buddy matching system with:
  - Travel location tracking
  - Multi-location support for users
  - Flexible availability scheduling (recurring + date-specific)
  - Calendar integration foundations
  - Events and calendar data for travel detection

  ## New Tables

  ### events (if not exists)
  - Race and training events with location data
  - Used for detecting travel patterns

  ### travel_locations (if not exists)
  - User travel plans with date ranges
  - Automatically synced to user_locations for Unity matching

  ### user_locations
  - Multiple active and future locations per user
  - Links to travel_locations for auto-sync
  - Geography points for spatial queries

  ### availability_slots
  - Recurring weekly schedules
  - Date-specific availability for travel periods
  - Location-specific availability

  ## Updates to community_profiles
  - Calendar integration preferences
  - Auto-location detection settings
  - Home location storage

  ## Security
  - RLS enabled on all tables
  - Users manage only their own data
  - Privacy controls maintained

  ## Performance
  - Spatial indexes for location queries
  - Composite indexes for time range matching
  - Optimized for multi-location searches
*/

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Events Table (calendar/race events)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('street', 'trail', 'other')),
  date DATE NOT NULL,
  distance_km NUMERIC,
  expected_time TEXT,
  elevation_gain INTEGER,
  location TEXT,
  gpx_file_url TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Travel Locations Table
CREATE TABLE IF NOT EXISTS travel_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- User Locations Table (Unity multi-location support)
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  location GEOGRAPHY(Point, 4326),
  city TEXT,
  country TEXT,
  location_label TEXT,
  
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  
  location_source TEXT DEFAULT 'manual',
  linked_travel_id UUID REFERENCES travel_locations(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT user_locations_source_check CHECK (
    location_source IN ('manual', 'travel_calendar', 'google_calendar', 'auto_detected')
  ),
  CONSTRAINT user_locations_date_range_check CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  )
);

-- Availability Slots Table
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  day_of_week TEXT,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  
  start_date DATE,
  end_date DATE,
  
  location_id UUID REFERENCES user_locations(id) ON DELETE CASCADE,
  
  is_recurring BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT availability_slots_day_check CHECK (
    day_of_week IS NULL OR 
    day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ),
  CONSTRAINT availability_slots_time_check CHECK (time_end > time_start),
  CONSTRAINT availability_slots_recurring_check CHECK (
    (is_recurring = true AND day_of_week IS NOT NULL) OR 
    (is_recurring = false AND start_date IS NOT NULL AND end_date IS NOT NULL)
  )
);

-- Extend community_profiles with travel-aware fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_profiles' AND column_name = 'calendar_integration_enabled'
  ) THEN
    ALTER TABLE community_profiles 
    ADD COLUMN calendar_integration_enabled BOOLEAN DEFAULT false,
    ADD COLUMN auto_location_detection BOOLEAN DEFAULT false,
    ADD COLUMN home_location GEOGRAPHY(Point, 4326),
    ADD COLUMN home_city TEXT,
    ADD COLUMN home_country TEXT;
  END IF;
END $$;

-- Create Indexes

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, date);

-- Travel locations indexes
CREATE INDEX IF NOT EXISTS idx_travel_user_dates ON travel_locations(user_id, start_date, end_date);

-- User locations indexes
CREATE INDEX IF NOT EXISTS idx_user_locations_geography ON user_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_user_locations_user_active ON user_locations(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_locations_dates ON user_locations(start_date, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_locations_travel_link ON user_locations(linked_travel_id) WHERE linked_travel_id IS NOT NULL;

-- Availability slots indexes
CREATE INDEX IF NOT EXISTS idx_availability_slots_user ON availability_slots(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_availability_slots_day ON availability_slots(day_of_week, is_active) WHERE is_recurring = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_availability_slots_dates ON availability_slots(start_date, end_date) WHERE is_recurring = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_availability_slots_time ON availability_slots(time_start, time_end) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_availability_slots_location ON availability_slots(location_id) WHERE location_id IS NOT NULL;

-- Community profiles home location index
CREATE INDEX IF NOT EXISTS idx_community_profiles_home_location ON community_profiles USING GIST(home_location) WHERE home_location IS NOT NULL;

-- Enable RLS

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;

-- Events RLS Policies
CREATE POLICY "Users can view own events" ON events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON events FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Travel locations RLS Policies
CREATE POLICY "Users can view own travel locations" ON travel_locations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own travel locations" ON travel_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own travel locations" ON travel_locations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own travel locations" ON travel_locations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- User locations RLS Policies
CREATE POLICY "Users can view their own locations" ON user_locations FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view active locations of visible community members" ON user_locations FOR SELECT TO authenticated
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM community_profiles
    WHERE community_profiles.user_id = user_locations.user_id
    AND community_profiles.visible = true
  )
);

CREATE POLICY "Users can insert their own locations" ON user_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own locations" ON user_locations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own locations" ON user_locations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Availability slots RLS Policies
CREATE POLICY "Users can view their own availability" ON availability_slots FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view availability of visible community members" ON availability_slots FOR SELECT TO authenticated
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM community_profiles
    WHERE community_profiles.user_id = availability_slots.user_id
    AND community_profiles.visible = true
  )
);

CREATE POLICY "Users can insert their own availability" ON availability_slots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own availability" ON availability_slots FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own availability" ON availability_slots FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Helper Functions

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_travel_locations_updated_at BEFORE UPDATE ON travel_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_locations_updated_at BEFORE UPDATE ON user_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_slots_updated_at BEFORE UPDATE ON availability_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-sync travel_locations to user_locations
CREATE OR REPLACE FUNCTION sync_travel_to_user_locations()
RETURNS TRIGGER AS $$
DECLARE
  location_point GEOGRAPHY;
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    location_point := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    location_point := NULL;
  END IF;

  INSERT INTO user_locations (
    user_id,
    location,
    city,
    location_label,
    start_date,
    end_date,
    is_active,
    location_source,
    linked_travel_id
  ) VALUES (
    NEW.user_id,
    location_point,
    NEW.location,
    NEW.location,
    NEW.start_date,
    NEW.end_date,
    true,
    'travel_calendar',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_travel_locations_trigger
  AFTER INSERT ON travel_locations
  FOR EACH ROW
  EXECUTE FUNCTION sync_travel_to_user_locations();

-- Check if location is currently active
CREATE OR REPLACE FUNCTION is_location_active(
  p_start_date DATE,
  p_end_date DATE
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_start_date IS NULL AND p_end_date IS NULL THEN
    RETURN true;
  END IF;
  
  IF p_start_date IS NULL THEN
    RETURN CURRENT_DATE <= p_end_date;
  END IF;
  
  IF p_end_date IS NULL THEN
    RETURN CURRENT_DATE >= p_start_date;
  END IF;
  
  RETURN CURRENT_DATE BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comments
COMMENT ON TABLE user_locations IS 'Multiple locations per user for travel-aware Unity matching';
COMMENT ON TABLE availability_slots IS 'Flexible availability: recurring schedules or date-specific periods';
COMMENT ON COLUMN user_locations.location_source IS 'Source: manual, travel_calendar, google_calendar, or auto_detected';
COMMENT ON COLUMN availability_slots.is_recurring IS 'True: weekly recurring. False: one-time/travel period';
