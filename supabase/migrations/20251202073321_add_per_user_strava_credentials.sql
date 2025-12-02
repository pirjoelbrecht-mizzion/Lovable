/*
  # Add Per-User Strava API Credentials Support

  ## Overview
  Allows specific users to use their own Strava OAuth app credentials
  instead of the shared application credentials.

  ## Changes
  1. **Alter oauth_client_credentials table**
     - Add optional user_id column
     - Update unique constraint to allow per-user credentials
     - Keep backward compatibility with provider-level credentials (user_id = NULL)

  2. **Update refresh_strava_token function**
     - Check for user-specific credentials first
     - Fall back to provider-level credentials if not found
     - Maintain existing behavior for users without custom credentials

  ## Security
  - RLS remains enabled (service role only access)
  - Users can only access their own credentials through the function
  - No direct user access to oauth_client_credentials table

  ## Usage
  To add custom credentials for a specific user:

  ```sql
  INSERT INTO oauth_client_credentials (provider, user_id, client_id, client_secret)
  VALUES ('strava', 'user-uuid-here', 'your_client_id', 'your_client_secret');
  ```
*/

-- Add user_id column to oauth_client_credentials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_client_credentials'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE oauth_client_credentials
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop old unique constraint and create new one
ALTER TABLE oauth_client_credentials
DROP CONSTRAINT IF EXISTS oauth_client_credentials_provider_key;

-- New unique constraint: provider + user_id (allows one per provider globally, and one per user per provider)
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_client_credentials_unique
ON oauth_client_credentials(provider, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Add index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_oauth_client_credentials_user_id
ON oauth_client_credentials(user_id) WHERE user_id IS NOT NULL;

-- Update refresh_strava_token function to support per-user credentials
CREATE OR REPLACE FUNCTION refresh_strava_token(connection_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_refresh_token text;
  v_client_id text;
  v_client_secret text;
  v_user_id uuid;
  v_response jsonb;
BEGIN
  -- Get connection details and user ID
  SELECT wc.refresh_token, wc.user_id
  INTO v_refresh_token, v_user_id
  FROM wearable_connections wc
  WHERE wc.id = connection_id
    AND wc.provider = 'strava'
    AND wc.user_id = auth.uid();

  -- Validate we found the connection and it belongs to the user
  IF v_refresh_token IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Connection not found or unauthorized'
    );
  END IF;

  -- First, try to get user-specific credentials
  SELECT occ.client_id, occ.client_secret
  INTO v_client_id, v_client_secret
  FROM oauth_client_credentials occ
  WHERE occ.provider = 'strava'
    AND occ.user_id = v_user_id;

  -- If no user-specific credentials, fall back to provider-level credentials
  IF v_client_id IS NULL THEN
    SELECT occ.client_id, occ.client_secret
    INTO v_client_id, v_client_secret
    FROM oauth_client_credentials occ
    WHERE occ.provider = 'strava'
      AND occ.user_id IS NULL;
  END IF;

  -- Validate client credentials exist
  IF v_client_id IS NULL OR v_client_secret IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OAuth credentials not configured for Strava'
    );
  END IF;

  -- Return credentials for Edge Function to use
  RETURN jsonb_build_object(
    'success', true,
    'client_id', v_client_id,
    'client_secret', v_client_secret,
    'refresh_token', v_refresh_token
  );
END;
$$;

COMMENT ON COLUMN oauth_client_credentials.user_id IS
  'Optional user ID for per-user OAuth credentials. If NULL, credentials are used globally for all users.';
