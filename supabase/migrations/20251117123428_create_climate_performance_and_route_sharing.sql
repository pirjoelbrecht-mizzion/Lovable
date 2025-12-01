/*
  # Create Climate Performance Tracking and Route Sharing Features

  1. New Tables
    - `climate_performance`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `location` (text, city or region name)
      - `avg_temp` (numeric, average temperature in Celsius)
      - `avg_humidity` (numeric, average relative humidity percentage)
      - `avg_pace` (numeric, average pace in minutes per km)
      - `avg_heart_rate` (numeric, average heart rate in bpm)
      - `sample_count` (integer, number of activities aggregated)
      - `first_recorded` (timestamptz, first activity date)
      - `last_recorded` (timestamptz, most recent activity date)
      - `created_at` (timestamptz, record creation timestamp)
      - `updated_at` (timestamptz, last update timestamp)

    - `notification_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `notification_type` (text, type of notification)
      - `message` (text, notification content)
      - `sent_at` (timestamptz, when notification was sent)

  2. Table Extensions
    - `saved_routes` - Add sharing and moderation columns:
      - `is_public` (boolean, whether route is shared publicly)
      - `shared_by` (uuid, user who shared the route)
      - `shared_at` (timestamptz, when route was shared)
      - `reported` (boolean, whether route has been reported)
      - `report_count` (integer, number of reports)
      - `star_count` (integer, number of stars from users)

    - `user_settings` - Add weather notification preferences:
      - `weather_alerts_enabled` (boolean, opt-in for push notifications)
      - `weather_alert_lead_time_hours` (integer, hours before training to alert)

  3. Security
    - Enable RLS on all new tables
    - Users can read and write their own climate performance data
    - Users can read public routes from any user
    - Users can read their own notification logs
    - Add appropriate indexes for performance

  4. Important Notes
    - Climate performance uses 90-day rolling window for analysis
    - Route sharing is open by default with optional reporting
    - Weather notifications require explicit user opt-in
*/

-- Create climate_performance table
CREATE TABLE IF NOT EXISTS climate_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location text NOT NULL,
  avg_temp numeric,
  avg_humidity numeric,
  avg_pace numeric CHECK (avg_pace >= 0),
  avg_heart_rate numeric CHECK (avg_heart_rate > 0 AND avg_heart_rate < 300),
  sample_count integer DEFAULT 1 CHECK (sample_count > 0),
  first_recorded timestamptz DEFAULT now() NOT NULL,
  last_recorded timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, location)
);

-- Create notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  message text NOT NULL,
  sent_at timestamptz DEFAULT now() NOT NULL
);

-- Add route sharing columns to saved_routes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_routes' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE saved_routes ADD COLUMN is_public boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_routes' AND column_name = 'shared_by'
  ) THEN
    ALTER TABLE saved_routes ADD COLUMN shared_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_routes' AND column_name = 'shared_at'
  ) THEN
    ALTER TABLE saved_routes ADD COLUMN shared_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_routes' AND column_name = 'reported'
  ) THEN
    ALTER TABLE saved_routes ADD COLUMN reported boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_routes' AND column_name = 'report_count'
  ) THEN
    ALTER TABLE saved_routes ADD COLUMN report_count integer DEFAULT 0 CHECK (report_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_routes' AND column_name = 'star_count'
  ) THEN
    ALTER TABLE saved_routes ADD COLUMN star_count integer DEFAULT 0 CHECK (star_count >= 0);
  END IF;
END $$;

-- Create user_settings table if not exists
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  weather_alerts_enabled boolean DEFAULT false,
  weather_alert_lead_time_hours integer DEFAULT 12 CHECK (weather_alert_lead_time_hours > 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add weather alert columns if user_settings already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_settings' AND column_name = 'weather_alerts_enabled'
    ) THEN
      ALTER TABLE user_settings ADD COLUMN weather_alerts_enabled boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_settings' AND column_name = 'weather_alert_lead_time_hours'
    ) THEN
      ALTER TABLE user_settings ADD COLUMN weather_alert_lead_time_hours integer DEFAULT 12 CHECK (weather_alert_lead_time_hours > 0);
    END IF;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_climate_performance_user_location ON climate_performance(user_id, location);
CREATE INDEX IF NOT EXISTS idx_climate_performance_last_recorded ON climate_performance(last_recorded DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_user_sent ON notification_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_routes_public ON saved_routes(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_saved_routes_star_count ON saved_routes(star_count DESC) WHERE is_public = true;

-- Enable Row Level Security
ALTER TABLE climate_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for climate_performance
CREATE POLICY "Users can view own climate performance"
  ON climate_performance FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own climate performance"
  ON climate_performance FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own climate performance"
  ON climate_performance FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own climate performance"
  ON climate_performance FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for notification_log
CREATE POLICY "Users can view own notifications"
  ON notification_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notification_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update existing saved_routes RLS to allow public route viewing
DROP POLICY IF EXISTS "Anyone can view public routes" ON saved_routes;
CREATE POLICY "Users can view public routes or own routes"
  ON saved_routes FOR SELECT
  TO authenticated
  USING (is_public = true OR auth.uid() = user_id);

-- Create trigger for climate_performance updated_at
CREATE OR REPLACE FUNCTION update_climate_performance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_climate_performance_updated_at ON climate_performance;
CREATE TRIGGER trigger_climate_performance_updated_at
  BEFORE UPDATE ON climate_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_climate_performance_updated_at();

-- Create trigger for user_settings updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON user_settings;
CREATE TRIGGER trigger_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();
