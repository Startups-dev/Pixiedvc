alter table public.booking_matches enable row level security;

drop policy if exists "Owners can view booking matches" on public.booking_matches;
create policy "Owners can view booking matches"
on public.booking_matches
for select
using (
  exists (
    select 1
    from public.owners o
    where o.id = booking_matches.owner_id
      and (o.user_id = auth.uid() or o.id = auth.uid())
  )
);

drop policy if exists "Owners can view matched booking requests" on public.booking_requests;
create policy "Owners can view matched booking requests"
on public.booking_requests
for select
using (
  exists (
    select 1
    from public.booking_matches m
    join public.owners o on o.id = m.owner_id
    where m.booking_id = booking_requests.id
      and (o.user_id = auth.uid() or o.id = auth.uid())
  )
);
