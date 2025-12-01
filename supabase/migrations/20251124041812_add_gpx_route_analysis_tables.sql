/*
  # GPX Route Analysis System

  1. Schema Changes
    - Add `route_analysis` and `gpx_parsed_data` columns to events table
    - Create `route_segments` table for detailed segment breakdown
    - Create `route_comparisons` table for matching historical runs

  2. New Tables
    - `route_segments_gpx`
      - Stores uphill/downhill/flat segments from GPX analysis
      - Includes distance, elevation, estimated time, pace, grade
      - Links to event via events.id
    
    - `route_comparisons`
      - Matches route segments to historical log entries
      - Stores similarity scores and actual performance data
      - Links segments to past runs for comparison

  3. Security
    - Enable RLS on all new tables
    - Users can only access their own route data via event ownership

  4. Important Notes
    - GPX files stored in Supabase Storage, referenced by gpx_file_url
    - Parsed data cached in events.gpx_parsed_data (JSONB)
    - Comprehensive analysis stored in events.route_analysis (JSONB)
    - Enables advanced features: segment comparison, pacing strategy, historical matching
*/

-- Extend events table with route analysis data
ALTER TABLE events ADD COLUMN IF NOT EXISTS route_analysis jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS gpx_parsed_data jsonb;

-- Create route_segments_gpx table for detailed GPX analysis
CREATE TABLE IF NOT EXISTS route_segments_gpx (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  segment_index integer NOT NULL,
  segment_type text NOT NULL CHECK (segment_type IN ('uphill', 'downhill', 'flat')),
  distance_km numeric NOT NULL,
  elevation_gain_m integer DEFAULT 0,
  elevation_loss_m integer DEFAULT 0,
  start_elevation_m integer,
  end_elevation_m integer,
  estimated_time_seconds integer,
  estimated_pace_min_km numeric,
  grade_avg_pct numeric,
  grade_max_pct numeric,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster segment queries
CREATE INDEX IF NOT EXISTS idx_route_segments_gpx_event ON route_segments_gpx(event_id);

-- Create route_comparisons table for matching historical runs
CREATE TABLE IF NOT EXISTS route_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  log_entry_id uuid REFERENCES log_entries(id) ON DELETE CASCADE,
  segment_index integer NOT NULL,
  similarity_score numeric NOT NULL, -- 0-100%
  elevation_correlation numeric,
  distance_match_pct numeric,
  actual_time_seconds integer,
  actual_pace_min_km numeric,
  conditions jsonb, -- weather, date, fitness level at time
  created_at timestamptz DEFAULT now()
);

-- Create indexes for comparison queries
CREATE INDEX IF NOT EXISTS idx_route_comparisons_event ON route_comparisons(event_id);
CREATE INDEX IF NOT EXISTS idx_route_comparisons_log_entry ON route_comparisons(log_entry_id);

-- Enable RLS
ALTER TABLE route_segments_gpx ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_comparisons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for route_segments_gpx
CREATE POLICY "Users can view their route segments"
  ON route_segments_gpx FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_segments_gpx.event_id 
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their route segments"
  ON route_segments_gpx FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_segments_gpx.event_id 
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their route segments"
  ON route_segments_gpx FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_segments_gpx.event_id 
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their route segments"
  ON route_segments_gpx FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_segments_gpx.event_id 
    AND events.user_id = auth.uid()
  ));

-- RLS Policies for route_comparisons
CREATE POLICY "Users can view their route comparisons"
  ON route_comparisons FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_comparisons.event_id 
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their route comparisons"
  ON route_comparisons FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_comparisons.event_id 
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their route comparisons"
  ON route_comparisons FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = route_comparisons.event_id 
    AND events.user_id = auth.uid()
  ));