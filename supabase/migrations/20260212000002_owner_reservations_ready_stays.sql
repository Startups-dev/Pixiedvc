alter table public.rentals
  add column if not exists resort_id uuid references public.resorts(id) on delete set null;

drop policy if exists "Owners can create rentals" on public.rentals;
create policy "Owners can create rentals"
  on public.rentals
  for insert
  with check (owner_user_id = auth.uid());

drop policy if exists "Owners can create confirmation milestones" on public.rental_milestones;
create policy "Owners can create confirmation milestones"
  on public.rental_milestones
  for insert
  with check (
    code = 'disney_confirmation_uploaded'
    and status = 'completed'
    and exists (
      select 1 from public.rentals r
      where r.id = rental_id
        and r.owner_user_id = auth.uid()
    )
  );

alter table public.ready_stays enable row level security;

drop policy if exists "Owners can view ready stays" on public.ready_stays;
create policy "Owners can view ready stays"
  on public.ready_stays
  for select
  using (owner_id = auth.uid());

drop policy if exists "Owners can insert ready stays" on public.ready_stays;
create policy "Owners can insert ready stays"
  on public.ready_stays
  for insert
  with check (owner_id = auth.uid());

drop policy if exists "Owners can update ready stays" on public.ready_stays;
create policy "Owners can update ready stays"
  on public.ready_stays
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create or replace function public.ready_stays_enforce_constraints()
returns trigger as $$
declare
  has_confirmation boolean;
  booking_status booking_status;
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
