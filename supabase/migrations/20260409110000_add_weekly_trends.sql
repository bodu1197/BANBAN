-- Weekly trend curation pages.
-- One row per week containing: top portfolios snapshot + AI-generated editorial.
-- Generated every Monday by /api/cron/weekly-trend-generate.

create table if not exists public.weekly_trends (
  id uuid default gen_random_uuid() primary key,
  week_start date not null unique,            -- Monday of the week being summarized
  slug text not null unique,                  -- e.g. "weekly-trend-2026-04-07"
  title text not null,
  intro text not null,                        -- AI-generated markdown editorial
  meta_description text not null,
  cover_image_url text,
  items jsonb not null default '[]'::jsonb,   -- [{ portfolio_id, title, artist_name, image_url, likes }]
  total_likes integer not null default 0,
  total_views integer not null default 0,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_weekly_trends_published_at
  on public.weekly_trends (published, published_at desc)
  where published = true;

create index if not exists idx_weekly_trends_week_start
  on public.weekly_trends (week_start desc);

alter table public.weekly_trends enable row level security;

create policy "Anyone can read published weekly trends"
  on public.weekly_trends for select
  using (published = true);

create or replace function public.increment_weekly_trend_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.weekly_trends
     set view_count = view_count + 1
   where slug = p_slug and published = true;
$$;

grant execute on function public.increment_weekly_trend_view(text) to anon, authenticated;
