/*
  # Add display_name to community_profiles

  1. Changes
    - Add display_name column to community_profiles table
    - Provides a user-friendly name for display in Unity features
    - Defaults to 'Runner' if not set

  2. Updates
    - Fix find_companions function to use cp.display_name
    - Fix get_upcoming_travel_buddies function to use cp.display_name
  
  3. Security
    - Maintains existing RLS policies
    - Display name is public within community context
*/

-- Add display_name column to community_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_profiles' 
    AND column_name = 'display_name'
  ) THEN
    ALTER TABLE community_profiles 
    ADD COLUMN display_name TEXT DEFAULT 'Runner';
  END IF;
END $$;

-- Fix find_companions to use cp.display_name instead of up.display_name
CREATE OR REPLACE FUNCTION find_companions(
  p_user_id UUID,
  p_pace_min NUMERIC DEFAULT NULL,
  p_pace_max NUMERIC DEFAULT NULL,
  p_terrain TEXT DEFAULT NULL,
  p_days TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  bio TEXT,
  pace_min NUMERIC,
  pace_max NUMERIC,
  preferred_terrain TEXT,
  availability_days TEXT[],
  match_type TEXT,
  distance_km NUMERIC,
  match_score NUMERIC,
  last_active_at TIMESTAMPTZ,
  preferred_run_time TEXT[]
) AS $$
DECLARE
  v_user_profile RECORD;
  v_local_count INTEGER;
BEGIN
  SELECT cp.*
  INTO v_user_profile
  FROM community_profiles cp
  WHERE cp.user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  p_pace_min := COALESCE(p_pace_min, v_user_profile.pace_min);
  p_pace_max := COALESCE(p_pace_max, v_user_profile.pace_max);
  p_terrain := COALESCE(p_terrain, v_user_profile.preferred_terrain);
  p_days := COALESCE(p_days, v_user_profile.availability_days);

  IF v_user_profile.location IS NOT NULL
     AND v_user_profile.match_preference IN ('local', 'both') THEN

    RETURN QUERY
    SELECT
      cp.id,
      cp.user_id,
      COALESCE(cp.display_name, 'Runner') as display_name,
      cp.bio,
      cp.pace_min,
      cp.pace_max,
      cp.preferred_terrain,
      cp.availability_days,
      'local'::TEXT as match_type,
      ROUND(ST_Distance(v_user_profile.location, cp.location) / 1000, 1) as distance_km,
      calculate_match_score(
        p_user_id,
        cp.user_id,
        p_pace_min,
        p_pace_max,
        p_terrain,
        p_days,
        ROUND(ST_Distance(v_user_profile.location, cp.location) / 1000, 1)
      ) as match_score,
      cp.last_active_at,
      cp.preferred_run_time
    FROM community_profiles cp
    WHERE cp.user_id != p_user_id
      AND cp.visible = true
      AND cp.looking_for_partner = true
      AND cp.location IS NOT NULL
      AND ST_DWithin(
        v_user_profile.location,
        cp.location,
        v_user_profile.max_distance_km * 1000
      )
      AND (
        p_pace_min IS NULL OR p_pace_max IS NULL OR
        (cp.pace_min IS NOT NULL AND cp.pace_max IS NOT NULL AND
         cp.pace_min <= p_pace_max AND cp.pace_max >= p_pace_min)
      )
      AND (p_terrain IS NULL OR cp.preferred_terrain = p_terrain OR cp.preferred_terrain = 'any')
      AND NOT EXISTS (
        SELECT 1 FROM community_connections cc
        WHERE cc.user_id = p_user_id
          AND cc.partner_id = cp.user_id
          AND cc.status IN ('accepted', 'pending')
      )
    ORDER BY match_score DESC, distance_km ASC
    LIMIT p_limit;

    GET DIAGNOSTICS v_local_count = ROW_COUNT;

    IF v_local_count >= 5 THEN
      RETURN;
    END IF;
  ELSE
    v_local_count := 0;
  END IF;

  IF v_user_profile.match_preference IN ('virtual', 'both') AND
     (p_limit - v_local_count) > 0 THEN

    RETURN QUERY
    SELECT
      cp.id,
      cp.user_id,
      COALESCE(cp.display_name, 'Runner') as display_name,
      cp.bio,
      cp.pace_min,
      cp.pace_max,
      cp.preferred_terrain,
      cp.availability_days,
      'virtual'::TEXT as match_type,
      NULL::NUMERIC as distance_km,
      calculate_match_score(
        p_user_id,
        cp.user_id,
        p_pace_min,
        p_pace_max,
        p_terrain,
        p_days,
        NULL
      ) as match_score,
      cp.last_active_at,
      cp.preferred_run_time
    FROM community_profiles cp
    WHERE cp.user_id != p_user_id
      AND cp.visible = true
      AND cp.looking_for_partner = true
      AND (
        p_pace_min IS NULL OR p_pace_max IS NULL OR
        (cp.pace_min IS NOT NULL AND cp.pace_max IS NOT NULL AND
         cp.pace_min <= p_pace_max AND cp.pace_max >= p_pace_min)
      )
      AND (p_terrain IS NULL OR cp.preferred_terrain = p_terrain OR cp.preferred_terrain = 'any')
      AND NOT EXISTS (
        SELECT 1 FROM community_connections cc
        WHERE cc.user_id = p_user_id
          AND cc.partner_id = cp.user_id
          AND cc.status IN ('accepted', 'pending')
      )
      AND cp.user_id NOT IN (
        SELECT user_id FROM (
          SELECT * FROM find_companions(p_user_id, p_pace_min, p_pace_max, p_terrain, p_days, v_local_count)
        ) local_matches
      )
    ORDER BY match_score DESC
    LIMIT (p_limit - v_local_count);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fix get_upcoming_travel_buddies to use cp.display_name
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
      ul.location
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
          ROUND(ST_Distance(ut.location, cp.location) / 1000, 1)
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
        OR (ul.city = ut.destination)
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
GRANT EXECUTE ON FUNCTION find_companions TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_travel_buddies TO authenticated;
