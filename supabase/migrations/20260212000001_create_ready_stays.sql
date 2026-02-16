do $$
begin
  if not exists (select 1 from pg_type where typname = 'ready_stay_status') then
    create type ready_stay_status as enum ('draft', 'active', 'sold', 'expired', 'removed');
  end if;
end $$;

create table if not exists public.ready_stays (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  rental_id uuid not null references public.rentals(id) on delete cascade,
  resort_id uuid not null references public.resorts(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  points integer not null,
  room_type text not null,
  season_type text not null,
  owner_price_per_point_cents integer not null,
  guest_price_per_point_cents integer not null,
  status ready_stay_status not null default 'draft',
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (guest_price_per_point_cents = owner_price_per_point_cents + 700)
);

create index if not exists ready_stays_owner_idx
  on public.ready_stays (owner_id, status, created_at desc);

create index if not exists ready_stays_rental_idx
  on public.ready_stays (rental_id);

create or replace function public.ready_stays_enforce_constraints()
returns trigger as $$
declare
  has_confirmation boolean;
  booking_status booking_status;
begin
  select exists (
    select 1
    from public.rental_milestones rm
    where rm.rental_id = new.rental_id
      and rm.code = 'disney_confirmation_uploaded'
      and rm.status = 'completed'
  ) into has_confirmation;

  if not has_confirmation then
    raise exception 'Ready stay requires a confirmed rental';
  end if;

  select br.status
    into booking_status
    from public.rentals r
    join public.booking_matches bm on bm.id = r.match_id
    join public.booking_requests br on br.id = bm.booking_id
    where r.id = new.rental_id
    limit 1;

  if booking_status is not null and booking_status <> 'cancelled' then
    raise exception 'Ready stay cannot coexist with an active booking request';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger ready_stays_enforce_constraints
before insert or update on public.ready_stays
for each row execute function public.ready_stays_enforce_constraints();

create trigger ready_stays_updated_at
before update on public.ready_stays
for each row execute function public.set_updated_at();
