-- 프로모 배너 (홈 2열 그리드 배너)
create table if not exists promo_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_path text not null,
  link_url text,
  order_index int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table promo_banners enable row level security;

-- 공개 읽기 (홈페이지 표시용)
create policy "promo_banners_public_read"
  on promo_banners for select
  using (true);

-- 관리자 전체 권한
create policy "promo_banners_admin_all"
  on promo_banners for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

-- 순서 인덱스
create index idx_promo_banners_order on promo_banners (order_index asc, created_at desc);
