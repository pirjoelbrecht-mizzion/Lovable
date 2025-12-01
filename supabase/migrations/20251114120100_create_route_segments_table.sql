/*
  # Create route_segments table for detailed route breakdown

  1. New Tables
    - `route_segments`
      - `id` (uuid, primary key)
      - `route_id` (uuid, foreign key to saved_routes)
      - `order_index` (integer, segment order in route)
      - `segment_name` (text, name of segment)
      - `distance_m` (numeric, segment distance in meters)
      - `elevation_gain_m` (numeric, segment elevation gain)
      - `lat` (numeric array, latitude coordinates)
      - `lon` (numeric array, longitude coordinates)
      - `created_at` (timestamptz, creation timestamp)

  2. Security
    - Enable RLS on `route_segments` table
    - Users can read segments for their own routes
    - Users can insert segments for their own routes
    - Users can update segments for their own routes
    - Users can delete segments for their own routes

  3. Indexes
    - Index on route_id for efficient route lookups
    - Index on order_index for ordered segment retrieval
*/

-- Create route_segments table
CREATE TABLE IF NOT EXISTS route_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES saved_routes(id) ON DELETE CASCADE NOT NULL,
  order_index integer NOT NULL CHECK (order_index >= 0),
  segment_name text,
  distance_m numeric NOT NULL CHECK (distance_m > 0),
  elevation_gain_m numeric DEFAULT 0 CHECK (elevation_gain_m >= 0),
  lat numeric[] DEFAULT ARRAY[]::numeric[],
  lon numeric[] DEFAULT ARRAY[]::numeric[],
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_route_segments_route_id ON route_segments(route_id);
CREATE INDEX IF NOT EXISTS idx_route_segments_order ON route_segments(route_id, order_index);

-- Enable Row Level Security
ALTER TABLE route_segments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view segments for their own routes
CREATE POLICY "Users can view own route segments"
  ON route_segments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_routes
      WHERE saved_routes.id = route_segments.route_id
      AND saved_routes.user_id = auth.uid()
    )
  );

-- Policy: Users can insert segments for their own routes
CREATE POLICY "Users can insert own route segments"
  ON route_segments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saved_routes
      WHERE saved_routes.id = route_segments.route_id
      AND saved_routes.user_id = auth.uid()
    )
  );

-- Policy: Users can update segments for their own routes
CREATE POLICY "Users can update own route segments"
  ON route_segments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_routes
      WHERE saved_routes.id = route_segments.route_id
      AND saved_routes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saved_routes
      WHERE saved_routes.id = route_segments.route_id
      AND saved_routes.user_id = auth.uid()
    )
  );

-- Policy: Users can delete segments for their own routes
CREATE POLICY "Users can delete own route segments"
  ON route_segments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_routes
      WHERE saved_routes.id = route_segments.route_id
      AND saved_routes.user_id = auth.uid()
    )
  );
