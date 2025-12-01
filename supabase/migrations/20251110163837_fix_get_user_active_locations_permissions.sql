/*
  # Fix get_user_active_locations RPC permissions

  1. Changes
    - Grant execute permissions on get_user_active_locations to authenticated users
    - Grant execute permissions on is_location_active helper function
    - Ensure functions are accessible via RPC API
  
  2. Security
    - Functions only return data for the requesting user
    - Maintains RLS security on underlying tables
*/

-- Grant execute permissions on the main function
GRANT EXECUTE ON FUNCTION get_user_active_locations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_locations(UUID) TO anon;

-- Grant execute permissions on the helper function
GRANT EXECUTE ON FUNCTION is_location_active(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION is_location_active(DATE, DATE) TO anon;
