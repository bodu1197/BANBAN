-- nearby_artists: Haversine 거리 계산으로 반경 내 아티스트 검색
CREATE OR REPLACE FUNCTION nearby_artists(
  user_lat NUMERIC,
  user_lng NUMERIC,
  max_distance_km INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 30,
  p_type_artist TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  address TEXT,
  lat NUMERIC,
  lon NUMERIC,
  type_artist TEXT,
  likes_count INTEGER,
  profile_image_path TEXT,
  region_name TEXT,
  distance_km NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.address,
    a.lat,
    a.lon,
    a.type_artist::TEXT,
    a.likes_count,
    a.profile_image_path,
    r.name AS region_name,
    (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(user_lat)) * cos(radians(a.lat)) *
        cos(radians(a.lon) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(a.lat))
      ))
    ))::NUMERIC(10,2) AS distance_km
  FROM artists a
  LEFT JOIN regions r ON a.region_id = r.id
  WHERE a.deleted_at IS NULL
    AND a.is_hide = false
    AND a.status = 'active'
    AND a.lat IS NOT NULL
    AND a.lon IS NOT NULL
    AND (p_type_artist IS NULL OR a.type_artist = p_type_artist OR a.type_artist = 'BOTH')
    AND (6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(user_lat)) * cos(radians(a.lat)) *
        cos(radians(a.lon) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(a.lat))
      ))
    )) <= max_distance_km
  ORDER BY distance_km ASC
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION nearby_artists TO anon, authenticated, service_role;

-- 위치 인덱스 (lat/lon이 있는 아티스트만)
CREATE INDEX IF NOT EXISTS idx_artists_location
  ON artists (lat, lon)
  WHERE lat IS NOT NULL AND lon IS NOT NULL AND deleted_at IS NULL;
