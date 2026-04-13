alter table public.point_liquidation_requests
add column if not exists urgency_level text not null default 'moderate'
check (urgency_level in ('not_urgent', 'moderate', 'urgent'));

create index if not exists point_liquidation_requests_urgency_expiration_idx
  on public.point_liquidation_requests (urgency_level, expiration_date, created_at desc);
