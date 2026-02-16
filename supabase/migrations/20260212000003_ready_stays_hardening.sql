-- Ready stays hardening:
-- 1) Prevent duplicate listings per rental_id.
-- 2) Enforce owner reservation (rentals.match_id IS NULL) and confirmed milestone.

create unique index if not exists ready_stays_rental_unique
  on public.ready_stays (rental_id);

create or replace function public.ready_stays_enforce_constraints()
returns trigger as $$
declare
  has_confirmation boolean;
  rental_match_id uuid;
begin
  select r.match_id
    into rental_match_id
    from public.rentals r
    where r.id = new.rental_id;

  if rental_match_id is not null then
    raise exception 'Ready stay requires an owner reservation';
  end if;

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

  return new;
end;
$$ language plpgsql;
