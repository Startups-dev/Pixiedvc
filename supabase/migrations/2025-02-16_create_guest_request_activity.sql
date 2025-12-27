create table if not exists public.guest_request_activity (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.renter_requests(id) on delete cascade,
  author_id uuid references auth.users(id),
  kind text not null default 'note' check (kind in ('note','status_change')),
  body text,
  from_status text,
  to_status text,
  created_at timestamptz not null default now()
);

comment on table public.guest_request_activity is 'Internal notes and status changes for concierge handling of renter requests.';
comment on column public.guest_request_activity.kind is 'note (free-form) or status_change entry';
comment on column public.guest_request_activity.from_status is 'Previous status when recording a status change';
comment on column public.guest_request_activity.to_status is 'New status when recording a status change';
