-- 게스트 RPC 가 유일한 쓰기 경로이므로, 앱 검증과 무관하게 DB 에서도 최소 조건을 지킨다.
-- (닉네임/비밀번호 없이 통과하면 작성자도 비밀번호도 없는 = 아무도 못 지우는 글이 남는다)

create or replace function public.guest_args_invalid(p_guest_name text, p_password_hash text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_guest_name is null
      or char_length(btrim(p_guest_name)) < 2
      or p_password_hash is null
      or char_length(p_password_hash) < 20;
$$;

create or replace function public.create_guest_post(
  p_title text, p_content text, p_type_board text, p_type_post text, p_type_artist text,
  p_image_url text, p_youtube_url text, p_guest_name text, p_password_hash text,
  p_ip text, p_limit integer, p_window_seconds integer
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_recent integer; v_id uuid;
begin
  if public.guest_args_invalid(p_guest_name, p_password_hash) then return null; end if;

  if p_ip is not null then
    perform pg_advisory_xact_lock(hashtext('guest-post:' || p_ip));
    select count(*) into v_recent
      from public.guest_authors
     where ip = p_ip and post_id is not null
       and created_at > now() - make_interval(secs => p_window_seconds);
    if v_recent >= p_limit then return null; end if;
  end if;

  insert into public.posts (user_id, guest_name, title, content, type_board, type_post, type_artist, image_url, youtube_url)
  values (null, btrim(p_guest_name), p_title, p_content, p_type_board, p_type_post, p_type_artist, p_image_url, p_youtube_url)
  returning id into v_id;

  insert into public.guest_authors (post_id, password_hash, ip) values (v_id, p_password_hash, p_ip);
  return v_id;
end;
$$;

create or replace function public.create_guest_comment(
  p_post_id uuid, p_parent_id uuid, p_content text, p_guest_name text,
  p_password_hash text, p_ip text, p_limit integer, p_window_seconds integer
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_recent integer; v_id uuid;
begin
  if public.guest_args_invalid(p_guest_name, p_password_hash) then return null; end if;
  if p_content is null or btrim(p_content) = '' then return null; end if;

  if not exists (select 1 from public.posts where id = p_post_id and deleted_at is null) then
    return null;
  end if;
  if p_parent_id is not null and not exists (
    select 1 from public.comments where id = p_parent_id and post_id = p_post_id and deleted_at is null
  ) then
    return null;
  end if;

  if p_ip is not null then
    perform pg_advisory_xact_lock(hashtext('guest-comment:' || p_ip));
    select count(*) into v_recent
      from public.guest_authors
     where ip = p_ip and comment_id is not null
       and created_at > now() - make_interval(secs => p_window_seconds);
    if v_recent >= p_limit then return null; end if;
  end if;

  insert into public.comments (post_id, parent_id, user_id, guest_name, content)
  values (p_post_id, p_parent_id, null, btrim(p_guest_name), p_content)
  returning id into v_id;

  insert into public.guest_authors (comment_id, password_hash, ip) values (v_id, p_password_hash, p_ip);
  return v_id;
end;
$$;

revoke execute on function public.guest_args_invalid(text, text) from public, anon, authenticated;
revoke execute on function public.create_guest_post(text, text, text, text, text, text, text, text, text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.create_guest_comment(uuid, uuid, text, text, text, text, integer, integer) from public, anon, authenticated;
