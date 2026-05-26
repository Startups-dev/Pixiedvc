begin;

create extension if not exists pgcrypto;

create table if not exists public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  session_id text not null,
  started_at timestamptz not null default timezone('utc', now()),
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  session_duration_seconds integer not null default 0,
  landing_page_path text not null,
  exit_page_path text not null,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  device_type text not null default 'unknown',
  browser text not null default 'unknown',
  country text,
  city text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint visitor_sessions_session_id_key unique (session_id),
  constraint visitor_sessions_duration_nonnegative check (session_duration_seconds >= 0)
);

create table if not exists public.visitor_pageviews (
  id uuid primary key default gen_random_uuid(),
  session_row_id uuid not null references public.visitor_sessions(id) on delete cascade,
  visitor_id text not null,
  session_id text not null,
  page_path text not null,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.visitor_events (
  id uuid primary key default gen_random_uuid(),
  session_row_id uuid not null references public.visitor_sessions(id) on delete cascade,
  visitor_id text not null,
  session_id text not null,
  event_name text not null,
  page_path text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists visitor_sessions_started_at_idx
  on public.visitor_sessions (started_at desc);

create index if not exists visitor_sessions_last_seen_at_idx
  on public.visitor_sessions (last_seen_at desc);

create index if not exists visitor_sessions_visitor_id_idx
  on public.visitor_sessions (visitor_id);

create index if not exists visitor_sessions_referrer_idx
  on public.visitor_sessions (referrer)
  where referrer is not null;

create index if not exists visitor_sessions_utm_source_idx
  on public.visitor_sessions (utm_source)
  where utm_source is not null;

create index if not exists visitor_pageviews_created_at_idx
  on public.visitor_pageviews (created_at desc);

create index if not exists visitor_pageviews_page_path_idx
  on public.visitor_pageviews (page_path, created_at desc);

create index if not exists visitor_pageviews_session_id_idx
  on public.visitor_pageviews (session_id);

create index if not exists visitor_events_created_at_idx
  on public.visitor_events (created_at desc);

create index if not exists visitor_events_event_name_idx
  on public.visitor_events (event_name, created_at desc);

alter table public.visitor_sessions enable row level security;
alter table public.visitor_pageviews enable row level security;
alter table public.visitor_events enable row level security;

drop policy if exists "visitor_sessions_no_public_select" on public.visitor_sessions;
create policy "visitor_sessions_no_public_select"
on public.visitor_sessions
as restrictive
for select
to anon, authenticated
using (false);

drop policy if exists "visitor_sessions_no_public_insert" on public.visitor_sessions;
create policy "visitor_sessions_no_public_insert"
on public.visitor_sessions
as restrictive
for insert
to anon, authenticated
with check (false);

drop policy if exists "visitor_pageviews_no_public_select" on public.visitor_pageviews;
create policy "visitor_pageviews_no_public_select"
on public.visitor_pageviews
as restrictive
for select
to anon, authenticated
using (false);

drop policy if exists "visitor_pageviews_no_public_insert" on public.visitor_pageviews;
create policy "visitor_pageviews_no_public_insert"
on public.visitor_pageviews
as restrictive
for insert
to anon, authenticated
with check (false);

drop policy if exists "visitor_events_no_public_select" on public.visitor_events;
create policy "visitor_events_no_public_select"
on public.visitor_events
as restrictive
for select
to anon, authenticated
using (false);

drop policy if exists "visitor_events_no_public_insert" on public.visitor_events;
create policy "visitor_events_no_public_insert"
on public.visitor_events
as restrictive
for insert
to anon, authenticated
with check (false);

commit;
