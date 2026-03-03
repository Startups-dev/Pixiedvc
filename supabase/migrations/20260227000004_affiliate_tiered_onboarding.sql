alter type public.affiliate_status add value if not exists 'pending_review';
alter type public.affiliate_status add value if not exists 'verified';
alter type public.affiliate_status add value if not exists 'suspended';
alter type public.affiliate_status add value if not exists 'rejected';

alter table if exists public.affiliates
  add column if not exists name text,
  add column if not exists website text,
  add column if not exists social_links jsonb not null default '[]'::jsonb,
  add column if not exists promotion_description text,
  add column if not exists traffic_estimate text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists suspend_reason text;

update public.affiliates
set
  name = coalesce(name, display_name),
  status = case
    when status = 'active' then 'verified'::public.affiliate_status
    when status = 'paused' then 'suspended'::public.affiliate_status
    when status = 'closed' then 'rejected'::public.affiliate_status
    else status
  end,
  tier = case
    when tier in ('standard', 'base') then 'basic'
    else tier
  end
where true;

alter table if exists public.affiliates
  alter column status set default 'pending_review'::public.affiliate_status,
  alter column tier set default 'basic';

create index if not exists affiliates_status_tier_idx
  on public.affiliates (status, tier, created_at desc);

alter table if exists public.affiliates
  drop constraint if exists affiliates_suspend_reason_required;

alter table if exists public.affiliates
  add constraint affiliates_suspend_reason_required
  check (
    status <> 'suspended'::public.affiliate_status
    or length(trim(coalesce(suspend_reason, ''))) > 0
  );
