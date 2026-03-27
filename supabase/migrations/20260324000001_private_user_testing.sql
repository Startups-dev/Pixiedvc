create table if not exists public.private_test_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.private_test_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.private_test_campaigns(id) on delete set null,
  token text unique not null,
  flow_type text not null check (flow_type in ('guest', 'owner')),
  label text,
  is_active boolean not null default true,
  max_uses integer check (max_uses is null or max_uses > 0),
  expires_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.private_test_sessions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.private_test_invites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_type text not null check (flow_type in ('guest', 'owner')),
  status text not null default 'started' check (status in ('started', 'consented', 'completed')),
  confidentiality_accepted boolean not null default false,
  confidentiality_accepted_at timestamptz,
  consent_accepted boolean not null default false,
  consent_accepted_at timestamptz,
  intake_answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  last_returned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invite_id, user_id)
);

create table if not exists public.private_test_survey_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.private_test_sessions(id) on delete cascade,
  response_answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.private_test_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.private_test_sessions(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists private_test_campaigns_status_idx on public.private_test_campaigns(status);
create index if not exists private_test_invites_flow_type_idx on public.private_test_invites(flow_type);
create index if not exists private_test_invites_expires_at_idx on public.private_test_invites(expires_at);
create index if not exists private_test_sessions_user_id_idx on public.private_test_sessions(user_id);
create index if not exists private_test_sessions_invite_id_idx on public.private_test_sessions(invite_id);
create index if not exists private_test_sessions_status_idx on public.private_test_sessions(status);
create index if not exists private_test_events_session_id_idx on public.private_test_events(session_id);

drop trigger if exists private_test_campaigns_set_updated_at on public.private_test_campaigns;
create trigger private_test_campaigns_set_updated_at
before update on public.private_test_campaigns
for each row execute function public.set_updated_at();

drop trigger if exists private_test_invites_set_updated_at on public.private_test_invites;
create trigger private_test_invites_set_updated_at
before update on public.private_test_invites
for each row execute function public.set_updated_at();

drop trigger if exists private_test_sessions_set_updated_at on public.private_test_sessions;
create trigger private_test_sessions_set_updated_at
before update on public.private_test_sessions
for each row execute function public.set_updated_at();

drop trigger if exists private_test_survey_responses_set_updated_at on public.private_test_survey_responses;
create trigger private_test_survey_responses_set_updated_at
before update on public.private_test_survey_responses
for each row execute function public.set_updated_at();

alter table public.private_test_campaigns enable row level security;
alter table public.private_test_invites enable row level security;
alter table public.private_test_sessions enable row level security;
alter table public.private_test_survey_responses enable row level security;
alter table public.private_test_events enable row level security;

drop policy if exists "Public can view active private test invites" on public.private_test_invites;
create policy "Public can view active private test invites"
on public.private_test_invites
for select
using (
  is_active = true
  and (expires_at is null or expires_at > now())
);

drop policy if exists "Users can view own private test sessions" on public.private_test_sessions;
create policy "Users can view own private test sessions"
on public.private_test_sessions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own private test sessions" on public.private_test_sessions;
create policy "Users can insert own private test sessions"
on public.private_test_sessions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own private test sessions" on public.private_test_sessions;
create policy "Users can update own private test sessions"
on public.private_test_sessions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can view own private test survey responses" on public.private_test_survey_responses;
create policy "Users can view own private test survey responses"
on public.private_test_survey_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.private_test_sessions s
    where s.id = private_test_survey_responses.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own private test survey responses" on public.private_test_survey_responses;
create policy "Users can insert own private test survey responses"
on public.private_test_survey_responses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.private_test_sessions s
    where s.id = private_test_survey_responses.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own private test survey responses" on public.private_test_survey_responses;
create policy "Users can update own private test survey responses"
on public.private_test_survey_responses
for update
to authenticated
using (
  exists (
    select 1
    from public.private_test_sessions s
    where s.id = private_test_survey_responses.session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.private_test_sessions s
    where s.id = private_test_survey_responses.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own private test events" on public.private_test_events;
create policy "Users can insert own private test events"
on public.private_test_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.private_test_sessions s
    where s.id = private_test_events.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "Users can view own private test events" on public.private_test_events;
create policy "Users can view own private test events"
on public.private_test_events
for select
to authenticated
using (
  exists (
    select 1
    from public.private_test_sessions s
    where s.id = private_test_events.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists "Service role can manage private test campaigns" on public.private_test_campaigns;
create policy "Service role can manage private test campaigns"
on public.private_test_campaigns
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage private test invites" on public.private_test_invites;
create policy "Service role can manage private test invites"
on public.private_test_invites
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage private test sessions" on public.private_test_sessions;
create policy "Service role can manage private test sessions"
on public.private_test_sessions
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage private test survey responses" on public.private_test_survey_responses;
create policy "Service role can manage private test survey responses"
on public.private_test_survey_responses
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage private test events" on public.private_test_events;
create policy "Service role can manage private test events"
on public.private_test_events
for all
to service_role
using (true)
with check (true);
