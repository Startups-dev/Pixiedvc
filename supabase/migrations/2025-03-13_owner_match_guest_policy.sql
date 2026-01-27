alter table public.booking_request_guests enable row level security;

drop policy if exists "Owners can view matched booking guests" on public.booking_request_guests;
create policy "Owners can view matched booking guests"
on public.booking_request_guests
for select
using (
  exists (
    select 1
    from public.booking_matches m
    join public.owners o on o.id = m.owner_id
    where m.booking_id = booking_request_guests.booking_id
      and (o.user_id = auth.uid() or o.id = auth.uid())
  )
);
