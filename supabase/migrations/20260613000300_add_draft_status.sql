-- 검수 신청 게이트: 등록 직후 '작성 중(draft)' 상태 추가.
-- 흐름: draft(작성 중·비공개) → [배너+포폴10 충족 후 '등록 승인 신청'] → pending(검수 대기) → 관리자 승인 → active.
-- draft 는 approved_at NULL 이라 기존 공개 게이트(RLS·리스트)가 자동 차단(비공개).
alter table public.artists drop constraint if exists artists_status_check;
alter table public.artists
  add constraint artists_status_check
  check (status in ('draft', 'pending', 'active', 'rejected', 'dormant'));
