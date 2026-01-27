-- Allow renters to view their own booking requests.
alter table public.booking_requests enable row level security;

drop policy if exists "Booking requests – renter select" on public.booking_requests;
create policy "Booking requests – renter select"
on public.booking_requests
for select
using (renter_id = auth.uid());
