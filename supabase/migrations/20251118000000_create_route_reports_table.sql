/*
  # Create Route Reports Table

  1. New Tables
    - `route_reports`
      - `id` (uuid, primary key)
      - `route_id` (uuid, references saved_routes)
      - `reporter_user_id` (uuid, references auth.users)
      - `reason` (text, reason for report)
      - `reported_at` (timestamptz, when report was made)
      - `resolved` (boolean, whether report has been reviewed)
      - `resolved_at` (timestamptz, when report was resolved)
      - `resolved_by` (uuid, admin who resolved it)
      - `created_at` (timestamptz, record creation timestamp)

  2. Security
    - Enable RLS on route_reports table
    - Users can insert reports but only read their own
    - Admins can view and update all reports (future feature)
    - Add unique constraint to prevent duplicate reports

  3. Important Notes
    - When report_count reaches threshold (5), route is auto-hidden
    - Reports are for future admin moderation dashboard
    - Users cannot report the same route twice
*/

-- Create route_reports table
CREATE TABLE IF NOT EXISTS route_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES saved_routes(id) ON DELETE CASCADE NOT NULL,
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text,
  reported_at timestamptz DEFAULT now() NOT NULL,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(route_id, reporter_user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_route_reports_route ON route_reports(route_id);
CREATE INDEX IF NOT EXISTS idx_route_reports_reporter ON route_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_route_reports_unresolved ON route_reports(resolved) WHERE resolved = false;

-- Enable Row Level Security
ALTER TABLE route_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for route_reports
CREATE POLICY "Users can view own reports"
  ON route_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_user_id);

CREATE POLICY "Users can insert reports"
  ON route_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

-- Function to auto-increment report_count on saved_routes
CREATE OR REPLACE FUNCTION increment_route_report_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE saved_routes
  SET report_count = report_count + 1,
      reported = (report_count + 1 >= 5)
  WHERE id = NEW.route_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment report_count
DROP TRIGGER IF EXISTS trigger_increment_route_report_count ON route_reports;
CREATE TRIGGER trigger_increment_route_report_count
  AFTER INSERT ON route_reports
  FOR EACH ROW
  EXECUTE FUNCTION increment_route_report_count();
