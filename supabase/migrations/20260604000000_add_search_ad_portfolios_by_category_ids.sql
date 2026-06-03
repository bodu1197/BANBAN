-- 광고 전용 카테고리 포폴 조회 RPC.
-- 자연 검색용 search_portfolios_by_category_ids 는 품질바(portfolio_media_count >= 5)를 유지하지만,
-- 유료/부여 광고는 포폴 수와 무관하게(1장이어도) 노출돼야 하므로 미디어 게이트가 없는 별도 함수를 둔다.
-- 노출 범위는 호출부가 .in("artist_id", <활성 광고주>) 로 한정하므로 비광고주가 새어나오지 않는다.
-- 나머지 로직(카테고리 매칭/숨김·삭제 제외/타입·지역 필터)은 원본과 동일.
CREATE OR REPLACE FUNCTION public.search_ad_portfolios_by_category_ids(
  p_category_ids uuid[],
  p_type_artist text DEFAULT NULL,
  p_region_ids uuid[] DEFAULT NULL,
  p_type_sex text DEFAULT NULL
)
RETURNS SETOF public.portfolios
LANGUAGE sql
STABLE
AS $func$
  SELECT p.*
  FROM public.portfolios p
  JOIN public.artists a ON p.artist_id = a.id
  WHERE p.deleted_at IS NULL
    AND a.deleted_at IS NULL
    AND a.is_hide = false
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
$func$;

GRANT EXECUTE ON FUNCTION public.search_ad_portfolios_by_category_ids(uuid[], text, uuid[], text)
  TO anon, authenticated, service_role;
