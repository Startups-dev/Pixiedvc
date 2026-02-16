-- Add guest rewards audit totals to booking_requests.
alter table if exists public.booking_requests
  add column if not exists guest_total_cents_original integer,
  add column if not exists guest_total_cents_final integer;
