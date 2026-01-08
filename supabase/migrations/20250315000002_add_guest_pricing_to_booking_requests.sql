alter table public.booking_requests
  add column if not exists guest_rate_per_point_cents integer,
  add column if not exists guest_total_cents integer;
