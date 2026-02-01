create unique index if not exists booking_requests_active_signature_unique
on public.booking_requests (
  renter_id,
  primary_resort_id,
  check_in,
  check_out,
  total_points,
  primary_room
)
where status in ('draft', 'submitted', 'pending_match', 'pending_owner');
