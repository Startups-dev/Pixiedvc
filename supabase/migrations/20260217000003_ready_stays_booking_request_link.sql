alter table if exists public.ready_stays
  add column if not exists booking_request_id uuid references public.booking_requests(id) on delete set null;

create index if not exists ready_stays_booking_request_id_idx
  on public.ready_stays (booking_request_id)
  where booking_request_id is not null;
