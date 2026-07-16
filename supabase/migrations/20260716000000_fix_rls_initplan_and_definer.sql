-- Supabase 린터 경고 수정 (2026-07-16)
-- 1) auth_rls_initplan(PERFORMANCE): study_* SELECT 정책의 auth.uid() 가 row 마다 재평가됨.
--    (select auth.uid()) 로 감싸면 쿼리당 1회 평가로 최적화(결과 동일).
-- 2) SECURITY DEFINER 함수 prevent_artist_self_approve 는 트리거 전용(trg_prevent_artist_self_approve,
--    BEFORE UPDATE FOR EACH ROW)인데 anon/authenticated 가 /rest/v1/rpc 로 직접 호출 가능.
--    직접 EXECUTE 권한 회수(트리거 실행엔 영향 없음). 20260607 의 동일 패턴 계승.

-- 1) RLS initplan 최적화 (USING 절만 교체, 정책 의미 동일)
alter policy "study_answers_select_own"  on public.study_user_answers     using ((select auth.uid()) = user_id);
alter policy "study_bookmarks_select_own" on public.study_user_bookmarks  using ((select auth.uid()) = user_id);
alter policy "study_sessions_select_own"  on public.study_exam_sessions   using ((select auth.uid()) = user_id);
alter policy "study_checklist_select_own" on public.study_checklist_progress using ((select auth.uid()) = user_id);
alter policy "study_settings_select_own"  on public.study_user_settings   using ((select auth.uid()) = user_id);

-- 2) 트리거 전용 SECURITY DEFINER 함수의 직접 실행 권한 회수
REVOKE EXECUTE ON FUNCTION public.prevent_artist_self_approve() FROM PUBLIC, anon, authenticated;
