-- 비로그인(게스트) 글·댓글 기능 철회 — 커뮤니티는 다시 회원 전용이다.
--
-- 20260807000000~20260807050000 이 추가한 것을 전부 되돌린다.
-- 게스트가 쓴 글·댓글은 오너 지시(2026-08-14)로 남기지 않고 지운다.
--
-- 🔴 전 구간 재실행 안전(idempotent). 이 프로젝트는 마이그레이션을 손으로 적용해 왔으므로
--    (supabase_migrations.schema_migrations 는 20260518144212 에서 멈춰 있다) 두 번 돌 수 있다.

-- 1) 게스트가 쓴 글·댓글 삭제 (soft delete 된 것 포함 — 컬럼째 없앨 것이라 되살릴 수단이 없다).
--    ⚠️ comments.post_id 는 ON DELETE CASCADE 라 게스트 글에 달린 회원 댓글도 함께 사라진다.
--    댓글 먼저 지우고, 글을 지운 뒤 남는 고아 like/report 를 정리한다(다형성 컬럼이라 FK 가 없다).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name = 'guest_name'
  ) then
    delete from public.comments where guest_name is not null;
    delete from public.posts    where guest_name is not null;
  end if;
end $$;

-- likes/reports 는 likeable_id/reportable_id 가 plain uuid(FK 없음)라 글이 사라져도 남는다.
-- 이번 삭제분뿐 아니라 예전에 쌓인 고아 행도 같이 치운다.
delete from public.likes
  where likeable_type = 'post'
    and not exists (select 1 from public.posts p where p.id = likes.likeable_id);
delete from public.reports
  where reportable_type = 'post'
    and not exists (select 1 from public.posts p where p.id = reports.reportable_id);

-- 2) 게스트 전용 함수 제거. 인자 시그니처가 마이그레이션마다 달라졌으므로 이름으로 찾아 지운다.
do $$
declare
  fn record;
begin
  for fn in
    select oid::regprocedure as sig
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'create_guest_post', 'create_guest_comment', 'record_guest_auth_attempt',
        'record_guest_upload', 'orphan_guest_uploads', 'forget_guest_uploads',
        'guest_args_invalid'
      )
  loop
    execute format('drop function if exists %s', fn.sig);
  end loop;
end $$;

-- 3) 게스트 전용 테이블 제거 (인덱스·RLS 설정도 함께 사라진다).
drop table if exists public.guest_authors;
drop table if exists public.guest_uploads;

-- 4) 공개 표시용 컬럼과 그 CHECK 제거.
alter table public.posts    drop constraint if exists posts_guest_name_len;
alter table public.comments drop constraint if exists comments_guest_name_len;
alter table public.posts    drop column if exists guest_name;
alter table public.comments drop column if exists guest_name;

-- 5) 🔴 게스트 시절에 남은 구멍: post_views 의 INSERT 정책이 anon 에게 열려 있다.
--    이제 유일한 기록 경로인 recordPostView 가 service_role(RLS 우회)로 쓰므로 이 정책은 쓰이지 않는다.
--    열어 두면 공개된 anon key 로 아무나 조회수를 부풀릴 수 있고(가짜 IP 마다 새 행),
--    행마다 도는 집계 트리거(COUNT 전체 스캔) 때문에 비용이 제곱으로 늘어난다.
drop policy if exists "post_views_insert_all" on public.post_views;
