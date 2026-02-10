create table if not exists public.concierge_liquidation_intents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_membership_id bigint not null references public.owner_memberships(id) on delete cascade,
  reason text null,
  created_at timestamptz not null default now(),
  status text not null default 'new'
);

create index if not exists concierge_liquidation_intents_owner_created_idx
  on public.concierge_liquidation_intents (owner_id, created_at desc);

alter table public.concierge_liquidation_intents enable row level security;

drop policy if exists "Owners can view liquidation intents" on public.concierge_liquidation_intents;
create policy "Owners can view liquidation intents"
  on public.concierge_liquidation_intents
  for select
  using (owner_id = auth.uid());

drop policy if exists "Owners can insert liquidation intents" on public.concierge_liquidation_intents;
create policy "Owners can insert liquidation intents"
  on public.concierge_liquidation_intents
  for insert
  with check (owner_id = auth.uid());

drop policy if exists "Service role can manage liquidation intents" on public.concierge_liquidation_intents;
create policy "Service role can manage liquidation intents"
  on public.concierge_liquidation_intents
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
