/*
  # Create Activity Streams Table for Detailed GPS Data

  1. New Tables
    - `activity_streams`
      - `id` (uuid, primary key)
      - `log_entry_id` (uuid, foreign key to log_entries)
      - `user_id` (uuid, foreign key to auth.users)
      - `stream_type` (text) - e.g., 'latlng', 'altitude', 'time', 'distance', 'heartrate', 'cadence', 'watts', 'temp'
      - `data` (jsonb) - Array of stream data points
      - `original_size` (integer) - Number of data points
      - `resolution` (text) - 'low', 'medium', 'high'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `activity_streams` table
    - Add policies for authenticated users to read their own stream data
    - Add policies for users to insert their own stream data

  3. Indexes
    - Index on log_entry_id for fast lookups
    - Index on user_id + log_entry_id + stream_type for unique constraints
*/

-- Create activity_streams table
CREATE TABLE IF NOT EXISTS activity_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_entry_id uuid NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_type text NOT NULL CHECK (stream_type IN ('latlng', 'altitude', 'time', 'distance', 'heartrate', 'cadence', 'watts', 'temp', 'velocity_smooth', 'grade_smooth')),
  data jsonb NOT NULL,
  original_size integer NOT NULL DEFAULT 0,
  resolution text DEFAULT 'high' CHECK (resolution IN ('low', 'medium', 'high')),
  created_at timestamptz DEFAULT now(),

  -- Ensure one stream type per activity
  UNIQUE(log_entry_id, stream_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_streams_log_entry
  ON activity_streams(log_entry_id);

CREATE INDEX IF NOT EXISTS idx_activity_streams_user_activity
  ON activity_streams(user_id, log_entry_id);

CREATE INDEX IF NOT EXISTS idx_activity_streams_type
  ON activity_streams(log_entry_id, stream_type);

-- Enable RLS
ALTER TABLE activity_streams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own activity streams"
  ON activity_streams FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity streams"
  ON activity_streams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity streams"
  ON activity_streams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity streams"
  ON activity_streams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE activity_streams IS 'Stores detailed GPS and sensor streams from Strava activities';
COMMENT ON COLUMN activity_streams.stream_type IS 'Type of stream: latlng, altitude, time, distance, heartrate, cadence, watts, temp, velocity_smooth, grade_smooth';
COMMENT ON COLUMN activity_streams.data IS 'Array of stream data points in JSONB format';
COMMENT ON COLUMN activity_streams.original_size IS 'Original number of data points before any compression';
COMMENT ON COLUMN activity_streams.resolution IS 'Stream resolution: low, medium, or high';
