-- 후기(reviews) 댓글/대댓글. community posts 의 comments 와는 별개 도메인이라 전용 테이블.
-- parent_id self-reference 로 대댓글(1단계 중첩) 지원.

create table if not exists public.review_comments (
  id uuid default gen_random_uuid() primary key,
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  parent_id uuid references public.review_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_review_comments_review
  on public.review_comments (review_id, created_at)
  where deleted_at is null;

create index if not exists idx_review_comments_parent
  on public.review_comments (parent_id);

alter table public.review_comments enable row level security;

-- 모두 조회 가능(공개), 인증 본인만 작성/수정/삭제.
create policy "review_comments_select_all"
  on public.review_comments for select
  using (true);

create policy "review_comments_insert_auth"
  on public.review_comments for insert
  with check (auth.uid() = user_id);

create policy "review_comments_update_own"
  on public.review_comments for update
  using (auth.uid() = user_id);

create policy "review_comments_delete_own"
  on public.review_comments for delete
  using (auth.uid() = user_id);
