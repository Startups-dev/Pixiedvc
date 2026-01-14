create table if not exists public.release_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  environment text not null,
  release_version text null,
  description text not null,
  deployed_by text not null,
  approved_by text not null,
  deployed_at timestamptz not null,
  rollback_available boolean default true,
  notes text null
);

alter table public.release_changes enable row level security;

drop policy if exists "Release changes admin access" on public.release_changes;
create policy "Release changes admin access"
on public.release_changes
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
