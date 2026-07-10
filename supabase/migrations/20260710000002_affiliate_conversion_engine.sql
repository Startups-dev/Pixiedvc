begin;

-- Phase 3: affiliate conversions are now created by the canonical
-- server-side conversion engine after real confirmation/payment eligibility
-- checks. Disable the older status-only trigger while preserving all rows.
drop trigger if exists booking_requests_affiliate_conversion on public.booking_requests;

alter table if exists public.affiliate_conversions
  add column if not exists conversion_source text,
  add column if not exists rental_id uuid references public.rentals(id) on delete set null,
  add column if not exists confirmed_event text,
  add column if not exists eligibility_confirmed_at timestamptz,
  add column if not exists booking_amount_source text;

create index if not exists affiliate_conversions_booking_request_idx
  on public.affiliate_conversions (booking_request_id);

create index if not exists affiliate_conversions_status_created_idx
  on public.affiliate_conversions (status, created_at desc);

create index if not exists affiliate_conversions_rental_idx
  on public.affiliate_conversions (rental_id)
  where rental_id is not null;

commit;
