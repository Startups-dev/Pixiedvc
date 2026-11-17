-- Restore nullable rental payout fields expected by the Ready Stay payout lock.
-- No existing financial records are backfilled or recalculated.
alter table public.rentals
  add column if not exists owner_base_rate_per_point_cents integer,
  add column if not exists owner_premium_per_point_cents integer,
  add column if not exists owner_rate_per_point_cents integer,
  add column if not exists owner_total_cents integer,
  add column if not exists owner_home_resort_premium_applied boolean,
  add column if not exists owner_founding_bonus_per_point_cents integer;

alter table public.ready_stays
  add column if not exists founding_bonus_per_point_cents integer;

comment on column public.ready_stays.founding_bonus_per_point_cents is
  'Server-calculated Founders Club bonus per point committed when this Ready Stay was submitted; null for legacy rows.';

-- The owner RLS policy allows owners to insert/update their own listing rows.
-- Recompute the commitment on insert and make it immutable on later edits so a
-- client cannot grant itself a bonus or change one after submission.
create or replace function public.ready_stays_snapshot_founding_bonus()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_bonus_cents integer;
  v_started_at timestamptz;
  v_expires_at timestamptz;
begin
  if tg_op = 'UPDATE' then
    new.founding_bonus_per_point_cents := old.founding_bonus_per_point_cents;
    return new;
  end if;

  select
    o.founding_owner_bonus_cents_per_point,
    o.founding_owner_bonus_started_at,
    o.founding_owner_bonus_expires_at
  into v_bonus_cents, v_started_at, v_expires_at
  from public.owners o
  where o.user_id = new.owner_id or o.id = new.owner_id
  order by (o.user_id = new.owner_id) desc
  limit 1;

  if coalesce(v_bonus_cents, 0) > 0
     and (v_started_at is null or now() >= v_started_at)
     and v_expires_at is not null
     and now() < v_expires_at then
    new.founding_bonus_per_point_cents := 200;
  else
    new.founding_bonus_per_point_cents := 0;
  end if;

  return new;
end;
$function$;

drop trigger if exists ready_stays_snapshot_founding_bonus on public.ready_stays;
create trigger ready_stays_snapshot_founding_bonus
before insert or update on public.ready_stays
for each row execute function public.ready_stays_snapshot_founding_bonus();
