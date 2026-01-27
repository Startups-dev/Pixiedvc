create table if not exists public.affiliate_payout_runs (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.affiliate_payout_items (
  id uuid primary key default gen_random_uuid(),
  payout_run_id uuid not null references public.affiliate_payout_runs(id) on delete cascade,
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount_usd numeric(10,2) not null default 0,
  booking_count int not null default 0,
  booking_request_ids uuid[] not null default '{}',
  status text not null default 'scheduled',
  paid_at timestamptz,
  payout_reference text,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_payout_items_run_idx
  on public.affiliate_payout_items (payout_run_id);

create index if not exists affiliate_payout_items_affiliate_idx
  on public.affiliate_payout_items (affiliate_id);

alter table if exists public.affiliates
  add column if not exists commission_rate numeric(4,3) not null default 0.07;
