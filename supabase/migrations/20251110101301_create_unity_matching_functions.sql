-- Main companion matching function with hybrid local/virtual logic
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
  SELECT cp.*, up.name
  INTO v_user_profile
  FROM community_profiles cp
  LEFT JOIN user_profiles up ON cp.user_id = up.user_id
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
      COALESCE(up.name, 'Runner') as display_name,
      cp.bio,
      cp.pace_min,
      cp.pace_max,
      cp.preferred_terrain,
      cp.availability_days,
      'local'::TEXT as match_type,
      ROUND(
        ST_Distance(
          cp.location::geography,
          v_user_profile.location::geography
        ) / 1000, 1
      ) as distance_km,
      (
        CASE
          WHEN cp.pace_min IS NULL OR cp.pace_max IS NULL
            OR p_pace_min IS NULL OR p_pace_max IS NULL THEN 20
          WHEN cp.pace_max >= p_pace_min AND cp.pace_min <= p_pace_max THEN 40
          ELSE GREATEST(0, 40 - ABS(cp.pace_min - p_pace_min) * 5)
        END +
        CASE
          WHEN p_days IS NULL OR cp.availability_days IS NULL THEN 15
          WHEN cp.availability_days && p_days THEN 30
          ELSE 0
        END +
        CASE
          WHEN p_terrain IS NULL THEN 10
          WHEN cp.preferred_terrain = p_terrain THEN 20
          WHEN cp.preferred_terrain = 'mixed' OR p_terrain = 'mixed' THEN 10
          ELSE 0
        END +
        CASE
          WHEN ST_Distance(
            cp.location::geography,
            v_user_profile.location::geography
          ) / 1000 <= 5 THEN 10
          WHEN ST_Distance(
            cp.location::geography,
            v_user_profile.location::geography
          ) / 1000 <= 15 THEN 7
          WHEN ST_Distance(
            cp.location::geography,
            v_user_profile.location::geography
          ) / 1000 <= 25 THEN 5
          ELSE 2
        END
      ) as match_score,
      cp.last_active_at,
      cp.preferred_run_time
    FROM community_profiles cp
    LEFT JOIN user_profiles up ON cp.user_id = up.user_id
    WHERE cp.user_id != p_user_id
      AND cp.visible = true
      AND cp.looking_for_partner = true
      AND cp.location IS NOT NULL
      AND ST_DWithin(
        cp.location::geography,
        v_user_profile.location::geography,
        (v_user_profile.max_distance_km * 1000)::double precision
      )
      AND (p_pace_min IS NULL OR cp.pace_max IS NULL OR cp.pace_max >= p_pace_min)
      AND (p_pace_max IS NULL OR cp.pace_min IS NULL OR cp.pace_min <= p_pace_max)
      AND (p_terrain IS NULL OR cp.preferred_terrain = p_terrain OR cp.preferred_terrain = 'mixed')
      AND (p_days IS NULL OR cp.availability_days && p_days)
    ORDER BY match_score DESC, distance_km ASC, cp.last_active_at DESC
    LIMIT p_limit;

    GET DIAGNOSTICS v_local_count = ROW_COUNT;
  ELSE
    v_local_count := 0;
  END IF;

  IF v_local_count < 5 AND v_user_profile.match_preference IN ('virtual', 'both') THEN
    RETURN QUERY
    SELECT
      cp.id,
      cp.user_id,
      COALESCE(up.name, 'Runner') as display_name,
      cp.bio,
      cp.pace_min,
      cp.pace_max,
      cp.preferred_terrain,
      cp.availability_days,
      'virtual'::TEXT as match_type,
      NULL::NUMERIC as distance_km,
      (
        CASE
          WHEN cp.pace_min IS NULL OR cp.pace_max IS NULL
            OR p_pace_min IS NULL OR p_pace_max IS NULL THEN 25
          WHEN cp.pace_max >= p_pace_min AND cp.pace_min <= p_pace_max THEN 50
          ELSE GREATEST(0, 50 - ABS(cp.pace_min - p_pace_min) * 6)
        END +
        CASE
          WHEN p_days IS NULL OR cp.availability_days IS NULL THEN 15
          WHEN cp.availability_days && p_days THEN 30
          ELSE 0
        END +
        CASE
          WHEN p_terrain IS NULL THEN 10
          WHEN cp.preferred_terrain = p_terrain THEN 20
          WHEN cp.preferred_terrain = 'mixed' OR p_terrain = 'mixed' THEN 10
          ELSE 0
        END
      ) as match_score,
      cp.last_active_at,
      cp.preferred_run_time
    FROM community_profiles cp
    LEFT JOIN user_profiles up ON cp.user_id = up.user_id
    WHERE cp.user_id != p_user_id
      AND cp.visible = true
      AND cp.looking_for_partner = true
      AND (v_user_profile.location IS NULL
           OR cp.location IS NULL
           OR NOT ST_DWithin(
             cp.location::geography,
             v_user_profile.location::geography,
             (v_user_profile.max_distance_km * 1000)::double precision
           ))
      AND (p_pace_min IS NULL OR cp.pace_max IS NULL OR cp.pace_max >= p_pace_min)
      AND (p_pace_max IS NULL OR cp.pace_min IS NULL OR cp.pace_min <= p_pace_max)
      AND (p_terrain IS NULL OR cp.preferred_terrain = p_terrain OR cp.preferred_terrain = 'mixed')
      AND (p_days IS NULL OR cp.availability_days && p_days)
    ORDER BY match_score DESC, cp.last_active_at DESC
    LIMIT (p_limit - v_local_count);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_pending_connection_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM community_connections
    WHERE partner_id = p_user_id
      AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION accept_connection_request(
  p_connection_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_connection RECORD;
BEGIN
  SELECT * INTO v_connection
  FROM community_connections
  WHERE id = p_connection_id
    AND partner_id = p_user_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE community_connections
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = p_connection_id;

  INSERT INTO community_connections (user_id, partner_id, status, connection_type, accepted_at)
  VALUES (p_user_id, v_connection.user_id, 'accepted', v_connection.connection_type, now())
  ON CONFLICT (user_id, partner_id) DO UPDATE
  SET status = 'accepted',
      accepted_at = now();

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_mutual_training_days(
  p_user_id UUID,
  p_partner_id UUID
)
RETURNS TEXT[] AS $$
DECLARE
  v_user_days TEXT[];
  v_partner_days TEXT[];
BEGIN
  SELECT availability_days INTO v_user_days
  FROM community_profiles
  WHERE user_id = p_user_id;

  SELECT availability_days INTO v_partner_days
  FROM community_profiles
  WHERE user_id = p_partner_id;

  RETURN ARRAY(
    SELECT UNNEST(v_user_days)
    INTERSECT
    SELECT UNNEST(v_partner_days)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_community_last_active(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE community_profiles
  SET last_active_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_community_stats(p_user_id UUID)
RETURNS TABLE (
  total_connections INTEGER,
  total_runs INTEGER,
  total_km NUMERIC,
  active_invites INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cc.partner_id)::INTEGER as total_connections,
    COALESCE(SUM(cc.runs_together), 0)::INTEGER as total_runs,
    COALESCE(SUM(cc.total_km_together), 0)::NUMERIC as total_km,
    (SELECT COUNT(*)::INTEGER
     FROM run_invites
     WHERE recipient_id = p_user_id
       AND status = 'pending'
       AND expires_at > now()
    ) as active_invites
  FROM community_connections cc
  WHERE cc.user_id = p_user_id
    AND cc.status = 'accepted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION find_companions TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_connection_count TO authenticated;
GRANT EXECUTE ON FUNCTION accept_connection_request TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_training_days TO authenticated;
GRANT EXECUTE ON FUNCTION update_community_last_active TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_stats TO authenticated;