/*
  # Create saved_routes table for AI-powered route recommendations

  1. New Tables
    - `saved_routes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `name` (text, route name)
      - `distance_km` (numeric, route distance in kilometers)
      - `elevation_gain_m` (numeric, total elevation gain in meters)
      - `surface_type` (text, road/trail/mixed)
      - `polyline` (text, encoded polyline geometry)
      - `summary_polyline` (text, compressed polyline for overview)
      - `scenic_score` (numeric, 0-10 scenic rating)
      - `popularity_score` (numeric, 0-10 popularity rating)
      - `strava_segment_id` (text, optional Strava segment reference)
      - `start_lat` (numeric, starting latitude)
      - `start_lon` (numeric, starting longitude)
      - `end_lat` (numeric, ending latitude)
      - `end_lon` (numeric, ending longitude)
      - `tags` (text array, route tags like 'hills', 'scenic', 'urban')
      - `source` (text, manual/strava/imported)
      - `created_at` (timestamptz, creation timestamp)
      - `updated_at` (timestamptz, last update timestamp)

  2. Security
    - Enable RLS on `saved_routes` table
    - Add policies for authenticated users to manage their own routes
    - Users can read their own routes
    - Users can insert their own routes
    - Users can update their own routes
    - Users can delete their own routes

  3. Indexes
    - Index on user_id for efficient user queries
    - Index on popularity_score for route discovery
    - Index on distance_km for distance-based filtering
    - Index on surface_type for terrain filtering
*/

-- Create saved_routes table
CREATE TABLE IF NOT EXISTS saved_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  distance_km numeric NOT NULL CHECK (distance_km > 0),
  elevation_gain_m numeric DEFAULT 0 CHECK (elevation_gain_m >= 0),
  surface_type text CHECK (surface_type IN ('road', 'trail', 'mixed')),
  polyline text,
  summary_polyline text,
  scenic_score numeric DEFAULT 5 CHECK (scenic_score >= 0 AND scenic_score <= 10),
  popularity_score numeric DEFAULT 0 CHECK (popularity_score >= 0 AND popularity_score <= 10),
  strava_segment_id text,
  start_lat numeric CHECK (start_lat >= -90 AND start_lat <= 90),
  start_lon numeric CHECK (start_lon >= -180 AND start_lon <= 180),
  end_lat numeric CHECK (end_lat >= -90 AND end_lat <= 90),
  end_lon numeric CHECK (end_lon >= -180 AND end_lon <= 180),
  tags text[] DEFAULT ARRAY[]::text[],
  source text DEFAULT 'manual' CHECK (source IN ('manual', 'strava', 'imported')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_routes_popularity ON saved_routes(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_saved_routes_distance ON saved_routes(distance_km);
CREATE INDEX IF NOT EXISTS idx_saved_routes_surface ON saved_routes(surface_type);
CREATE INDEX IF NOT EXISTS idx_saved_routes_tags ON saved_routes USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own routes
CREATE POLICY "Users can view own routes"
  ON saved_routes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own routes
CREATE POLICY "Users can insert own routes"
  ON saved_routes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own routes
CREATE POLICY "Users can update own routes"
  ON saved_routes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own routes
CREATE POLICY "Users can delete own routes"
  ON saved_routes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_routes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
DROP TRIGGER IF EXISTS update_saved_routes_updated_at_trigger ON saved_routes;
CREATE TRIGGER update_saved_routes_updated_at_trigger
  BEFORE UPDATE ON saved_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_routes_updated_at();
