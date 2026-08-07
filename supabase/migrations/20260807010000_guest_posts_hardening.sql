-- 게스트 글/댓글 1차 구현의 보안 구멍 보강 (review8 지적 반영)

-- 1) 비밀번호 대입 잠금을 DB 에 영속화.
--    in-memory rate limit 은 Vercel 인스턴스마다 격리돼 4자리 비밀번호를 실질적으로 못 지킨다.
alter table public.guest_authors add column if not exists fail_count integer not null default 0;
alter table public.guest_authors add column if not exists locked_until timestamptz;

-- 2) IP 단위 도배 차단도 DB 에서 센다 (같은 IP 가 최근 1분에 몇 건 썼는지).
create index if not exists guest_authors_ip_created_idx
  on public.guest_authors(ip, created_at desc) where ip is not null;

-- 3) 닉네임 길이는 DB 에서도 보장 — service_role 로 쓰는 경로가 늘어도 깨지지 않게.
--    기존 행은 guest_name 이 전부 null 이라 통과한다.
alter table public.posts drop constraint if exists posts_guest_name_len;
alter table public.posts add constraint posts_guest_name_len
  check (guest_name is null or char_length(guest_name) between 2 and 12);

alter table public.comments drop constraint if exists comments_guest_name_len;
alter table public.comments add constraint comments_guest_name_len
  check (guest_name is null or char_length(guest_name) between 2 and 12);

-- 4) 기본 권한이 PUBLIC 롤로 다시 붙는 경우까지 차단.
revoke all on public.guest_authors from public;

-- 5) 🔴 기존 구멍: post_views 의 방문자 IP 를 anon 이 전부 읽을 수 있었다.
--    앱은 post_views 를 쓰기만 하고(집계는 trigger → posts.views_count) 읽지 않는다.
drop policy if exists "post_views_select_all" on public.post_views;
