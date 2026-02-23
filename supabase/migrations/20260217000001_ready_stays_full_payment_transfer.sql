-- Ready Stays full-payment + transfer lifecycle support.

alter table if exists public.owners
  add column if not exists full_legal_name text;

alter type booking_status add value if not exists 'details_complete';
alter type booking_status add value if not exists 'pending_payment';
alter type booking_status add value if not exists 'paid_waiting_owner_transfer';
alter type booking_status add value if not exists 'transferred';

alter table if exists public.booking_requests
  add column if not exists payment_status text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists transferred_at timestamptz,
  add column if not exists disney_confirmation_number text,
  add column if not exists booking_package_emailed_at timestamptz;

alter table if exists public.ready_stays
  add column if not exists sold_booking_request_id uuid references public.booking_requests(id) on delete set null;

create index if not exists ready_stays_sold_booking_request_id_idx
  on public.ready_stays (sold_booking_request_id)
  where sold_booking_request_id is not null;
