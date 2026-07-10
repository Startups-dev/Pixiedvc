begin;

alter table if exists public.affiliate_clicks
  add column if not exists visitor_session_row_id uuid references public.visitor_sessions(id) on delete set null,
  add column if not exists visitor_session_id text,
  add column if not exists visitor_id text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text;

create index if not exists affiliate_clicks_visitor_session_row_idx
  on public.affiliate_clicks (visitor_session_row_id)
  where visitor_session_row_id is not null;

create index if not exists affiliate_clicks_visitor_session_id_idx
  on public.affiliate_clicks (visitor_session_id)
  where visitor_session_id is not null;

create index if not exists affiliate_clicks_visitor_id_idx
  on public.affiliate_clicks (visitor_id)
  where visitor_id is not null;

create index if not exists affiliate_clicks_utm_source_idx
  on public.affiliate_clicks (utm_source)
  where utm_source is not null;

commit;
