alter table public.owners
  add column if not exists lifecycle_status text not null default 'active'
    check (lifecycle_status in ('active', 'suspended', 'deactivated')),
  add column if not exists lifecycle_status_changed_at timestamptz,
  add column if not exists lifecycle_status_changed_by uuid references auth.users(id) on delete set null,
  add column if not exists lifecycle_status_reason text;

create index if not exists owners_lifecycle_status_idx
  on public.owners (lifecycle_status, created_at desc);

comment on column public.owners.lifecycle_status is
  'Owner account lifecycle status. active owners can participate in new matching/listing; suspended/deactivated owners are preserved but excluded from new inventory.';

create or replace function public.owner_has_platform_activity(p_owner_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  has_activity boolean;
begin
  if to_regclass('public.owner_memberships') is not null then
    select exists (select 1 from public.owner_memberships where owner_id = p_owner_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.rentals') is not null then
    select exists (select 1 from public.rentals where owner_id = p_owner_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.booking_matches') is not null then
    select exists (select 1 from public.booking_matches where owner_id = p_owner_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.contracts') is not null then
    execute 'select exists (select 1 from public.contracts where owner_id = $1)' using p_owner_id into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.payouts') is not null then
    execute 'select exists (select 1 from public.payouts where owner_id = $1)' using p_owner_id into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.quotes') is not null then
    execute 'select exists (select 1 from public.quotes where owner_id = $1)' using p_owner_id into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.point_liquidation_requests') is not null then
    select exists (
      select 1
      from public.point_liquidation_requests plr
      join public.owners o on o.id = p_owner_id
      where plr.owner_id = p_owner_id
         or plr.owner_user_id = o.user_id
    ) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.owner_comments') is not null then
    select exists (select 1 from public.owner_comments where owner_id = p_owner_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.owner_documents') is not null then
    select exists (select 1 from public.owner_documents where owner_id = p_owner_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.owner_rewards_stats') is not null then
    select exists (select 1 from public.owner_rewards_stats where owner_id = p_owner_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.owner_verification_events') is not null then
    select exists (select 1 from public.owner_verification_events where owner_id = p_owner_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.ready_stays') is not null then
    select exists (
      select 1
      from public.ready_stays rs
      join public.owners o on o.user_id = rs.owner_id
      where o.id = p_owner_id
    ) into has_activity;
    if has_activity then return true; end if;
  end if;

  return false;
end;
$$;

create or replace function public.owner_profile_has_platform_activity(p_profile_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  has_activity boolean;
begin
  if to_regclass('public.owners') is not null then
    select exists (
      select 1
      from public.owners o
      where o.user_id = p_profile_id
        and public.owner_has_platform_activity(o.id)
    ) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.ready_stays') is not null then
    select exists (select 1 from public.ready_stays where owner_id = p_profile_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.rentals') is not null then
    select exists (select 1 from public.rentals where owner_user_id = p_profile_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.point_liquidation_requests') is not null then
    select exists (select 1 from public.point_liquidation_requests where owner_user_id = p_profile_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.private_inventory') is not null then
    select exists (select 1 from public.private_inventory where owner_id = p_profile_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.concierge_liquidation_intents') is not null then
    select exists (select 1 from public.concierge_liquidation_intents where owner_id = p_profile_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.owner_verifications') is not null then
    select exists (select 1 from public.owner_verifications where owner_id = p_profile_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  if to_regclass('public.owner_profiles') is not null then
    select exists (select 1 from public.owner_profiles where user_id = p_profile_id) into has_activity;
    if has_activity then return true; end if;
  end if;

  return false;
end;
$$;

create or replace function public.prevent_owner_delete_with_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.owner_has_platform_activity(old.id) then
    raise exception 'owner_has_platform_activity_deactivate_instead'
      using errcode = '23503',
            detail = 'Owners with memberships, rentals, ready stays, matches, contracts, payouts, quotes, or liquidation requests must be deactivated instead of deleted.';
  end if;

  return old;
end;
$$;

create or replace function public.prevent_owner_profile_delete_with_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.owner_profile_has_platform_activity(old.id) then
    raise exception 'owner_profile_has_platform_activity_deactivate_instead'
      using errcode = '23503',
            detail = 'Profiles with owner platform activity must be deactivated instead of deleted.';
  end if;

  return old;
end;
$$;

create or replace function public.prevent_auth_user_delete_with_owner_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.owner_profile_has_platform_activity(old.id) then
    raise exception 'auth_user_has_owner_platform_activity_deactivate_instead'
      using errcode = '23503',
            detail = 'Auth users with owner platform activity must be deactivated instead of deleted.';
  end if;

  return old;
end;
$$;

create or replace function public.prevent_inactive_owner_membership_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_status text;
begin
  select lifecycle_status into owner_status
  from public.owners
  where id = new.owner_id;

  if coalesce(owner_status, 'active') = 'active' then
    return new;
  end if;

  if tg_op = 'INSERT' and coalesce(new.points_available, 0) > 0 then
    raise exception 'inactive_owner_membership_inventory_blocked'
      using errcode = '23503',
            detail = 'Inactive owners cannot receive new available membership inventory.';
  end if;

  if tg_op = 'UPDATE' then
    if coalesce(new.points_available, 0) > coalesce(old.points_available, 0) then
      raise exception 'inactive_owner_membership_inventory_blocked'
        using errcode = '23503',
              detail = 'Inactive owners cannot increase available membership inventory.';
    end if;

    if coalesce(new.allow_standard_rate_fallback, false)
      and not coalesce(old.allow_standard_rate_fallback, false) then
      raise exception 'inactive_owner_membership_fallback_blocked'
        using errcode = '23503',
              detail = 'Inactive owners cannot enable standard-rate fallback matching.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_inactive_owner_use_year_inventory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_status text;
begin
  select o.lifecycle_status into owner_status
  from public.owner_memberships om
  join public.owners o on o.id = om.owner_id
  where om.id = new.owner_membership_id;

  if coalesce(owner_status, 'active') = 'active' then
    return new;
  end if;

  if tg_op = 'INSERT' and coalesce(new.available, 0) > 0 then
    raise exception 'inactive_owner_use_year_inventory_blocked'
      using errcode = '23503',
            detail = 'Inactive owners cannot receive new available use-year point inventory.';
  end if;

  if tg_op = 'UPDATE' then
    if coalesce(new.available, 0) > coalesce(old.available, 0) then
      raise exception 'inactive_owner_use_year_inventory_blocked'
        using errcode = '23503',
              detail = 'Inactive owners cannot increase available use-year point inventory.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_owner_delete_with_activity on public.owners;
create trigger prevent_owner_delete_with_activity
before delete on public.owners
for each row execute function public.prevent_owner_delete_with_activity();

drop trigger if exists prevent_owner_profile_delete_with_activity on public.profiles;
create trigger prevent_owner_profile_delete_with_activity
before delete on public.profiles
for each row execute function public.prevent_owner_profile_delete_with_activity();

drop trigger if exists prevent_auth_user_delete_with_owner_activity on auth.users;
create trigger prevent_auth_user_delete_with_owner_activity
before delete on auth.users
for each row execute function public.prevent_auth_user_delete_with_owner_activity();

do $$
declare
  ready_stay_owner_fk record;
begin
  if to_regclass('public.ready_stays') is not null then
    for ready_stay_owner_fk in
      select c.conname
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid
       and a.attnum = any(c.conkey)
      where c.conrelid = 'public.ready_stays'::regclass
        and c.confrelid = 'public.profiles'::regclass
        and c.contype = 'f'
        and a.attname = 'owner_id'
    loop
      execute format('alter table public.ready_stays drop constraint %I', ready_stay_owner_fk.conname);
    end loop;

    alter table public.ready_stays
      add constraint ready_stays_owner_id_fkey
      foreign key (owner_id) references public.profiles(id) on delete restrict;
  end if;
end;
$$;

drop trigger if exists prevent_inactive_owner_membership_inventory on public.owner_memberships;
create trigger prevent_inactive_owner_membership_inventory
before insert or update on public.owner_memberships
for each row execute function public.prevent_inactive_owner_membership_inventory();

do $$
begin
  if to_regclass('public.owner_membership_use_year_points') is not null then
    drop trigger if exists prevent_inactive_owner_use_year_inventory on public.owner_membership_use_year_points;
    create trigger prevent_inactive_owner_use_year_inventory
    before insert or update on public.owner_membership_use_year_points
    for each row execute function public.prevent_inactive_owner_use_year_inventory();
  end if;
end;
$$;
