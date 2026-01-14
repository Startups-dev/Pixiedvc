-- Tax jurisdictions and rates
create table if not exists public.tax_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  region_code text null,
  city text null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists tax_jurisdictions_unique_idx
  on public.tax_jurisdictions (country_code, region_code, city, name);

create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.tax_jurisdictions(id) on delete cascade,
  tax_type text not null check (tax_type in ('GST','HST','VAT','GST_AU','ISS','OCCUPANCY','LEVY','OTHER')),
  rate_bps integer not null check (rate_bps >= 0),
  effective_from date not null default current_date,
  effective_to date null,
  applies_to text not null check (applies_to in ('lodging','service_fee','both')),
  notes text null
);

create unique index if not exists tax_rates_unique_idx
  on public.tax_rates (jurisdiction_id, tax_type, applies_to, effective_from);

-- Link resorts to tax jurisdiction
alter table public.resorts
  add column if not exists tax_jurisdiction_id uuid references public.tax_jurisdictions(id);

-- Transactions ledger
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid references public.booking_requests(id) on delete set null,
  match_id uuid references public.booking_matches(id) on delete set null,
  direction text not null check (direction in ('in','out')),
  txn_type text not null check (
    txn_type in (
      'deposit',
      'booking',
      'checkin',
      'owner_payout',
      'tax_collect',
      'tax_remit',
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
  meta jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_match_id_idx
  on public.transactions (match_id);

create index if not exists transactions_booking_request_id_idx
  on public.transactions (booking_request_id);

create index if not exists transactions_status_idx
  on public.transactions (status);

create table if not exists public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('platform','owner','tax_authority')),
  owner_id bigint null references public.owner_memberships(id) on delete set null,
  jurisdiction_id uuid null references public.tax_jurisdictions(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0)
);

alter table public.tax_jurisdictions enable row level security;
alter table public.tax_rates enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_splits enable row level security;

drop policy if exists "Tax jurisdictions admin access" on public.tax_jurisdictions;
create policy "Tax jurisdictions admin access"
on public.tax_jurisdictions
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

drop policy if exists "Tax rates admin access" on public.tax_rates;
create policy "Tax rates admin access"
on public.tax_rates
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

drop policy if exists "Transactions admin access" on public.transactions;
create policy "Transactions admin access"
on public.transactions
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

drop policy if exists "Transaction splits admin access" on public.transaction_splits;
create policy "Transaction splits admin access"
on public.transaction_splits
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

-- Seed starter tax jurisdictions
insert into public.tax_jurisdictions (country_code, region_code, city, name, is_active)
values
  ('CA', 'ON', null, 'Canada - Ontario (HST)', true),
  ('CA', 'NS', null, 'Canada - Nova Scotia (HST)', true),
  ('CA', 'NB', null, 'Canada - New Brunswick (HST)', true),
  ('CA', 'NL', null, 'Canada - Newfoundland and Labrador (HST)', true),
  ('CA', 'PE', null, 'Canada - Prince Edward Island (HST)', true),
  ('CA', null, null, 'Canada - GST (non-HST provinces)', true),
  ('GB', null, null, 'United Kingdom - VAT', true),
  ('MX', null, null, 'Mexico - VAT Federal', true),
  ('AU', null, null, 'Australia - GST', true),
  ('AU', 'VIC', null, 'Australia - Victoria Short Stay Levy', true),
  ('AU', 'ACT', null, 'Australia - ACT Short Stay Levy', false),
  ('BR', null, null, 'Brazil - ISS (configure per municipality)', false)
on conflict do nothing;

-- Seed starter tax rates
insert into public.tax_rates (jurisdiction_id, tax_type, rate_bps, applies_to, notes)
select id, 'HST', 1300, 'lodging', 'Ontario HST 13%'
from public.tax_jurisdictions where country_code = 'CA' and region_code = 'ON'
on conflict do nothing;

insert into public.tax_rates (jurisdiction_id, tax_type, rate_bps, applies_to, notes)
select id, 'HST', 1400, 'lodging', 'Nova Scotia HST 14% (as of Apr 1 2025)'
from public.tax_jurisdictions where country_code = 'CA' and region_code = 'NS'
on conflict do nothing;

insert into public.tax_rates (jurisdiction_id, tax_type, rate_bps, applies_to, notes)
select id, 'HST', 1500, 'lodging', 'HST 15%'
from public.tax_jurisdictions where country_code = 'CA' and region_code in ('NB','NL','PE')
on conflict do nothing;

insert into public.tax_rates (jurisdiction_id, tax_type, rate_bps, applies_to, notes)
select id, 'GST', 500, 'lodging', 'GST 5%'
from public.tax_jurisdictions where country_code = 'CA' and region_code is null and name like 'Canada - GST%'
on conflict do nothing;

insert into public.tax_rates (jurisdiction_id, tax_type, rate_bps, applies_to, notes)
select id, 'VAT', 2000, 'lodging', 'UK VAT baseline'
from public.tax_jurisdictions where country_code = 'GB'
on conflict do nothing;

insert into public.tax_rates (jurisdiction_id, tax_type, rate_bps, applies_to, notes)
select id, 'VAT', 1600, 'lodging', 'Mexico IVA baseline'
from public.tax_jurisdictions where country_code = 'MX'
on conflict do nothing;

insert into public.tax_rates (jurisdiction_id, tax_type, rate_bps, applies_to, notes)
select id, 'GST_AU', 1000, 'lodging', 'Australia GST 10%'
from public.tax_jurisdictions where country_code = 'AU' and region_code is null
on conflict do nothing;

insert into public.tax_rates (jurisdiction_id, tax_type, rate_bps, applies_to, notes)
select id, 'LEVY', 750, 'lodging', 'Victoria short stay levy 7.5% (effective Jan 1 2025)'
from public.tax_jurisdictions where country_code = 'AU' and region_code = 'VIC'
on conflict do nothing;

insert into public.tax_rates (jurisdiction_id, tax_type, rate_bps, applies_to, notes)
select id, 'LEVY', 0, 'lodging', 'ACT levy rate TBD; configure when available'
from public.tax_jurisdictions where country_code = 'AU' and region_code = 'ACT'
on conflict do nothing;

insert into public.tax_rates (jurisdiction_id, tax_type, rate_bps, applies_to, notes)
select id, 'ISS', 0, 'lodging', 'ISS varies by municipality (2-5%); configure before activation'
from public.tax_jurisdictions where country_code = 'BR'
on conflict do nothing;
