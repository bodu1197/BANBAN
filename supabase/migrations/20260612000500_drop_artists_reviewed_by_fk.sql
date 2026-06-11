-- HOTFIX: artists.reviewed_by FK 제거.
-- 원인: 20260612000000 에서 reviewed_by → profiles(id) FK 를 추가했는데, user_id → profiles(id) FK 가
--   이미 있어 profiles ↔ artists 관계가 2개가 됨. PostgREST 임베드(예: /admin/members 의
--   profiles.select("..., artists!left(...)"))가 어느 관계인지 모호해져 500 발생.
-- 해결: reviewed_by 는 승인자 감사 기록용 — 참조무결성보다 임베드 정상화 우선. 컬럼은 유지, FK 만 제거.
ALTER TABLE public.artists DROP CONSTRAINT IF EXISTS artists_reviewed_by_fkey;

-- PostgREST 스키마 캐시 즉시 리로드
NOTIFY pgrst, 'reload schema';
