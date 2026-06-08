create table if not exists public.expiring_point_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  resort text,
  points integer check (points is null or points > 0),
  expiration_date date,
  reservation_details text,
  desired_payout text,
  urgency text not null default 'flexible' check (
    urgency in ('flexible', 'within_60_days', 'within_30_days', 'immediate')
  ),
  notes text,
  status text not null default 'pending' check (
    status in ('pending', 'reviewing', 'approved', 'declined', 'closed')
  ),
  reviewed_at timestamptz
);

create index if not exists expiring_point_requests_status_idx
  on public.expiring_point_requests (status, created_at desc);

create index if not exists expiring_point_requests_email_idx
  on public.expiring_point_requests (email, created_at desc);

drop trigger if exists expiring_point_requests_updated_at on public.expiring_point_requests;
create trigger expiring_point_requests_updated_at
before update on public.expiring_point_requests
for each row execute function public.set_updated_at();
