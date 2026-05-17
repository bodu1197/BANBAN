-- Announcements table for admin global notices
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.announcements enable row level security;

-- Everyone can read active announcements
create policy "Anyone can read active announcements"
  on public.announcements for select
  using (is_active = true);

-- Index for active announcements sorted by date
create index idx_announcements_active_created
  on public.announcements (is_active, created_at desc)
  where is_active = true;
