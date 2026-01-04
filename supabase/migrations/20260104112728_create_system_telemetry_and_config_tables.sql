/*
  # Multi-Sport Architecture Governance & Observability

  1. New Tables
    - `system_telemetry`
      - Tracks fallback usage and system events
      - Helps identify when database lookups fail
      - Provides metrics for monitoring dashboards
    
    - `system_config`
      - Central configuration store for feature flags
      - Controls Phase 2 multi-sport activation
      - Prevents accidental activation of advanced features

  2. Security
    - Enable RLS on both tables
    - Only authenticated users can read telemetry
    - Only admin operations can modify config (handled at application level)
    
  3. Indexes
    - Performance indexes for common query patterns
    - Time-based queries for telemetry dashboard

  4. Initial Data
    - Seeds system_config with phase_2_enabled = false (Phase 1 mode)
    - Ensures safe default state for multi-sport system
*/

-- System telemetry table for tracking fallback usage and system events
CREATE TABLE IF NOT EXISTS system_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_category text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- System configuration table for feature flags and governance
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Telemetry policies
CREATE POLICY "Users can read own telemetry"
  ON system_telemetry FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own telemetry"
  ON system_telemetry FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Config policies (read-only for users)
CREATE POLICY "Users can read system config"
  ON system_config FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_telemetry_user_created 
  ON system_telemetry(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_telemetry_event_type 
  ON system_telemetry(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_telemetry_category 
  ON system_telemetry(event_category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_config_key 
  ON system_config(config_key);

-- Seed initial configuration with Phase 2 disabled
INSERT INTO system_config (config_key, config_value, description)
VALUES (
  'phase_2_enabled',
  'false'::jsonb,
  'Controls activation of Phase 2 multi-sport weighted contribution factors. When false, system uses Phase 1 binary model.'
)
ON CONFLICT (config_key) DO NOTHING;