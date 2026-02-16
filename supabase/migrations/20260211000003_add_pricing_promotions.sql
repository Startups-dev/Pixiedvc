-- Add pricing promotions configuration for enrollment windows and margin floors.
-- Runbook: creates pricing_promotions table and seeds a disabled "Founders Launch" promo.
-- Idempotent: safe to re-run.

create table if not exists public.pricing_promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default false,
  starts_at timestamptz null,
  ends_at timestamptz null,
  enrollment_required boolean not null default true,
  guest_max_reward_per_point_cents int not null default 200,
  owner_max_bonus_per_point_cents int not null default 200,
  min_spread_per_point_cents int not null default 200,
  created_at timestamptz not null default now()
);

insert into public.pricing_promotions (
  name,
  is_active,
  enrollment_required,
  guest_max_reward_per_point_cents,
  owner_max_bonus_per_point_cents,
  min_spread_per_point_cents
)
select
  'Founders Launch',
  false,
  true,
  200,
  200,
  200
where not exists (
  select 1 from public.pricing_promotions where name = 'Founders Launch'
);
