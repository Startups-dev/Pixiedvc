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

-- A Ready Stay can have status = 'draft' while already submitted for review.
-- The submission marker is verification_status = 'proof_uploaded' (or the
-- legacy 'submitted' / 'approved' states) and verification_submitted_at.
-- Snapshot eligibility when that submission state is first entered, not just
-- because a draft row exists. Preserve that snapshot, including NULL on legacy
-- submitted rows, across all later updates.
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
  v_old_was_submitted boolean := false;
  v_new_is_submitted boolean := false;
begin
  v_new_is_submitted :=
    coalesce(new.verification_status in ('proof_uploaded', 'submitted', 'approved'), false);

  if tg_op = 'UPDATE' then
    v_old_was_submitted :=
      old.verification_submitted_at is not null
      or coalesce(old.verification_status in ('proof_uploaded', 'submitted', 'approved', 'rejected'), false)
      or old.founding_bonus_per_point_cents is not null;

    if v_old_was_submitted then
      new.founding_bonus_per_point_cents := old.founding_bonus_per_point_cents;
      new.verification_submitted_at := old.verification_submitted_at;
      return new;
    end if;
  end if;

  if not v_new_is_submitted then
    new.founding_bonus_per_point_cents := null;
    if tg_op = 'UPDATE' then
      new.verification_submitted_at := old.verification_submitted_at;
    else
      new.verification_submitted_at := null;
    end if;
    return new;
  end if;

  -- The database owns the eligibility timestamp; ignore any client-supplied
  -- timestamp when a submission transition occurs.
  new.verification_submitted_at := now();

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
