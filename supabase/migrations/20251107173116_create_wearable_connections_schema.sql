/*
  # Wearable Connections and Sync System

  ## Overview
  Creates comprehensive schema for multi-provider wearable device integration supporting
  Garmin, Oura, COROS, Suunto, Polar, and Apple HealthKit.

  ## New Tables

  ### 1. `wearable_connections`
  Stores OAuth credentials and connection status for each wearable provider
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `provider` (text) - garmin, oura, coros, suunto, polar, apple
  - `access_token` (text, encrypted) - OAuth access token
  - `refresh_token` (text, encrypted) - OAuth refresh token
  - `token_expires_at` (timestamptz) - Token expiration time
  - `last_sync_at` (timestamptz) - Last successful sync timestamp
  - `connection_status` (text) - connected, disconnected, token_expired, error
  - `profile_name` (text) - User's profile name from provider
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `wearable_sync_history`
  Audit log of all sync attempts with success/failure tracking
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `provider` (text)
  - `sync_started_at` (timestamptz)
  - `sync_completed_at` (timestamptz)
  - `status` (text) - success, failed, partial
  - `error_message` (text)
  - `metrics_synced` (jsonb) - Details of synced metrics

  ### 3. `wearable_raw_metrics`
  Stores unprocessed raw data from each provider for audit and debugging
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `provider` (text)
  - `metric_date` (date)
  - `raw_data` (jsonb) - Full provider response
  - `created_at` (timestamptz)

  ### 4. `provider_priority_settings`
  User-defined priority order for conflict resolution
  - `user_id` (uuid, primary key, references auth.users)
  - `priority_order` (text[]) - Array of provider names in order
  - `auto_sync_enabled` (boolean)
  - `sync_time_window_start` (time)
  - `sync_time_window_end` (time)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own wearable data
  - Tokens stored with encryption where possible

  ## Indexes
  - Composite indexes on user_id + provider for fast lookups
  - Date-based indexes for historical queries
*/

-- Create wearable_connections table
CREATE TABLE IF NOT EXISTS wearable_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('garmin', 'oura', 'coros', 'suunto', 'polar', 'apple')),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  connection_status text NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'token_expired', 'error')),
  profile_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Create wearable_sync_history table
CREATE TABLE IF NOT EXISTS wearable_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  sync_started_at timestamptz DEFAULT now(),
  sync_completed_at timestamptz,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message text,
  metrics_synced jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create wearable_raw_metrics table
CREATE TABLE IF NOT EXISTS wearable_raw_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  metric_date date NOT NULL,
  raw_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider, metric_date)
);

-- Create provider_priority_settings table
CREATE TABLE IF NOT EXISTS provider_priority_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  priority_order text[] NOT NULL DEFAULT ARRAY['garmin', 'oura', 'coros', 'suunto', 'polar', 'apple'],
  auto_sync_enabled boolean DEFAULT true,
  sync_time_window_start time DEFAULT '04:00:00',
  sync_time_window_end time DEFAULT '08:00:00',
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wearable_connections_user_provider ON wearable_connections(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_wearable_connections_last_sync ON wearable_connections(user_id, last_sync_at);
CREATE INDEX IF NOT EXISTS idx_wearable_sync_history_user_date ON wearable_sync_history(user_id, sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_raw_metrics_user_date ON wearable_raw_metrics(user_id, metric_date DESC);

-- Enable Row Level Security
ALTER TABLE wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_raw_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_priority_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wearable_connections
CREATE POLICY "Users can view own wearable connections"
  ON wearable_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wearable connections"
  ON wearable_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wearable connections"
  ON wearable_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wearable connections"
  ON wearable_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for wearable_sync_history
CREATE POLICY "Users can view own sync history"
  ON wearable_sync_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync history"
  ON wearable_sync_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for wearable_raw_metrics
CREATE POLICY "Users can view own raw metrics"
  ON wearable_raw_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own raw metrics"
  ON wearable_raw_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own raw metrics"
  ON wearable_raw_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for provider_priority_settings
CREATE POLICY "Users can view own priority settings"
  ON provider_priority_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own priority settings"
  ON provider_priority_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own priority settings"
  ON provider_priority_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_wearable_connections_updated_at
  BEFORE UPDATE ON wearable_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_priority_settings_updated_at
  BEFORE UPDATE ON provider_priority_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();