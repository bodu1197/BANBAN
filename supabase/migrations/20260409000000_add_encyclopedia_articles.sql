-- Encyclopedia articles: SEO-optimized long-form tattoo knowledge content
-- Generated daily by /api/cron/encyclopedia-generate using OpenAI.
-- Independent of blog_posts (which mirrors portfolios).

create table if not exists public.encyclopedia_articles (
  id uuid default gen_random_uuid() primary key,
  topic_id integer not null unique,
  slug text not null unique,
  title text not null,
  excerpt text not null,
  content text not null,
  meta_title text not null,
  meta_description text not null,
  keywords text[] not null default '{}',
  tags text[] not null default '{}',
  category text not null,
  cover_image_url text,
  cover_image_alt text,
  inline_images jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  reading_time_minutes integer not null default 5,
  published boolean not null default true,
  published_at timestamptz not null default now(),
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_encyclopedia_published_at
  on public.encyclopedia_articles (published, published_at desc)
  where published = true;

create index if not exists idx_encyclopedia_category
  on public.encyclopedia_articles (category, published_at desc)
  where published = true;

create index if not exists idx_encyclopedia_slug
  on public.encyclopedia_articles (slug);

-- Full text search (Korean-friendly: simple config)
create index if not exists idx_encyclopedia_fts
  on public.encyclopedia_articles
  using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(content,'')));

alter table public.encyclopedia_articles enable row level security;

create policy "Anyone can read published encyclopedia articles"
  on public.encyclopedia_articles for select
  using (published = true);

-- Service role bypasses RLS automatically; no insert policy required.

-- View counter RPC (atomic)
create or replace function public.increment_encyclopedia_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.encyclopedia_articles
     set view_count = view_count + 1
   where slug = p_slug and published = true;
$$;

grant execute on function public.increment_encyclopedia_view(text) to anon, authenticated;
