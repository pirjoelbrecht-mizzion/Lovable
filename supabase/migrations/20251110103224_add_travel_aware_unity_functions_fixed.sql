/*
  # Travel-Aware Unity Matching Functions

  ## Overview
  RPC functions for multi-location companion matching with travel awareness,
  availability slot management, and intelligent location-based recommendations.

  ## New Functions

  ### get_user_active_locations
  - Returns all active locations for a user (current + upcoming travel)

  ### find_companions_multi_location
  - Enhanced companion matching across multiple locations
  - Returns matches grouped by location context

  ### check_availability_overlap
  - Checks if two users have overlapping availability

  ### get_upcoming_travel_buddies
  - Finds potential running buddies at upcoming travel destinations

  ### upsert_availability_slot
  - CRUD operations for availability slots

  ### get_user_availability
  - Retrieves user's availability slots
*/

-- Get all active locations for a user
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
        ROUND(ST_Distance(cp.home_location, ul.location) / 1000, 1)
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

-- Check availability overlap between two users
CREATE OR REPLACE FUNCTION check_availability_overlap(
  p_user1_id UUID,
  p_user2_id UUID,
  p_location_id UUID DEFAULT NULL,
  p_date_range_start DATE DEFAULT NULL,
  p_date_range_end DATE DEFAULT NULL
)
RETURNS TABLE (
  has_overlap BOOLEAN,
  matching_days TEXT[],
  matching_times TEXT[],
  overlap_details JSONB
) AS $$
DECLARE
  overlap_found BOOLEAN := false;
  matching_days_arr TEXT[] := '{}';
  matching_times_arr TEXT[] := '{}';
  details JSONB := '[]'::jsonb;
BEGIN
  WITH user1_recurring AS (
    SELECT day_of_week, time_start, time_end
    FROM availability_slots
    WHERE user_id = p_user1_id 
      AND is_recurring = true 
      AND is_active = true
      AND (p_location_id IS NULL OR location_id = p_location_id)
  ),
  user2_recurring AS (
    SELECT day_of_week, time_start, time_end
    FROM availability_slots
    WHERE user_id = p_user2_id 
      AND is_recurring = true 
      AND is_active = true
      AND (p_location_id IS NULL OR location_id = p_location_id)
  ),
  time_overlaps AS (
    SELECT DISTINCT
      u1.day_of_week,
      u1.time_start,
      u1.time_end,
      u2.time_start as u2_start,
      u2.time_end as u2_end
    FROM user1_recurring u1
    JOIN user2_recurring u2 ON u1.day_of_week = u2.day_of_week
    WHERE u1.time_start < u2.time_end AND u1.time_end > u2.time_start
  )
  SELECT 
    COUNT(*) > 0,
    ARRAY_AGG(DISTINCT day_of_week),
    ARRAY_AGG(DISTINCT time_start::TEXT || '-' || time_end::TEXT)
  INTO overlap_found, matching_days_arr, matching_times_arr
  FROM time_overlaps;

  SELECT jsonb_agg(
    jsonb_build_object(
      'day', day_of_week,
      'time_range', time_start::TEXT || '-' || time_end::TEXT
    )
  ) INTO details
  FROM (
    SELECT DISTINCT day_of_week, time_start, time_end
    FROM availability_slots
    WHERE user_id IN (p_user1_id, p_user2_id)
      AND is_recurring = true
      AND is_active = true
      AND (p_location_id IS NULL OR location_id = p_location_id)
  ) slots;

  RETURN QUERY SELECT 
    overlap_found,
    matching_days_arr,
    matching_times_arr,
    COALESCE(details, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- Get upcoming travel buddies
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
      AND ul.is_active = true
      AND ul.start_date > CURRENT_DATE
      AND ul.start_date <= CURRENT_DATE + p_days_ahead
  ),
  matches_per_location AS (
    SELECT 
      ut.id as travel_id,
      ut.destination,
      ut.start_date,
      ut.end_date,
      COUNT(DISTINCT cp.user_id) as buddy_count,
      jsonb_agg(
        jsonb_build_object(
          'user_id', cp.user_id,
          'display_name', COALESCE(up.display_name, 'Runner'),
          'pace_range', cp.pace_min || '-' || cp.pace_max,
          'terrain', cp.preferred_terrain
        )
      ) as matches
    FROM upcoming_travel ut
    LEFT JOIN user_locations ul ON 
      ul.is_active = true AND
      ST_DWithin(ut.location, ul.location, 25000) AND
      (ul.start_date IS NULL OR ul.end_date IS NULL OR
       (ul.start_date <= ut.end_date AND ul.end_date >= ut.start_date))
    LEFT JOIN community_profiles cp ON cp.user_id = ul.user_id
    LEFT JOIN user_profiles up ON up.user_id = cp.user_id
    WHERE cp.user_id != p_user_id
      AND cp.visible = true
      AND cp.looking_for_partner = true
    GROUP BY ut.id, ut.destination, ut.start_date, ut.end_date
  )
  SELECT 
    travel_id,
    destination,
    start_date,
    end_date,
    COALESCE(buddy_count, 0)::INTEGER,
    COALESCE(matches, '[]'::jsonb)
  FROM matches_per_location
  WHERE buddy_count > 0
  ORDER BY start_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Upsert availability slot
CREATE OR REPLACE FUNCTION upsert_availability_slot(
  p_user_id UUID,
  p_slot_id UUID DEFAULT NULL,
  p_day_of_week TEXT DEFAULT NULL,
  p_time_start TIME DEFAULT NULL,
  p_time_end TIME DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_is_recurring BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
  slot_id UUID;
BEGIN
  IF p_slot_id IS NOT NULL THEN
    UPDATE availability_slots
    SET 
      day_of_week = COALESCE(p_day_of_week, day_of_week),
      time_start = COALESCE(p_time_start, time_start),
      time_end = COALESCE(p_time_end, time_end),
      start_date = COALESCE(p_start_date, start_date),
      end_date = COALESCE(p_end_date, end_date),
      location_id = COALESCE(p_location_id, location_id),
      is_recurring = COALESCE(p_is_recurring, is_recurring),
      updated_at = now()
    WHERE id = p_slot_id AND user_id = p_user_id
    RETURNING id INTO slot_id;
  ELSE
    INSERT INTO availability_slots (
      user_id,
      day_of_week,
      time_start,
      time_end,
      start_date,
      end_date,
      location_id,
      is_recurring
    ) VALUES (
      p_user_id,
      p_day_of_week,
      p_time_start,
      p_time_end,
      p_start_date,
      p_end_date,
      p_location_id,
      p_is_recurring
    )
    RETURNING id INTO slot_id;
  END IF;
  
  RETURN slot_id;
END;
$$ LANGUAGE plpgsql;

-- Get user availability
CREATE OR REPLACE FUNCTION get_user_availability(
  p_user_id UUID,
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  day_of_week TEXT,
  time_start TIME,
  time_end TIME,
  start_date DATE,
  end_date DATE,
  location_label TEXT,
  is_recurring BOOLEAN,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a_slot.id,
    a_slot.day_of_week,
    a_slot.time_start,
    a_slot.time_end,
    a_slot.start_date,
    a_slot.end_date,
    ul.location_label,
    a_slot.is_recurring,
    a_slot.is_active
  FROM availability_slots a_slot
  LEFT JOIN user_locations ul ON ul.id = a_slot.location_id
  WHERE a_slot.user_id = p_user_id
    AND a_slot.is_active = true
    AND (p_location_id IS NULL OR a_slot.location_id = p_location_id)
  ORDER BY 
    a_slot.is_recurring DESC,
    a_slot.start_date NULLS LAST,
    a_slot.day_of_week,
    a_slot.time_start;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_active_locations IS 'Returns active and upcoming locations for user';
COMMENT ON FUNCTION check_availability_overlap IS 'Checks availability overlap between two users';
COMMENT ON FUNCTION get_upcoming_travel_buddies IS 'Finds running buddies at upcoming travel destinations';
COMMENT ON FUNCTION upsert_availability_slot IS 'Create or update availability slot';
