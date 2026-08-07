-- 게스트 RPC 보강 (review8 3차 지적 반영)
--
-- 1) READ COMMITTED 에서는 동시 트랜잭션이 서로의 미커밋 insert 를 못 본다 →
--    한 함수 안에 count+insert 를 넣어도 동시 요청이 전부 0 을 읽고 통과할 수 있다.
--    같은 IP 요청을 advisory lock 으로 직렬화한다(트랜잭션 끝나면 자동 해제).
-- 2) create_guest_comment 가 대상 글의 생존 여부와 부모 댓글 소속을 다시 확인한다.
--    앱에서 확인한 뒤 RPC 까지 오는 사이에 글이 삭제될 수 있다.

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
    perform pg_advisory_xact_lock(hashtext('guest-post:' || p_ip));

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
  -- 살아있는 글인지, 부모 댓글이 정말 이 글의 것인지 여기서 다시 본다.
  if not exists (select 1 from public.posts where id = p_post_id and deleted_at is null) then
    return null;
  end if;
  if p_parent_id is not null and not exists (
    select 1 from public.comments
     where id = p_parent_id and post_id = p_post_id and deleted_at is null
  ) then
    return null;
  end if;

  if p_ip is not null then
    perform pg_advisory_xact_lock(hashtext('guest-comment:' || p_ip));

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

-- create or replace 는 권한을 유지하지만, 명시적으로 다시 확인한다.
revoke execute on function public.create_guest_post(text, text, text, text, text, text, text, text, text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.create_guest_comment(uuid, uuid, text, text, text, text, integer, integer) from public, anon, authenticated;
