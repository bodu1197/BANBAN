-- 비로그인(게스트) 글/댓글 작성 지원
--
-- 공개 정보: posts.guest_name / comments.guest_name — 목록·상세에 작성자로 표시.
-- 비공개 정보: guest_authors — 비밀번호 해시와 작성 IP. anon/authenticated 는 절대 못 읽는다.
--              (RLS 켜고 정책을 하나도 만들지 않음 = service_role 만 접근)

alter table public.posts    add column if not exists guest_name text;
alter table public.comments add column if not exists guest_name text;

create table if not exists public.guest_authors (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  password_hash text not null,
  ip text,
  created_at timestamptz not null default now(),
  constraint guest_authors_target_check check (num_nonnulls(post_id, comment_id) = 1)
);

-- FK 인덱스 겸 1:1 보장 (advisor: unindexed_foreign_keys)
create unique index if not exists guest_authors_post_id_key
  on public.guest_authors(post_id) where post_id is not null;
create unique index if not exists guest_authors_comment_id_key
  on public.guest_authors(comment_id) where comment_id is not null;

alter table public.guest_authors enable row level security;
revoke all on public.guest_authors from anon, authenticated;

-- "작성자 없으면 guest_name 필수" CHECK 는 일부러 걸지 않는다.
-- 예전에 이관된 글 5건이 user_id·guest_name 둘 다 없는 상태라, NOT VALID 로 걸어도
-- 그 글들의 UPDATE(관리자 수정·soft delete)가 통째로 막힌다. 이 규칙은 createPost/createComment 가 지킨다.
