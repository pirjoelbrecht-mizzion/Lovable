/*
  # Add Calendar Events and Travel Location Tables

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Event/race name
      - `type` (text) - Event type: 'street', 'trail', 'other'
      - `date` (date) - Event date
      - `distance_km` (numeric) - Distance in kilometers
      - `expected_time` (text) - Expected finish time (HH:MM:SS format)
      - `elevation_gain` (integer) - Total elevation gain in meters (for trail races)
      - `location` (text) - Event location (city, country)
      - `gpx_file_url` (text) - URL to GPX file in storage
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `travel_locations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `location` (text) - Travel destination
      - `start_date` (date) - Travel start date
      - `end_date` (date) - Travel end date
      - `latitude` (numeric) - Latitude of location
      - `longitude` (numeric) - Longitude of location
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `location_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `country` (text)
      - `city` (text)
      - `climate_data` (jsonb) - Stores temp, humidity, elevation
      - `detected_at` (timestamptz)

    - `plan_adjustments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `adjustment_date` (date)
      - `reason` (text) - Reason for adjustment (location change, climate, etc)
      - `climate_stress_factor` (numeric) - Calculated stress multiplier
      - `modifications` (jsonb) - JSON object with plan changes
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('street', 'trail', 'other')),
  date date NOT NULL,
  distance_km numeric,
  expected_time text,
  elevation_gain integer,
  location text,
  gpx_file_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create travel_locations table
CREATE TABLE IF NOT EXISTS travel_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  latitude numeric,
  longitude numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create location_history table
CREATE TABLE IF NOT EXISTS location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  country text,
  city text,
  climate_data jsonb,
  detected_at timestamptz DEFAULT now()
);

-- Create plan_adjustments table
CREATE TABLE IF NOT EXISTS plan_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  adjustment_date date NOT NULL,
  reason text NOT NULL,
  climate_stress_factor numeric,
  modifications jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_travel_user_dates ON travel_locations(user_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_location_history_user_time ON location_history(user_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_adjustments_user_date ON plan_adjustments(user_id, adjustment_date DESC);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_adjustments ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can view own events"
  ON events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Travel locations policies
CREATE POLICY "Users can view own travel locations"
  ON travel_locations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own travel locations"
  ON travel_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own travel locations"
  ON travel_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own travel locations"
  ON travel_locations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Location history policies
CREATE POLICY "Users can view own location history"
  ON location_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location history"
  ON location_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Plan adjustments policies
CREATE POLICY "Users can view own plan adjustments"
  ON plan_adjustments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan adjustments"
  ON plan_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_travel_locations_updated_at
  BEFORE UPDATE ON travel_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
