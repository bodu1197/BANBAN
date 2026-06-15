-- 사후 점검 큐(샵 점검 관리) 정렬·필터 가속 인덱스.
-- 쿼리: artists WHERE deleted_at IS NULL AND (공개중 active / 숨김 / 레거시 pending·rejected)
--       ORDER BY is_hide ASC, created_at DESC  (페이지당 20건).
-- 큐가 '미점검 active 만' → '공개중 active 전체'로 확장되며 결과셋이 커져, 정렬(is_hide, created_at)
-- 비용을 부분 인덱스로 흡수한다(플랫폼 성장 대비 — 관리자 전용 저빈도 쿼리지만 풀스캔 회피).
create index if not exists idx_artists_approval_queue
  on public.artists (is_hide, created_at desc)
  where deleted_at is null;
