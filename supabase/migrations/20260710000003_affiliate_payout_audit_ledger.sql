begin;

alter table if exists public.affiliate_conversions
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists voided_by uuid references auth.users(id) on delete set null,
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.affiliate_payout_runs
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists paid_by uuid references auth.users(id) on delete set null,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payment_notes text,
  add column if not exists voided_by uuid references auth.users(id) on delete set null,
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.affiliate_payout_items
  add column if not exists booking_request_id uuid references public.booking_requests(id) on delete set null,
  add column if not exists booking_amount_usd numeric(10,2),
  add column if not exists commission_rate numeric(4,3),
  add column if not exists commission_amount_usd numeric(10,2),
  add column if not exists original_amount_usd numeric(10,2),
  add column if not exists paid_by uuid references auth.users(id) on delete set null,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payment_notes text,
  add column if not exists voided_by uuid references auth.users(id) on delete set null,
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text,
  add column if not exists adjusted_by uuid references auth.users(id) on delete set null,
  add column if not exists adjusted_at timestamptz,
  add column if not exists adjustment_reason text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists affiliate_conversions_reviewed_at_idx
  on public.affiliate_conversions (reviewed_at desc)
  where reviewed_at is not null;

create index if not exists affiliate_payout_runs_created_by_idx
  on public.affiliate_payout_runs (created_by)
  where created_by is not null;

create index if not exists affiliate_payout_runs_paid_by_idx
  on public.affiliate_payout_runs (paid_by)
  where paid_by is not null;

create index if not exists affiliate_payout_runs_paid_at_idx
  on public.affiliate_payout_runs (paid_at desc)
  where paid_at is not null;

create index if not exists affiliate_payout_items_booking_request_idx
  on public.affiliate_payout_items (booking_request_id)
  where booking_request_id is not null;

create index if not exists affiliate_payout_items_paid_by_idx
  on public.affiliate_payout_items (paid_by)
  where paid_by is not null;

create index if not exists affiliate_payout_items_paid_at_idx
  on public.affiliate_payout_items (paid_at desc)
  where paid_at is not null;

drop trigger if exists affiliate_payout_runs_updated_at on public.affiliate_payout_runs;
create trigger affiliate_payout_runs_updated_at
before update on public.affiliate_payout_runs
for each row execute function public.set_updated_at();

drop trigger if exists affiliate_payout_items_updated_at on public.affiliate_payout_items;
create trigger affiliate_payout_items_updated_at
before update on public.affiliate_payout_items
for each row execute function public.set_updated_at();

commit;
