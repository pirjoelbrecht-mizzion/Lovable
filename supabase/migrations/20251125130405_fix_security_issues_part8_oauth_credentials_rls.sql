/*
  # Fix Security Issues - Part 8: OAuth Credentials RLS

  1. Add RLS policies for oauth_client_credentials table
    - Users should NOT be able to view or modify OAuth credentials
    - Only service_role should have access
    - This prevents credential exposure
*/

-- oauth_client_credentials - No user access, service role only
-- These credentials should only be accessible server-side
CREATE POLICY "Service role only" ON oauth_client_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
