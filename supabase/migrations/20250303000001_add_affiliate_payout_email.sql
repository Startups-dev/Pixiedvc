alter table if exists public.affiliates
  add column if not exists payout_email text;
