create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter table if exists public.owners
  add column if not exists payout_email text;

alter table if exists public.owner_memberships
  add column if not exists points_reserved integer not null default 0,
  add column if not exists points_rented integer not null default 0,
  add column if not exists points_expiration_date date,
  add column if not exists use_year_start date,
  add column if not exists use_year_end date;

create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  guest_user_id uuid references auth.users(id) on delete set null,
  resort_code text not null,
  room_type text,
  check_in date,
  check_out date,
  points_required integer,
  rental_amount_cents integer,
  status text not null default 'matched'
    check (status in ('matched','awaiting_owner_approval','approved','booked','stay_in_progress','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger rentals_updated_at
before update on public.rentals
for each row execute function public.set_updated_at();

create index if not exists rentals_owner_idx
  on public.rentals (owner_user_id, status, check_in);

create table if not exists public.rental_milestones (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals(id) on delete cascade,
  code text not null
    check (code in (
      'matched',
      'guest_verified',
      'payment_verified',
      'booking_package_sent',
      'agreement_sent',
      'owner_approved',
      'owner_booked',
      'disney_confirmation_uploaded',
      'payout_70_released',
      'check_in',
      'check_out',
      'payout_30_released',
      'testimonial_requested',
      'archived'
    )),
  status text not null default 'pending'
    check (status in ('pending','completed','blocked')),
  occurred_at timestamptz,
  meta jsonb,
  created_at timestamptz not null default now(),
  unique (rental_id, code)
);

create index if not exists rental_milestones_rental_idx
  on public.rental_milestones (rental_id, status);

create table if not exists public.rental_documents (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals(id) on delete cascade,
  type text not null
    check (type in ('agreement_pdf','disney_confirmation_email','invoice','booking_package','other')),
  storage_path text not null,
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  meta jsonb
);

create index if not exists rental_documents_rental_idx
  on public.rental_documents (rental_id, created_at desc);

create table if not exists public.payout_ledger (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  stage integer not null check (stage in (70, 30)),
  amount_cents integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending','eligible','released','failed')),
  eligible_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (rental_id, stage)
);

create index if not exists payout_ledger_owner_idx
  on public.payout_ledger (owner_user_id, status, eligible_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, read_at, created_at desc);

create table if not exists public.rental_exceptions (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('modification','cancellation')),
  message text,
  status text not null default 'open'
    check (status in ('open','in_review','resolved')),
  created_at timestamptz not null default now()
);

create index if not exists rental_exceptions_owner_idx
  on public.rental_exceptions (owner_user_id, status, created_at desc);
