-- 동일 샵 이름 등록 차단 — lower(btrim(title)) 기준 유니크(비삭제 샵 대상).
-- 계정별 1샵 제약을 우회한 '같은 이름 다(多)계정' 무한 생성 방지(2026-06-15 결정).
-- 앱 레이어(/api/artist-register: GET 가용성 + POST 사전검사)와 짝을 이루는 DB 최종 방어선(동시요청 레이스 차단).
-- title 은 profiles.nickname 과 양방향 동기화되므로(트리거), 사실상 샵 운영자 닉네임도 유니크해진다.
--
-- ⚠️ 적용 전 기존 중복 title(deleted_at null) 정리 필요(프로덕션: '인아우트 맨즈' 구등록 1건 → '인아우트 맨즈 (구)'
--    리네임 후 적용 완료, 23505 enforcement empirical 확인). 신규/개발 DB 는 중복 없어 무조건 통과.
create unique index if not exists artists_title_unique_idx
  on public.artists (lower(btrim(title)))
  where deleted_at is null;
