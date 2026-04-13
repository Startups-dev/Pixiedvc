create table if not exists public.point_liquidation_requests (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid references public.owners(id) on delete set null,
  home_resort_id uuid references public.resorts(id) on delete set null,
  points_available integer not null check (points_available > 0),
  expiration_date date not null,
  travel_window_start date,
  travel_window_end date,
  room_type text,
  target_price_per_point_cents integer check (target_price_per_point_cents is null or target_price_per_point_cents > 0),
  flexibility_notes text,
  newsletter_opt_in boolean not null default false,
  featured_in_newsletter boolean not null default false,
  admin_approved boolean not null default false,
  public_visibility boolean not null default false,
  status text not null default 'pending_review' check (
    status in ('pending_review', 'approved', 'rejected', 'featured', 'closed')
  ),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (travel_window_start is null or travel_window_end is null or travel_window_end >= travel_window_start)
);

create index if not exists point_liquidation_requests_owner_idx
  on public.point_liquidation_requests (owner_user_id, created_at desc);

create index if not exists point_liquidation_requests_status_idx
  on public.point_liquidation_requests (status, admin_approved, created_at desc);

create index if not exists point_liquidation_requests_newsletter_idx
  on public.point_liquidation_requests (featured_in_newsletter, newsletter_opt_in, admin_approved);

drop trigger if exists point_liquidation_requests_updated_at on public.point_liquidation_requests;
create trigger point_liquidation_requests_updated_at
before update on public.point_liquidation_requests
for each row execute function public.set_updated_at();
