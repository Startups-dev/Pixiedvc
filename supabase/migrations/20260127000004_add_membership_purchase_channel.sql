alter table public.owner_memberships
  add column if not exists acquired_at date,
  add column if not exists purchase_channel text not null default 'unknown';

alter table public.owner_memberships
  drop constraint if exists owner_memberships_purchase_channel_check;

alter table public.owner_memberships
  add constraint owner_memberships_purchase_channel_check
  check (purchase_channel in ('direct','resale','unknown'));
