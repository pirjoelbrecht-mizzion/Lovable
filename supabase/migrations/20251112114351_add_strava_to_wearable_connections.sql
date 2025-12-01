/*
  # Add Strava Support to Wearable Connections

  ## Changes
  1. Updates the wearable_connections provider enum to include 'strava'
  2. Updates the default priority order in provider_priority_settings to include 'strava'

  ## Security
  - No changes to RLS policies (existing policies apply to all providers)
*/

-- Drop the existing constraint and add a new one that includes strava
ALTER TABLE wearable_connections 
  DROP CONSTRAINT IF EXISTS wearable_connections_provider_check;

ALTER TABLE wearable_connections
  ADD CONSTRAINT wearable_connections_provider_check 
  CHECK (provider IN ('garmin', 'oura', 'coros', 'suunto', 'polar', 'apple', 'strava'));

-- Update the default priority order to include strava
ALTER TABLE provider_priority_settings 
  ALTER COLUMN priority_order SET DEFAULT ARRAY['strava', 'garmin', 'oura', 'coros', 'suunto', 'polar', 'apple'];
