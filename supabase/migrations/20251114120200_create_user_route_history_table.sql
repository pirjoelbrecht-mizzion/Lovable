/*
  # Create user_route_history table for tracking completed routes

  1. New Tables
    - `user_route_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `route_id` (uuid, foreign key to saved_routes, nullable)
      - `date_completed` (timestamptz, completion date)
      - `distance_km` (numeric, actual distance covered)
      - `duration_min` (numeric, actual duration in minutes)
      - `elevation_gain_m` (numeric, actual elevation gain)
      - `conditions` (text, weather/terrain conditions)
      - `performance_score` (numeric, 0-10 performance rating)
      - `notes` (text, user notes)
      - `created_at` (timestamptz, creation timestamp)

  2. Security
    - Enable RLS on `user_route_history` table
    - Users can read their own route history
    - Users can insert their own route history
    - Users can update their own route history
    - Users can delete their own route history

  3. Indexes
    - Index on user_id for efficient user queries
    - Index on route_id for route performance tracking
    - Index on date_completed for chronological queries
*/

-- Create user_route_history table
CREATE TABLE IF NOT EXISTS user_route_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  route_id uuid REFERENCES saved_routes(id) ON DELETE SET NULL,
  date_completed timestamptz NOT NULL,
  distance_km numeric NOT NULL CHECK (distance_km > 0),
  duration_min numeric NOT NULL CHECK (duration_min > 0),
  elevation_gain_m numeric DEFAULT 0 CHECK (elevation_gain_m >= 0),
  conditions text,
  performance_score numeric CHECK (performance_score >= 0 AND performance_score <= 10),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_route_history_user_id ON user_route_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_route_history_route_id ON user_route_history(route_id);
CREATE INDEX IF NOT EXISTS idx_user_route_history_date ON user_route_history(user_id, date_completed DESC);

-- Enable Row Level Security
ALTER TABLE user_route_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own route history
CREATE POLICY "Users can view own route history"
  ON user_route_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own route history
CREATE POLICY "Users can insert own route history"
  ON user_route_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own route history
CREATE POLICY "Users can update own route history"
  ON user_route_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own route history
CREATE POLICY "Users can delete own route history"
  ON user_route_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
