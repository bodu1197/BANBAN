-- ────────────────────────────────────────────────────────────────────────────
-- Address Supabase database linter warnings (2026-04-07)
-- ────────────────────────────────────────────────────────────────────────────
-- 1. Replace 3 permissive `WITH CHECK (true)` INSERT policies on analytics
--    tables with constrained ones (validates FKs, restricts column lengths,
--    pins user_id to auth.uid()).
-- 2. Move pgvector extension out of `public` schema into `extensions`.
--    DB search_path already contains `extensions`, and no application code
--    uses `vector` operators by name — only the existing ivfflat index does,
--    which continues to work because PG references operator classes by OID.
-- 3. Document the deliberate `function_search_path_mutable` warning on
--    `search_portfolios_by_category_ids` (cannot be fixed without losing
--    SQL function inlining and the 108x speedup).
-- ────────────────────────────────────────────────────────────────────────────

-- ── 1a. ad_events ────────────────────────────────────────────────────────────
-- Allow any visitor to record an impression/click only if the referenced
-- subscription actually exists and is ACTIVE. Restrict event_type to a fixed
-- whitelist and bound free-text columns to prevent abuse / log spam.
DROP POLICY IF EXISTS ad_events_insert ON public.ad_events;

CREATE POLICY ad_events_insert ON public.ad_events
FOR INSERT TO anon, authenticated
WITH CHECK (
  event_type IN ('IMPRESSION', 'CLICK')
  AND char_length(coalesce(placement, '')) <= 64
  AND char_length(coalesce(page_path, '')) <= 512
  AND EXISTS (
    SELECT 1 FROM public.ad_subscriptions s
    WHERE s.id = ad_events.subscription_id
      AND s.status = 'ACTIVE'
      AND s.expires_at > now()
  )
);

-- ── 1b. page_visits ──────────────────────────────────────────────────────────
-- Largest analytics table (~24k rows). No FK to validate, so we constrain
-- field shapes: visitor_id and path are required by the API anyway, so the
-- policy just hardens that contract and caps lengths to stop log poisoning.
DROP POLICY IF EXISTS page_visits_insert_policy ON public.page_visits;

CREATE POLICY page_visits_insert_policy ON public.page_visits
FOR INSERT TO anon, authenticated
WITH CHECK (
  path IS NOT NULL
  AND char_length(path) BETWEEN 1 AND 500
  AND visitor_id IS NOT NULL
  AND char_length(visitor_id) BETWEEN 1 AND 100
  AND char_length(coalesce(country, '')) <= 8
  AND char_length(coalesce(user_agent, '')) <= 1000
  AND char_length(coalesce(referer, '')) <= 1000
  AND char_length(coalesce(ip, '')) <= 64
);

-- ── 1c. post_views ───────────────────────────────────────────────────────────
-- Tighten so that:
--   * post_id must reference a real post
--   * if user_id is set it must equal auth.uid() (cannot impersonate)
--   * at least one of user_id / ip_address must be present (matches the
--     application's UNIQUE constraint guarantees and mirrors community.ts)
DROP POLICY IF EXISTS post_views_insert_all ON public.post_views;

CREATE POLICY post_views_insert_all ON public.post_views
FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.posts WHERE id = post_views.post_id)
  AND (user_id IS NULL OR user_id = auth.uid())
  AND (user_id IS NOT NULL OR ip_address IS NOT NULL)
  AND char_length(coalesce(ip_address, '')) <= 64
);

-- ── 2. Move pgvector extension to extensions schema ─────────────────────────
-- Safe because:
--   * portfolio_embeddings.embedding column references the type by OID, not
--     by qualified name — PG updates the catalog reference automatically.
--   * The ivfflat index uses `vector_cosine_ops`, also referenced by OID.
--   * Database search_path already contains `extensions`, so any future
--     query that uses `vector` literally still resolves.
ALTER EXTENSION vector SET SCHEMA extensions;

-- ── 3. Document the accepted lint warning on the search RPC ─────────────────
COMMENT ON FUNCTION public.search_portfolios_by_category_ids(uuid[], text, uuid[], text) IS
  'Deliberately omits SET search_path so the SQL function is inlinable. '
  'PostgreSQL does not inline SQL functions that have a SET clause, and the '
  'previous version (with SET search_path) ran ~108x slower (236ms -> 2ms) '
  'because it forced full materialization before the outer ORDER BY/LIMIT. '
  'All table/operator references are fully qualified to public.* so search '
  'path injection is not a concern. SECURITY INVOKER (default) — no privilege '
  'escalation surface. The Supabase linter warning '
  '`function_search_path_mutable` is therefore an accepted trade-off.';
