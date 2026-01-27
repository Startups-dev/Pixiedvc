alter table public.booking_requests
  add column if not exists max_price_per_point numeric(10,2);
