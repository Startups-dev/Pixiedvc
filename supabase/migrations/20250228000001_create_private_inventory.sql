do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%role%';

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.profiles
  add constraint profiles_role_check
    check (role in ('owner','guest','staff','admin'));

create table if not exists public.private_inventory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  urgency_window text not null check (urgency_window in ('24h','48h','7d')),
  points_expiry_date date null,
  use_year text null,
  points_available int not null check(points_available >= 0),
  home_resort text null,
  resorts_allowed text[] null,
  travel_date_flexibility text null,
  already_booked boolean not null default false,
  existing_confirmation_number text null,
  existing_reservation_details jsonb null,
  min_net_to_owner_usd numeric(10,2) null,
  fastest_possible boolean not null default false,
  status text not null default 'submitted'
    check (status in ('submitted','reviewed','approved','offered','used','closed','rejected')),
  internal_notes text null,
  assigned_to uuid null references auth.users(id),
  offered_to_guest_email text null,
  hold_until timestamptz null,
  closed_reason text null
);

create index if not exists private_inventory_status_idx
  on public.private_inventory (status);

create index if not exists private_inventory_expiry_idx
  on public.private_inventory (points_expiry_date);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger private_inventory_updated_at
before update on public.private_inventory
for each row execute function public.set_updated_at();

alter table public.private_inventory enable row level security;

create policy "Owners can insert private inventory"
  on public.private_inventory
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.owners o
      where o.id = auth.uid()
        and o.verification = 'verified'
    )
  );

create policy "Owners can view their private inventory"
  on public.private_inventory
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Owners can update submitted inventory"
  on public.private_inventory
  for update
  to authenticated
  using (owner_id = auth.uid() and status = 'submitted')
  with check (owner_id = auth.uid() and status = 'submitted');

create policy "Staff can view private inventory"
  on public.private_inventory
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('staff','admin')
    )
  );

create policy "Staff can update private inventory"
  on public.private_inventory
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('staff','admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('staff','admin')
    )
  );
