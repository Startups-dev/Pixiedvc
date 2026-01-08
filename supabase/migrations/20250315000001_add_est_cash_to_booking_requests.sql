alter table public.booking_requests
  add column if not exists est_cash numeric(12,2);
