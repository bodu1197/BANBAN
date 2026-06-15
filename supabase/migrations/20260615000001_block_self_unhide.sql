-- 운영자 self-unhide(테이크다운 자가 해제) 차단 — is_hide 변경은 관리자/service_role 만 가능.
-- artists_update RLS 가 본인 행 UPDATE 를 허용(컬럼 제한 없음)하고, prevent_artist_self_approve 트리거가
-- approved_at/status 만 막고 is_hide 는 막지 않아, 숨김된 샵 운영자가 is_hide=false 로 자가 복구해 모더레이션을
-- 우회할 수 있었음(2026-06-15 보안 점검 발견). 기존 트리거 함수에 is_hide 가드 추가(CREATE OR REPLACE).
create or replace function public.prevent_artist_self_approve()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- service_role(서버 API): auth context 없음 → 통과
  if auth.uid() is null then
    return new;
  end if;

  -- 관리자: 승인/반려/공개·비공개 권한 있음 → 통과
  if exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    return new;
  end if;

  -- 일반 사용자(본인 샵) 자가 승인 차단
  if tg_op = 'INSERT' then
    if new.approved_at is not null or new.status = 'active' then
      raise exception '샵은 관리자 승인 후 활성화됩니다' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE: 승인 시각 본인 변경 금지
  if new.approved_at is distinct from old.approved_at then
    raise exception '승인 상태는 관리자만 변경할 수 있습니다' using errcode = '42501';
  end if;

  -- 비공개(테이크다운) 상태는 관리자만 — 운영자 self-unhide 차단(2026-06-15).
  if new.is_hide is distinct from old.is_hide then
    raise exception '공개/비공개 상태는 관리자만 변경할 수 있습니다' using errcode = '42501';
  end if;

  -- 미승인(approved_at NULL)에서 status=active 자가 설정 금지 (dormant 재활성화는 approved_at NOT NULL 이라 통과)
  if new.status = 'active' and new.approved_at is null then
    raise exception '샵은 관리자 승인 후 활성화됩니다' using errcode = '42501';
  end if;

  -- 재신청(rejected → pending): 24h 쿨다운 강제 + resubmitted_at 자동 기록(클라 우회 불가)
  if old.status = 'rejected' and new.status = 'pending' then
    if old.resubmitted_at is not null and now() - old.resubmitted_at < interval '24 hours' then
      raise exception '재신청은 24시간에 한 번만 가능합니다. 잠시 후 다시 시도해 주세요.';
    end if;
    new.resubmitted_at := now();
  end if;

  return new;
end;
$function$;
