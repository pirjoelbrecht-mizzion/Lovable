/*
  # Add Pacing Strategies Table

  1. New Tables
    - `pacing_strategies`
      - `id` (uuid, primary key) - unique identifier for the pacing strategy
      - `user_id` (uuid, foreign key) - references auth.users
      - `race_id` (text) - references the race/event this strategy is for
      - `name` (text) - user-friendly name for the strategy
      - `mode` (text) - either 'manual' or 'auto' indicating how it was created
      - `segments` (jsonb) - array of pacing segments with distance, pace, HR, notes
      - `created_at` (timestamptz) - when the strategy was created
      - `updated_at` (timestamptz) - when the strategy was last updated

  2. Security
    - Enable RLS on `pacing_strategies` table
    - Add policy for users to view their own pacing strategies
    - Add policy for users to insert their own pacing strategies
    - Add policy for users to update their own pacing strategies
    - Add policy for users to delete their own pacing strategies

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on race_id for faster lookups by race
    - Add unique constraint on user_id + race_id (one strategy per race per user)
*/

CREATE TABLE IF NOT EXISTS pacing_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  race_id text NOT NULL,
  name text NOT NULL,
  mode text CHECK (mode IN ('manual', 'auto')) DEFAULT 'manual',
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, race_id)
);

ALTER TABLE pacing_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pacing strategies"
  ON pacing_strategies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pacing strategies"
  ON pacing_strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pacing strategies"
  ON pacing_strategies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pacing strategies"
  ON pacing_strategies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pacing_strategies_user_id ON pacing_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_pacing_strategies_race_id ON pacing_strategies(race_id);
