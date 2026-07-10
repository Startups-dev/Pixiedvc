begin;

alter table if exists public.booking_requests
  add column if not exists affiliate_id uuid references public.affiliates(id) on delete set null,
  add column if not exists affiliate_click_id uuid references public.affiliate_clicks(click_id) on delete set null,
  add column if not exists visitor_session_row_id uuid references public.visitor_sessions(id) on delete set null,
  add column if not exists visitor_session_id text,
  add column if not exists visitor_id text,
  add column if not exists attribution_source text,
  add column if not exists referral_utm_source text,
  add column if not exists referral_utm_medium text,
  add column if not exists referral_utm_campaign text,
  add column if not exists referral_utm_term text,
  add column if not exists referral_utm_content text;

create index if not exists booking_requests_affiliate_id_idx
  on public.booking_requests (affiliate_id)
  where affiliate_id is not null;

create index if not exists booking_requests_affiliate_click_id_idx
  on public.booking_requests (affiliate_click_id)
  where affiliate_click_id is not null;

create index if not exists booking_requests_visitor_session_row_idx
  on public.booking_requests (visitor_session_row_id)
  where visitor_session_row_id is not null;

create index if not exists booking_requests_visitor_session_id_idx
  on public.booking_requests (visitor_session_id)
  where visitor_session_id is not null;

create index if not exists booking_requests_visitor_id_idx
  on public.booking_requests (visitor_id)
  where visitor_id is not null;

create index if not exists booking_requests_attribution_source_idx
  on public.booking_requests (attribution_source)
  where attribution_source is not null;

commit;
