alter table public.booking_requests
  add column if not exists availability_status text,
  add column if not exists availability_checked_at timestamptz,
  add column if not exists availability_notes text;

create index if not exists booking_requests_availability_status_idx
  on public.booking_requests (availability_status);

create index if not exists booking_requests_availability_checked_at_idx
  on public.booking_requests (availability_checked_at);
