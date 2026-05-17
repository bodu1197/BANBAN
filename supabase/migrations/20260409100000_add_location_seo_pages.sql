-- Location × Style SEO landing pages.
-- Each row is a generated long-form Korean article targeting a
-- specific (region, style) search-intent — e.g. "강남 블랙앤그레이 타투".
-- Generated daily by /api/cron/location-seo-generate.

create table if not exists public.location_seo_pages (
  id uuid default gen_random_uuid() primary key,
  region_id uuid not null references public.regions(id) on delete cascade,
  region_name text not null,         -- denormalised snapshot for fast list/sitemap
  style text not null,               -- e.g. "블랙앤그레이"
  slug text not null unique,         -- e.g. "seoul-gangnam-blackngray"
  title text not null,
  excerpt text not null,
  content text not null,             -- markdown
  meta_title text not null,
  meta_description text not null,
  keywords text[] not null default '{}',
  cover_image_url text,
  cover_image_alt text,
  inline_images jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  artist_count integer not null default 0,
  portfolio_count integer not null default 0,
  reading_time_minutes integer not null default 4,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region_id, style)
);

create index if not exists idx_location_seo_published_at
  on public.location_seo_pages (published, published_at desc)
  where published = true;

create index if not exists idx_location_seo_region
  on public.location_seo_pages (region_id, style)
  where published = true;

create index if not exists idx_location_seo_slug
  on public.location_seo_pages (slug);

alter table public.location_seo_pages enable row level security;

create policy "Anyone can read published location seo pages"
  on public.location_seo_pages for select
  using (published = true);

create or replace function public.increment_location_seo_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.location_seo_pages
     set view_count = view_count + 1
   where slug = p_slug and published = true;
$$;

grant execute on function public.increment_location_seo_view(text) to anon, authenticated;
