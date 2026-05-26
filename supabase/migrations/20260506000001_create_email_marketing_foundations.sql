create table if not exists public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text null,
  last_name text null,
  user_id uuid null references auth.users(id) on delete set null,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  source text null,
  country text null,
  tags text[] not null default '{}'::text[],
  is_founding_owner boolean not null default false,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_subscribers_status_idx
  on public.email_subscribers (status);

create index if not exists email_subscribers_user_id_idx
  on public.email_subscribers (user_id);

create index if not exists email_subscribers_subscribed_at_desc_idx
  on public.email_subscribers (subscribed_at desc);

create index if not exists email_subscribers_is_founding_owner_idx
  on public.email_subscribers (is_founding_owner);

create index if not exists email_subscribers_tags_gin_idx
  on public.email_subscribers using gin (tags);

drop trigger if exists email_subscribers_set_updated_at on public.email_subscribers;
create trigger email_subscribers_set_updated_at
before update on public.email_subscribers
for each row execute function public.set_updated_at();

create table if not exists public.email_segments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preview_text text null,
  body_html text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'paused', 'archived')),
  segment_slug text null references public.email_segments(slug) on delete set null,
  scheduled_at timestamptz null,
  sent_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_campaigns_status_idx
  on public.email_campaigns (status);

create index if not exists email_campaigns_segment_slug_idx
  on public.email_campaigns (segment_slug);

create index if not exists email_campaigns_scheduled_at_idx
  on public.email_campaigns (scheduled_at);

drop trigger if exists email_campaigns_set_updated_at on public.email_campaigns;
create trigger email_campaigns_set_updated_at
before update on public.email_campaigns
for each row execute function public.set_updated_at();

create table if not exists public.email_campaign_subscribers (
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  subscriber_id uuid not null references public.email_subscribers(id) on delete cascade,
  sent_at timestamptz null,
  opened_at timestamptz null,
  clicked_at timestamptz null,
  primary key (campaign_id, subscriber_id)
);

create index if not exists email_campaign_subscribers_subscriber_id_idx
  on public.email_campaign_subscribers (subscriber_id);

create index if not exists email_campaign_subscribers_sent_at_idx
  on public.email_campaign_subscribers (sent_at desc);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.email_subscribers(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_events_subscriber_id_created_at_idx
  on public.email_events (subscriber_id, created_at desc);

create index if not exists email_events_event_type_created_at_idx
  on public.email_events (event_type, created_at desc);

alter table public.email_subscribers enable row level security;
alter table public.email_segments enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_campaign_subscribers enable row level security;
alter table public.email_events enable row level security;

drop policy if exists "Email subscribers self access" on public.email_subscribers;
create policy "Email subscribers self access"
on public.email_subscribers
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Email subscribers self update" on public.email_subscribers;
create policy "Email subscribers self update"
on public.email_subscribers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Email subscribers admin access" on public.email_subscribers;
create policy "Email subscribers admin access"
on public.email_subscribers
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists email_subscribers_service_role on public.email_subscribers;
create policy email_subscribers_service_role
on public.email_subscribers
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Email segments admin access" on public.email_segments;
create policy "Email segments admin access"
on public.email_segments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists email_segments_service_role on public.email_segments;
create policy email_segments_service_role
on public.email_segments
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Email campaigns admin access" on public.email_campaigns;
create policy "Email campaigns admin access"
on public.email_campaigns
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists email_campaigns_service_role on public.email_campaigns;
create policy email_campaigns_service_role
on public.email_campaigns
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Email campaign subscribers admin access" on public.email_campaign_subscribers;
create policy "Email campaign subscribers admin access"
on public.email_campaign_subscribers
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists email_campaign_subscribers_service_role on public.email_campaign_subscribers;
create policy email_campaign_subscribers_service_role
on public.email_campaign_subscribers
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "Email events admin access" on public.email_events;
create policy "Email events admin access"
on public.email_events
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists email_events_service_role on public.email_events;
create policy email_events_service_role
on public.email_events
for all
to service_role
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into public.email_segments (slug, name, description)
values
  ('guest_leads', 'Guest Leads', 'Guests who subscribed before or during trip planning.'),
  ('owner_leads', 'Owner Leads', 'Prospective owners interested in listing DVC points.'),
  ('founding_owners', 'Founding Owners', 'Owners eligible for founding owner communications.'),
  ('verified_owners', 'Verified Owners', 'Owners who completed verification and can receive owner updates.'),
  ('abandoned_onboarding', 'Abandoned Onboarding', 'Users who started but did not complete onboarding.'),
  ('ready_stay_alerts', 'Ready Stay Alerts', 'Subscribers interested in Ready Stay openings and alerts.')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description;

with latest_leads as (
  select distinct on (lower(trim(email)))
    lower(trim(email)) as normalized_email,
    source,
    created_at
  from public.email_leads
  where trim(email) <> ''
  order by lower(trim(email)), created_at desc
),
first_seen as (
  select
    lower(trim(email)) as normalized_email,
    min(created_at) as first_created_at
  from public.email_leads
  where trim(email) <> ''
  group by lower(trim(email))
)
insert into public.email_subscribers (
  email,
  status,
  source,
  tags,
  subscribed_at,
  created_at,
  updated_at
)
select
  latest_leads.normalized_email,
  'subscribed',
  latest_leads.source,
  array['guest_lead', 'legacy_email_lead']::text[],
  first_seen.first_created_at,
  first_seen.first_created_at,
  now()
from latest_leads
join first_seen on first_seen.normalized_email = latest_leads.normalized_email
on conflict (email) do update
set
  source = coalesce(public.email_subscribers.source, excluded.source),
  subscribed_at = coalesce(public.email_subscribers.subscribed_at, excluded.subscribed_at),
  updated_at = now();
