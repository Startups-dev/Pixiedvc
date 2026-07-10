create index if not exists booking_requests_affiliate_created_idx
  on public.booking_requests (affiliate_id, created_at desc)
  where affiliate_id is not null;

create index if not exists affiliate_conversions_affiliate_status_confirmed_idx
  on public.affiliate_conversions (affiliate_id, status, confirmed_at desc);

create index if not exists affiliate_payout_items_affiliate_status_created_idx
  on public.affiliate_payout_items (affiliate_id, status, created_at desc);
