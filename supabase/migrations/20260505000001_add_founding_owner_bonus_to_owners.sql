alter table public.owners
  add column if not exists founding_owner_bonus_cents_per_point integer not null default 0,
  add column if not exists founding_owner_bonus_started_at timestamptz,
  add column if not exists founding_owner_bonus_expires_at timestamptz,
  add column if not exists founding_owner_granted_at timestamptz,
  add column if not exists founding_owner_promotion_id uuid;

create index if not exists owners_founding_owner_bonus_expires_at_idx
  on public.owners (founding_owner_bonus_expires_at);

create index if not exists owners_founding_owner_promotion_id_idx
  on public.owners (founding_owner_promotion_id);
