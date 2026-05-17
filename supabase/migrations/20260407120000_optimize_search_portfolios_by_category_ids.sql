-- Optimize search_portfolios_by_category_ids:
-- 1. Remove DISTINCT (EXISTS already guarantees uniqueness) — was forcing materialization.
-- 2. Remove SET search_path — that clause blocks SQL function inlining in PostgreSQL.
--    Replaced with fully-qualified public.* references for safety.
-- 3. Split the OR-EXISTS into two separate EXISTS so the planner can use the
--    unique index categorizables(category_id, categorizable_type, categorizable_id).
--
-- Result: outer ORDER BY likes_count DESC + LIMIT now pushes down through the
-- function and uses idx_portfolios_live_likes (partial index).
-- Measured improvement on representative search: 236 ms → 4 ms (~60x).

CREATE OR REPLACE FUNCTION public.search_portfolios_by_category_ids(
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
$func$;
