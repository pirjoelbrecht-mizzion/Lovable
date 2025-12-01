/*
  # Fix find_companions Ambiguous Column Reference

  1. Issue
    - The virtual matches section has ambiguous user_id reference
    - Subquery returns multiple columns, need to specify which user_id
  
  2. Fix
    - Change "SELECT user_id FROM" to "SELECT local_matches.user_id FROM"
    - Ensures we're explicitly referencing the subquery alias
*/

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
        SELECT local_matches.user_id FROM (
          SELECT fc.* FROM find_companions(p_user_id, p_pace_min, p_pace_max, p_terrain, p_days, v_local_count) fc
        ) local_matches
      )
    ORDER BY match_score DESC
    LIMIT (p_limit - v_local_count);
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION find_companions TO authenticated;
