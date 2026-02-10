alter table public.owner_memberships
  add column if not exists matching_mode text not null default 'premium_only',
  add column if not exists allow_standard_rate_fallback boolean not null default false,
  add column if not exists premium_only_listed_at timestamptz,
  add column if not exists last_fallback_prompted_at timestamptz,
  add column if not exists fallback_remind_at timestamptz;

comment on column public.owner_memberships.matching_mode is 'premium_only | premium_then_standard';
comment on column public.owner_memberships.allow_standard_rate_fallback is 'Owner has allowed standard (7-month) matching';
comment on column public.owner_memberships.premium_only_listed_at is 'Timestamp when owner opted into premium-only listing';
comment on column public.owner_memberships.last_fallback_prompted_at is 'Last time owner was prompted to allow standard matching';
comment on column public.owner_memberships.fallback_remind_at is 'Next scheduled reminder time for premium-only fallback prompt';
