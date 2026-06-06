-- Supabase DB 린터 경고 일괄 해소 (SECURITY 0011/0028/0029 + PERFORMANCE 0003/0006).
-- 역사적 마이그레이션은 불변이므로, 기존 객체를 신규 마이그레이션에서 ALTER/재정의해 교정한다.
-- 모든 변경은 "현재 유효 권한/정책을 그대로 보존"하도록 설계 — 동작 변화 0, 경고만 제거.

-- =====================================================================
-- 1. function_search_path_mutable (lint 0011)
--    SECURITY INVOKER 헬퍼 함수 9종에 고정 search_path 부재 → role-mutable 경고.
--    본문은 모두 public 객체를 비한정(unqualified)으로 참조하므로 search_path=public 로 고정.
--    (pg_catalog 는 항상 암묵 선행 검색 → now()/count()/gen_random_uuid() 등 빌트인 정상 해석.)
--    함수 본문은 건드리지 않고 proconfig 만 설정 → 동작 불변.
-- =====================================================================
ALTER FUNCTION public.spend_points(uuid, integer, text, text, uuid)
  SET search_path = public;
ALTER FUNCTION public.earn_points(uuid, integer, text, text, timestamptz, uuid)
  SET search_path = public;
ALTER FUNCTION public.earn_points_daily_limited(uuid, integer, text, integer, timestamptz, text, timestamptz, uuid)
  SET search_path = public;
ALTER FUNCTION public.earn_points_once(uuid, integer, text, text, timestamptz)
  SET search_path = public;
ALTER FUNCTION public.earn_points_once_ref(uuid, integer, text, uuid, text, timestamptz)
  SET search_path = public;
ALTER FUNCTION public.consume_sim_quota(text, text, integer)
  SET search_path = public;
ALTER FUNCTION public.get_sim_quota(text)
  SET search_path = public;
ALTER FUNCTION public.ad_event_counts(uuid[])
  SET search_path = public;
ALTER FUNCTION public.search_ad_portfolios_by_category_ids(uuid[], text, uuid[], text)
  SET search_path = public;

-- =====================================================================
-- 2. (anon|authenticated)_security_definer_function_executable (lint 0028/0029)
--    원인: Supabase 기본권한(ALTER DEFAULT PRIVILEGES)이 함수 생성 시 anon/authenticated 에
--    EXECUTE 를 자동 부여. SECURITY DEFINER 와 결합돼 "비인증/인증 사용자가 RPC 로 실행 가능" 경고.
--    조치: 실제로 클라이언트 호출이 필요 없는 함수의 EXECUTE 를 회수한다.
-- =====================================================================

-- 2-a. 트리거 함수 3종: 오직 트리거로만 발화(직접 호출 불필요).
--      트리거 실행은 EXECUTE 권한과 무관하므로 회수해도 트리거 정상 동작.
REVOKE EXECUTE ON FUNCTION public.prevent_role_self_change()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_artist_title_to_nickname() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_nickname_to_artist_title() FROM PUBLIC, anon, authenticated;

-- 2-b. reorder_quick_menu_items: 호출부(src/app/api/admin/quick-menu/route.ts)는
--      requireAdmin() → createAdminClient() = service_role 로만 호출.
--      기존 마이그레이션의 REVOKE 가 PUBLIC 만 회수해 anon/authenticated 명시 grant 가 잔존했음.
REVOKE EXECUTE ON FUNCTION public.reorder_quick_menu_items(jsonb) FROM anon, authenticated;

-- 2-c. increment_location_seo_view: 앱 전체 호출 0건(미배선). 모든 DB write 는 admin(service_role)
--      경유 정책이므로 service_role 전용으로 잠근다. (추후 클라 호출 필요 시 명시적 재부여.)
REVOKE EXECUTE ON FUNCTION public.increment_location_seo_view(text) FROM PUBLIC, anon, authenticated;

-- =====================================================================
-- 3. auth_rls_initplan (lint 0003) — review_comments
--    bare auth.uid() → 행마다 재평가. (select auth.uid()) 로 감싸 쿼리당 1회 평가(InitPlan).
--    select_all(USING true) 은 auth 호출이 없어 무관 → 미변경.
--    각 명령당 정책 1개라 0006(다중 permissive) 해당 없음.
-- =====================================================================
DROP POLICY IF EXISTS review_comments_insert_auth ON public.review_comments;
CREATE POLICY review_comments_insert_auth ON public.review_comments
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS review_comments_update_own ON public.review_comments;
CREATE POLICY review_comments_update_own ON public.review_comments
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS review_comments_delete_own ON public.review_comments;
CREATE POLICY review_comments_delete_own ON public.review_comments
  FOR DELETE USING ((select auth.uid()) = user_id);

-- =====================================================================
-- 4. events — lint 0003 + 0006 동시 해소
--    문제: "Artists can manage own events"(FOR ALL) 가 "Events are viewable by everyone"(FOR SELECT)
--    와 SELECT 액션에서 중복(0006) + bare auth.uid()(0003).
--    조치: FOR ALL 을 SELECT(병합) / INSERT / UPDATE / DELETE 로 분리.
--      - SELECT 는 단일 정책으로 병합: "공개(게시·미삭제) OR 본인 소유" → SELECT 중복 제거.
--        (EventListClient 가 authenticated 클라로 자기 이벤트 전체 status 를 SELECT 하므로 본인 SELECT 보존 필수.)
--      - I/U/D 는 본인 소유로 동일 보존(EventListClient 의 status 토글/소프트삭제 UPDATE 유지).
--    events/event_media 는 repo 마이그레이션에 DDL 이 없어(대시보드/베이스라인 생성) 존재 가드로 감싼다.
-- =====================================================================
DO $$
BEGIN
  IF to_regclass('public.events') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Artists can manage own events" ON public.events;
    DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;

    CREATE POLICY events_select ON public.events
      FOR SELECT
      USING (
        (deleted_at IS NULL AND status = 'published')
        OR artist_id IN (
          SELECT id FROM public.artists WHERE user_id = (select auth.uid())
        )
      );

    CREATE POLICY events_insert ON public.events
      FOR INSERT
      WITH CHECK (
        artist_id IN (
          SELECT id FROM public.artists WHERE user_id = (select auth.uid())
        )
      );

    CREATE POLICY events_update ON public.events
      FOR UPDATE
      USING (
        artist_id IN (
          SELECT id FROM public.artists WHERE user_id = (select auth.uid())
        )
      )
      WITH CHECK (
        artist_id IN (
          SELECT id FROM public.artists WHERE user_id = (select auth.uid())
        )
      );

    CREATE POLICY events_delete ON public.events
      FOR DELETE
      USING (
        artist_id IN (
          SELECT id FROM public.artists WHERE user_id = (select auth.uid())
        )
      );
  END IF;
END $$;

-- =====================================================================
-- 5. event_media — lint 0003 + 0006 동시 해소 (events 와 동일 패턴)
--    기존 SELECT 유효권한 = "viewable by everyone"(true) OR 본인 = 사실상 true(전체 공개).
--    → SELECT 단일 정책(USING true)로 병합(0006 제거, auth 호출 없어 0003 무관).
--    I/U/D 는 본인 소유(event → artist → user) 보존, (select auth.uid()) 적용(0003).
-- =====================================================================
DO $$
BEGIN
  IF to_regclass('public.event_media') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Artists can manage own event media" ON public.event_media;
    DROP POLICY IF EXISTS "Event media viewable by everyone" ON public.event_media;

    CREATE POLICY event_media_select ON public.event_media
      FOR SELECT
      USING (true);

    CREATE POLICY event_media_insert ON public.event_media
      FOR INSERT
      WITH CHECK (
        event_id IN (
          SELECT id FROM public.events
          WHERE artist_id IN (
            SELECT id FROM public.artists WHERE user_id = (select auth.uid())
          )
        )
      );

    CREATE POLICY event_media_update ON public.event_media
      FOR UPDATE
      USING (
        event_id IN (
          SELECT id FROM public.events
          WHERE artist_id IN (
            SELECT id FROM public.artists WHERE user_id = (select auth.uid())
          )
        )
      )
      WITH CHECK (
        event_id IN (
          SELECT id FROM public.events
          WHERE artist_id IN (
            SELECT id FROM public.artists WHERE user_id = (select auth.uid())
          )
        )
      );

    CREATE POLICY event_media_delete ON public.event_media
      FOR DELETE
      USING (
        event_id IN (
          SELECT id FROM public.events
          WHERE artist_id IN (
            SELECT id FROM public.artists WHERE user_id = (select auth.uid())
          )
        )
      );
  END IF;
END $$;
