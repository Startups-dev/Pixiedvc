create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid references public.booking_requests(id) on delete set null,
  match_id uuid references public.booking_matches(id) on delete set null,
  direction text not null check (direction in ('in','out')),
  payment_type text not null check (
    payment_type in (
      'deposit',
      'booking',
      'checkin',
      'owner_payout',
      'promo_bonus',
      'manual_adjustment'
    )
  ),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  processor text not null default 'manual' check (processor in ('manual','stripe','paypal','other')),
  processor_ref text null,
  status text not null default 'pending' check (
    status in ('pending','succeeded','failed','refunded','cancelled')
  ),
  paid_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_match_id_idx
  on public.payments (match_id);

create index if not exists payments_booking_request_id_idx
  on public.payments (booking_request_id);

create index if not exists payments_status_idx
  on public.payments (status);

create unique index if not exists payments_match_type_in_unique
  on public.payments (match_id, payment_type, direction)
  where direction = 'in';

create table if not exists public.payment_splits (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('platform','owner')),
  owner_id bigint references public.owner_memberships(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.promotion_adjustments (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid references public.booking_requests(id) on delete set null,
  match_id uuid references public.booking_matches(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  reason text null,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
alter table public.payment_splits enable row level security;
alter table public.promotion_adjustments enable row level security;

drop policy if exists "Payments admin access" on public.payments;
create policy "Payments admin access"
on public.payments
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Payment splits admin access" on public.payment_splits;
create policy "Payment splits admin access"
on public.payment_splits
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Promotion adjustments admin access" on public.promotion_adjustments;
create policy "Promotion adjustments admin access"
on public.promotion_adjustments
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
