-- 비로그인 이미지 업로드 기록.
--
-- 왜 DB 인가: in-memory 카운터는 Vercel 인스턴스마다 격리되고 콜드스타트마다 리셋된다.
-- 업로드는 스토리지 용량·비용이 걸리므로 실효 없는 한도로 두면 안 된다.
-- 겸사겸사 여기 남은 path 로 "글에 안 붙은 고아 파일"을 찾아 지운다.

create table if not exists public.guest_uploads (
  id uuid primary key default gen_random_uuid(),
  ip text,
  path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists guest_uploads_ip_created_idx
  on public.guest_uploads(ip, created_at desc) where ip is not null;
create index if not exists guest_uploads_created_idx
  on public.guest_uploads(created_at);

alter table public.guest_uploads enable row level security;
revoke all on public.guest_uploads from public, anon, authenticated;

/**
 * 업로드 한도 확인 + 기록을 한 트랜잭션에 처리한다.
 * 세고 나서 넣으면 동시 요청이 전부 통과한다(TOCTOU) — advisory lock 으로 같은 IP 를 직렬화.
 * @returns true = 허용(기록됨), false = 한도 초과
 */
create or replace function public.record_guest_upload(
  p_ip text,
  p_path text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
begin
  if p_ip is not null then
    perform pg_advisory_xact_lock(hashtext('guest-upload:' || p_ip));

    select count(*) into v_recent
      from public.guest_uploads
     where ip = p_ip
       and created_at > now() - make_interval(secs => p_window_seconds);
    if v_recent >= p_limit then
      return false;
    end if;
  end if;

  insert into public.guest_uploads (ip, path) values (p_ip, p_path);
  return true;
end;
$$;

/**
 * 글에 붙지 않은 채 하루가 지난 게스트 파일 목록.
 * 실제 스토리지 삭제는 앱이 한다(SQL 로는 객체를 못 지운다).
 */
create or replace function public.orphan_guest_uploads(p_older_than_hours integer, p_limit integer)
returns table (path text)
language sql
security definer
set search_path = ''
as $$
  select gu.path
    from public.guest_uploads gu
   where gu.created_at < now() - make_interval(hours => p_older_than_hours)
     and not exists (
       select 1 from public.posts p
        where p.image_url like '%' || gu.path
     )
   limit p_limit;
$$;

create or replace function public.forget_guest_uploads(p_paths text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.guest_uploads where path = any(p_paths);
$$;

revoke execute on function public.record_guest_upload(text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.orphan_guest_uploads(integer, integer) from public, anon, authenticated;
revoke execute on function public.forget_guest_uploads(text[]) from public, anon, authenticated;
