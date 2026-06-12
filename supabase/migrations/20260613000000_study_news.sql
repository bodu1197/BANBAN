-- 문신사법·국가시험 자동뉴스 CMS (nunsinpass → 반언니 포팅, 공부방 전용)
-- 수집(cron) + 관리자 검토 write 는 전량 createAdminClient(service_role, RLS 우회).
-- 공개 SELECT(published) 만 정책 개방 → 비로그인 /study-news 색인 가능.
create table if not exists public.study_news_items (
  id            bigint generated always as identity primary key,
  slug          text        not null unique,                 -- SEO URL: yyyy-mm-dd-<hash8>
  title         text        not null,                        -- 원문 헤드라인
  summary       text        not null,                        -- AI 요약 or 원문 발췌 폴백
  source_name   text        not null,                        -- 보건복지부/연합뉴스 등
  source_url    text        not null,                        -- 원문 링크(항상 표시)
  source_domain text        not null,                        -- 신뢰등급 판정 도메인
  tier          smallint    not null,                        -- 1=공식(자동게시) 2=언론(검토)
  category      text,                                        -- 법령/시험일정/제도·정책/판례/업계·현장/기타
  relevance     smallint,                                    -- 1~10 관련도
  url_hash      text        not null unique,                 -- sha256(domain::정규화제목) 중복방지
  status        text        not null default 'draft'
                  check (status in ('draft', 'published', 'rejected')),
  published_by  uuid,                                        -- 감사용: FK 금지(plain uuid) — 다중 FK 임베드 함정 회피
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists study_news_status_pub_idx
  on public.study_news_items (status, published_at desc);

alter table public.study_news_items enable row level security;

drop policy if exists "study_news_public_select" on public.study_news_items;
create policy "study_news_public_select" on public.study_news_items
  for select using (status = 'published');   -- anon 포함 published 만 노출
-- INSERT/UPDATE/DELETE 정책 의도적 부재 → service_role(createAdminClient) 만 write

notify pgrst, 'reload schema';
