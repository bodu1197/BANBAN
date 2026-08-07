-- 게스트 글/댓글의 원자성 확보 (review8 2차 지적 반영)
--
-- 1) 도배 카운트 → insert 사이의 TOCTOU: 동시 요청이 모두 "0건"을 읽고 전부 통과했다.
-- 2) 본문 insert 와 비밀번호 insert 가 별도 왕복이라, 2번째가 실패하면
--    비밀번호 없는(= 작성자가 영영 수정·삭제 못 하는) 글이 남았다.
-- 3) 비밀번호 실패 카운트가 read-modify-write 라, 뒤늦은 요청이 방금 걸린 잠금을 지웠다.
-- 셋 다 "한 문장/한 트랜잭션"으로 옮겨서 해결한다.

-- ── 게스트 글 작성 ───────────────────────────────────────────────
create or replace function public.create_guest_post(
  p_title text,
  p_content text,
  p_type_board text,
  p_type_post text,
  p_type_artist text,
  p_image_url text,
  p_youtube_url text,
  p_guest_name text,
  p_password_hash text,
  p_ip text,
  p_limit integer,
  p_window_seconds integer
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
  v_id uuid;
begin
  if p_ip is not null then
    select count(*) into v_recent
      from public.guest_authors
     where ip = p_ip
       and post_id is not null
       and created_at > now() - make_interval(secs => p_window_seconds);
    if v_recent >= p_limit then
      return null; -- 도배 차단
    end if;
  end if;

  insert into public.posts (user_id, guest_name, title, content, type_board, type_post, type_artist, image_url, youtube_url)
  values (null, p_guest_name, p_title, p_content, p_type_board, p_type_post, p_type_artist, p_image_url, p_youtube_url)
  returning id into v_id;

  insert into public.guest_authors (post_id, password_hash, ip)
  values (v_id, p_password_hash, p_ip);

  return v_id;
end;
$$;

-- ── 게스트 댓글 작성 ─────────────────────────────────────────────
create or replace function public.create_guest_comment(
  p_post_id uuid,
  p_parent_id uuid,
  p_content text,
  p_guest_name text,
  p_password_hash text,
  p_ip text,
  p_limit integer,
  p_window_seconds integer
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
  v_id uuid;
begin
  if p_ip is not null then
    select count(*) into v_recent
      from public.guest_authors
     where ip = p_ip
       and comment_id is not null
       and created_at > now() - make_interval(secs => p_window_seconds);
    if v_recent >= p_limit then
      return null;
    end if;
  end if;

  insert into public.comments (post_id, parent_id, user_id, guest_name, content)
  values (p_post_id, p_parent_id, null, p_guest_name, p_content)
  returning id into v_id;

  insert into public.guest_authors (comment_id, password_hash, ip)
  values (v_id, p_password_hash, p_ip);

  return v_id;
end;
$$;

-- ── 비밀번호 시도 기록 (원자적) ──────────────────────────────────
-- 성공: 카운터 리셋. 실패: fail_count 를 **유지한 채** 증가시키고 한도를 넘으면 잠근다.
-- 카운터를 리셋하지 않으므로, 잠금이 풀린 뒤 한 번만 더 틀려도 곧바로 다시 잠긴다
-- (= 4자리 비밀번호를 무한 반복으로 뚫는 경로를 막는다).
create or replace function public.record_guest_auth_attempt(
  p_id uuid,
  p_success boolean,
  p_max integer,
  p_lock_minutes integer
) returns timestamptz
language sql
security definer
set search_path = ''
as $$
  update public.guest_authors
     set fail_count = case when p_success then 0 else fail_count + 1 end,
         locked_until = case
           when p_success then null
           when fail_count + 1 >= p_max then now() + make_interval(mins => p_lock_minutes)
           else locked_until
         end
   where id = p_id
  returning locked_until;
$$;

-- security definer 함수는 service_role 만 부를 수 있어야 한다.
revoke execute on function public.create_guest_post(text, text, text, text, text, text, text, text, text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.create_guest_comment(uuid, uuid, text, text, text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.record_guest_auth_attempt(uuid, boolean, integer, integer) from public, anon, authenticated;

-- ── 기존 버그: 비로그인 조회수가 한 번도 기록되지 않았다 ─────────
-- upsert 의 on_conflict(post_id, ip_address) 가 부분 인덱스를 추론하지 못해 42P10 으로 실패해 왔다.
-- 전체 유니크 인덱스로 바꾼다. NULL 은 서로 구별되므로(기본 동작) 반대편 행에는 영향이 없다.
drop index if exists public.idx_post_views_user;
drop index if exists public.idx_post_views_ip;
create unique index if not exists idx_post_views_user on public.post_views(post_id, user_id);
create unique index if not exists idx_post_views_ip on public.post_views(post_id, ip_address);

-- 보관기간 파기용 — ip 등치 조건 없이 created_at 만 훑으므로 별도 인덱스가 필요하다.
create index if not exists guest_authors_created_idx
  on public.guest_authors(created_at) where ip is not null;
