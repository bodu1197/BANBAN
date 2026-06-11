-- 공개 리스트 RPC 4종에 pending/rejected 차단 게이트 추가 (P1, defense-in-depth)
-- 이 함수들은 SECURITY INVOKER 라 anon 호출 시 RLS(approved_at IS NOT NULL)가 이미 막지만,
-- service_role(admin client) 호출 시 RLS 우회되므로 함수 본문에 명시 게이트를 둔다.
-- approved_at IS NOT NULL = 승인 완료(active+dormant) 포함, pending/rejected 제외 → 휴면 노출은 유지(무회귀).

CREATE OR REPLACE FUNCTION public.get_popular_artists_with_portfolio(p_type_artist text, p_limit integer DEFAULT 18)
 RETURNS TABLE(id uuid, title text, description text, introduce text, address text, likes_count integer, lat double precision, lon double precision, type_artist text, profile_image_path text, region_name text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
        SELECT a.id, a.title, a.description, a.introduce, a.address, a.likes_count, a.lat, a.lon,
               a.type_artist::text, a.profile_image_path, r.name AS region_name
        FROM artists a
        LEFT JOIN regions r ON a.region_id = r.id
        WHERE a.deleted_at IS NULL AND a.is_hide = false AND a.portfolio_media_count >= 5
          AND a.approved_at IS NOT NULL
          AND (a.type_artist::text = p_type_artist OR a.type_artist::text = 'BOTH')
        ORDER BY a.likes_count DESC LIMIT p_limit;
      $function$;

CREATE OR REPLACE FUNCTION public.get_recommendation_artist_ids(p_type_artist text)
 RETURNS TABLE(artist_id uuid)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT a.id AS artist_id
  FROM artists a
  WHERE a.deleted_at IS NULL
    AND a.is_hide = false
    AND a.approved_at IS NOT NULL
    AND a.portfolio_media_count >= 5
    AND (a.type_artist::text = p_type_artist OR a.type_artist::text = 'BOTH')
  LIMIT 100;
$function$;

CREATE OR REPLACE FUNCTION public.search_portfolios_by_category_ids(p_category_ids uuid[], p_type_artist text DEFAULT NULL::text, p_region_ids uuid[] DEFAULT NULL::uuid[], p_type_sex text DEFAULT NULL::text)
 RETURNS SETOF portfolios
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT p.*
  FROM public.portfolios p
  JOIN public.artists a ON p.artist_id = a.id
  WHERE p.deleted_at IS NULL
    AND a.deleted_at IS NULL
    AND a.is_hide = false
    AND a.approved_at IS NOT NULL
    AND a.portfolio_media_count >= 5
    AND (p_type_artist IS NULL OR a.type_artist = p_type_artist OR a.type_artist = 'BOTH')
    AND (p_region_ids IS NULL OR a.region_id = ANY(p_region_ids))
    AND (p_type_sex IS NULL OR a.type_sex = p_type_sex)
    AND (
      EXISTS (
        SELECT 1 FROM public.categorizables c
        WHERE c.categorizable_type = 'portfolio'
          AND c.categorizable_id = p.id
          AND c.category_id = ANY(p_category_ids)
      )
      OR EXISTS (
        SELECT 1 FROM public.categorizables c
        JOIN public.categories cat ON cat.id = c.category_id
        WHERE c.categorizable_type = 'artist'
          AND c.categorizable_id = a.id
          AND c.category_id = ANY(p_category_ids)
          AND cat.category_type = 'SHOP'
      )
    )
$function$;

CREATE OR REPLACE FUNCTION public.search_ad_portfolios_by_category_ids(p_category_ids uuid[], p_type_artist text DEFAULT NULL::text, p_region_ids uuid[] DEFAULT NULL::uuid[], p_type_sex text DEFAULT NULL::text)
 RETURNS SETOF portfolios
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT p.*
  FROM public.portfolios p
  JOIN public.artists a ON p.artist_id = a.id
  WHERE p.deleted_at IS NULL
    AND a.deleted_at IS NULL
    AND a.is_hide = false
    AND a.approved_at IS NOT NULL
    -- 광고용: a.portfolio_media_count >= 5 게이트 없음 (포폴 1장이어도 광고 노출)
    AND (p_type_artist IS NULL OR a.type_artist = p_type_artist OR a.type_artist = 'BOTH')
    AND (p_region_ids IS NULL OR a.region_id = ANY(p_region_ids))
    AND (p_type_sex IS NULL OR a.type_sex = p_type_sex)
    AND (
      EXISTS (
        SELECT 1 FROM public.categorizables c
        WHERE c.categorizable_type = 'portfolio'
          AND c.categorizable_id = p.id
          AND c.category_id = ANY(p_category_ids)
      )
      OR EXISTS (
        SELECT 1 FROM public.categorizables c
        JOIN public.categories cat ON cat.id = c.category_id
        WHERE c.categorizable_type = 'artist'
          AND c.categorizable_id = a.id
          AND c.category_id = ANY(p_category_ids)
          AND cat.category_type = 'SHOP'
      )
    )
$function$;
