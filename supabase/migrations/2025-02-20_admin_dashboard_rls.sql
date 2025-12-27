-- Ensure admins can read booking requests and owner-related tables used in the dashboard

-- Booking requests: add admin read policy
alter table public.booking_requests enable row level security;

drop policy if exists "Booking – admin select" on public.booking_requests;
create policy "Booking – admin select"
on public.booking_requests
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- Owner memberships: allow admins to read related data
alter table public.owner_memberships enable row level security;

drop policy if exists "Owner memberships – admin select" on public.owner_memberships;
create policy "Owner memberships – admin select"
on public.owner_memberships
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- Owner documents: allow admins to read compliance data
alter table public.owner_documents enable row level security;

drop policy if exists "Owner documents – admin select" on public.owner_documents;
create policy "Owner documents – admin select"
on public.owner_documents
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
