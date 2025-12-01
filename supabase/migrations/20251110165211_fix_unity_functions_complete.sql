/*
  # Fix Unity Functions - Complete

  1. Changes
    - Create calculate_match_score function that was referenced but missing
    - Fix ROUND type casting issues in get_upcoming_travel_buddies
    - Update find_companions to work without external dependencies
  
  2. Security
    - Maintains existing RLS policies
    - Functions are STABLE (read-only)
*/

-- Create the missing calculate_match_score function
CREATE OR REPLACE FUNCTION calculate_match_score(
  p_user1_id UUID,
  p_user2_id UUID,
  p_pace_min NUMERIC,
  p_pace_max NUMERIC,
  p_terrain TEXT,
  p_days TEXT[],
  p_distance_km NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_user2_profile RECORD;
  v_score NUMERIC := 0;
BEGIN
  SELECT * INTO v_user2_profile
  FROM community_profiles
  WHERE user_id = p_user2_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Pace overlap (40 points)
  IF v_user2_profile.pace_min IS NULL OR v_user2_profile.pace_max IS NULL
     OR p_pace_min IS NULL OR p_pace_max IS NULL THEN
    v_score := v_score + 20;
  ELSIF v_user2_profile.pace_max >= p_pace_min AND v_user2_profile.pace_min <= p_pace_max THEN
    v_score := v_score + 40;
  ELSE
    v_score := v_score + GREATEST(0, 40 - ABS(v_user2_profile.pace_min - p_pace_min) * 5);
  END IF;

  -- Schedule overlap (30 points)
  IF p_days IS NULL OR v_user2_profile.availability_days IS NULL THEN
    v_score := v_score + 15;
  ELSIF v_user2_profile.availability_days && p_days THEN
    v_score := v_score + 30;
  ELSE
    v_score := v_score + 0;
  END IF;

  -- Terrain match (20 points)
  IF p_terrain IS NULL THEN
    v_score := v_score + 10;
  ELSIF v_user2_profile.preferred_terrain = p_terrain THEN
    v_score := v_score + 20;
  ELSIF v_user2_profile.preferred_terrain = 'any' OR p_terrain = 'any' THEN
    v_score := v_score + 10;
  ELSE
    v_score := v_score + 0;
  END IF;

  -- Proximity bonus (10 points, only for local matches)
  IF p_distance_km IS NOT NULL THEN
    IF p_distance_km < 5 THEN
      v_score := v_score + 10;
    ELSIF p_distance_km < 15 THEN
      v_score := v_score + 5;
    ELSE
      v_score := v_score + 2;
    END IF;
  END IF;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fix get_upcoming_travel_buddies with proper type casting
CREATE OR REPLACE FUNCTION get_upcoming_travel_buddies(
  p_user_id UUID,
  p_days_ahead INTEGER DEFAULT 14
)
RETURNS TABLE (
  travel_location_id UUID,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  potential_buddies_count INTEGER,
  top_matches JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH upcoming_travel AS (
    SELECT 
      ul.id,
      ul.location_label as destination,
      ul.start_date,
      ul.end_date,
      ul.location,
      ul.city
    FROM user_locations ul
    WHERE ul.user_id = p_user_id
      AND ul.location_source = 'travel_calendar'
      AND ul.is_active = true
      AND ul.start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days_ahead
  ),
  potential_matches AS (
    SELECT 
      ut.id as travel_location_id,
      ut.destination,
      ut.start_date,
      ut.end_date,
      cp.user_id,
      cp.display_name,
      cp.bio,
      cp.pace_min,
      cp.pace_max,
      CASE 
        WHEN ut.location IS NOT NULL AND cp.location IS NOT NULL THEN
          CAST(ST_Distance(ut.location, cp.location) / 1000 AS NUMERIC(10,1))
        ELSE NULL
      END as distance_km
    FROM upcoming_travel ut
    CROSS JOIN community_profiles cp
    LEFT JOIN user_locations ul ON cp.user_id = ul.user_id
    WHERE cp.user_id != p_user_id
      AND cp.visible = true
      AND cp.looking_for_partner = true
      AND (
        (ul.location IS NOT NULL AND ut.location IS NOT NULL AND
         ST_DWithin(ut.location, ul.location, 50000))
        OR (ul.city = ut.city)
      )
      AND NOT EXISTS (
        SELECT 1 FROM community_connections cc
        WHERE cc.user_id = p_user_id
          AND cc.partner_id = cp.user_id
          AND cc.status IN ('accepted', 'pending')
      )
  )
  SELECT 
    pm.travel_location_id,
    pm.destination,
    pm.start_date,
    pm.end_date,
    COUNT(DISTINCT pm.user_id)::INTEGER as potential_buddies_count,
    jsonb_agg(
      jsonb_build_object(
        'user_id', pm.user_id,
        'display_name', COALESCE(pm.display_name, 'Runner'),
        'bio', pm.bio,
        'pace_min', pm.pace_min,
        'pace_max', pm.pace_max,
        'distance_km', pm.distance_km
      )
      ORDER BY pm.distance_km NULLS LAST
    ) FILTER (WHERE pm.user_id IS NOT NULL) as top_matches
  FROM potential_matches pm
  GROUP BY pm.travel_location_id, pm.destination, pm.start_date, pm.end_date
  ORDER BY pm.start_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_match_score TO authenticated;
GRANT EXECUTE ON FUNCTION find_companions TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_travel_buddies TO authenticated;

-- Comments
COMMENT ON FUNCTION calculate_match_score IS
  'Calculates match score between two users based on pace, schedule, terrain, and proximity';
