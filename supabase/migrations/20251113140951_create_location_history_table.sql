/*
  # Create location_history table for location tracking

  1. New Tables
    - `location_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `country` (text)
      - `city` (text)
      - `climate_data` (jsonb) - stores weather/climate information
      - `detected_at` (timestamptz) - when location was detected

  2. Security
    - Enable RLS on `location_history` table
    - Add policies for authenticated users to read and insert their own location data

  3. Performance
    - Index on user_id and detected_at for efficient queries
*/

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

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_location_history_user_time ON location_history(user_id, detected_at DESC);

-- Enable Row Level Security
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

-- Location history policies
CREATE POLICY "Users can view own location history"
  ON location_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location history"
  ON location_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location history"
  ON location_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own location history"
  ON location_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
