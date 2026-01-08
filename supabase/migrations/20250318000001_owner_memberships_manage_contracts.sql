alter table public.owner_memberships
  add column if not exists home_resort text;

create unique index if not exists owner_memberships_owner_resort_use_contract_uniq
  on public.owner_memberships (owner_id, resort_id, use_year, contract_year);

update public.owner_memberships m
set home_resort = r.calculator_code
from public.resorts r
where m.resort_id = r.id
  and m.home_resort is null;

alter table public.owner_memberships enable row level security;

drop policy if exists "Owner memberships – owner select" on public.owner_memberships;
create policy "Owner memberships – owner select"
on public.owner_memberships
for select
using (
  exists (
    select 1
    from public.owners o
    where o.id = owner_memberships.owner_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Owner memberships – owner insert" on public.owner_memberships;
create policy "Owner memberships – owner insert"
on public.owner_memberships
for insert
with check (
  exists (
    select 1
    from public.owners o
    where o.id = owner_memberships.owner_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Owner memberships – owner update" on public.owner_memberships;
create policy "Owner memberships – owner update"
on public.owner_memberships
for update
using (
  exists (
    select 1
    from public.owners o
    where o.id = owner_memberships.owner_id
      and o.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.owners o
    where o.id = owner_memberships.owner_id
      and o.user_id = auth.uid()
  )
);
