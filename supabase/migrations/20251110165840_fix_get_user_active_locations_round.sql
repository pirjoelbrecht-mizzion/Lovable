/*
  # Fix get_user_active_locations ROUND Type Casting

  1. Issue
    - ROUND(double precision, integer) type mismatch
    - ST_Distance returns double precision, need to cast properly
  
  2. Fix
    - Use CAST(... AS NUMERIC(10,1)) instead of ROUND
*/

CREATE OR REPLACE FUNCTION get_user_active_locations(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  location_label TEXT,
  city TEXT,
  country TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN,
  location_source TEXT,
  distance_from_home_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.id,
    ul.location_label,
    ul.city,
    ul.country,
    ul.start_date,
    ul.end_date,
    is_location_active(ul.start_date, ul.end_date) as is_current,
    ul.location_source,
    CASE 
      WHEN cp.home_location IS NOT NULL AND ul.location IS NOT NULL THEN
        CAST(ST_Distance(cp.home_location, ul.location) / 1000 AS NUMERIC(10,1))
      ELSE NULL
    END as distance_from_home_km
  FROM user_locations ul
  LEFT JOIN community_profiles cp ON cp.user_id = ul.user_id
  WHERE ul.user_id = p_user_id
    AND ul.is_active = true
    AND (
      ul.end_date IS NULL OR 
      ul.end_date >= CURRENT_DATE
    )
  ORDER BY 
    CASE WHEN is_location_active(ul.start_date, ul.end_date) THEN 0 ELSE 1 END,
    ul.start_date NULLS FIRST;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_user_active_locations TO authenticated;
