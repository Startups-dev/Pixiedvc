create table if not exists public.owner_points_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  owner_membership_id uuid not null references public.owner_memberships(id) on delete cascade,
  event_type text not null,
  points_amount int,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists owner_points_events_owner_created_idx
  on public.owner_points_events (owner_id, created_at desc);

alter table public.owner_points_events enable row level security;

drop policy if exists "Owners can view points events" on public.owner_points_events;
create policy "Owners can view points events"
  on public.owner_points_events
  for select
  using (
    exists (
      select 1
      from public.owners o
      where o.id = owner_points_events.owner_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "Owners can insert points events" on public.owner_points_events;
create policy "Owners can insert points events"
  on public.owner_points_events
  for insert
  with check (
    exists (
      select 1
      from public.owners o
      where o.id = owner_points_events.owner_id
        and o.user_id = auth.uid()
    )
  );

drop policy if exists "Service role can manage points events" on public.owner_points_events;
create policy "Service role can manage points events"
  on public.owner_points_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
