create table if not exists public.owner_rewards_stats (
  owner_id uuid primary key references public.owners(id) on delete cascade,
  lifetime_points_rented integer not null default 0,
  tier text not null default 'base',
  updated_at timestamptz not null default now()
);

create index if not exists owner_rewards_stats_tier_idx
  on public.owner_rewards_stats (tier);

alter table public.owner_rewards_stats enable row level security;

drop policy if exists owner_rewards_stats_service_role on public.owner_rewards_stats;
create policy owner_rewards_stats_service_role
  on public.owner_rewards_stats
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists owner_rewards_stats_owner_read on public.owner_rewards_stats;
create policy owner_rewards_stats_owner_read
  on public.owner_rewards_stats
  for select
  using (
    exists (
      select 1
      from public.owners
      where owners.id = owner_rewards_stats.owner_id
        and owners.user_id = auth.uid()
    )
  );
