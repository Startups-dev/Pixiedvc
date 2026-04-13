alter table if exists public.ready_stays
  add column if not exists original_guest_price_per_point_cents integer,
  add column if not exists price_reduced_at timestamptz;

update public.ready_stays
set original_guest_price_per_point_cents = guest_price_per_point_cents
where original_guest_price_per_point_cents is null;

create index if not exists ready_stays_price_reduced_idx
  on public.ready_stays (status, price_reduced_at desc, check_in asc);

create or replace function public.ready_stays_track_markdown()
returns trigger
language plpgsql
as $$
declare
  baseline integer;
begin
  if tg_op = 'INSERT' then
    if new.original_guest_price_per_point_cents is null then
      new.original_guest_price_per_point_cents := new.guest_price_per_point_cents;
    end if;

    if new.guest_price_per_point_cents < new.original_guest_price_per_point_cents then
      new.price_reduced_at := coalesce(new.price_reduced_at, now());
    else
      new.price_reduced_at := null;
    end if;

    return new;
  end if;

  baseline := coalesce(old.original_guest_price_per_point_cents, old.guest_price_per_point_cents, new.guest_price_per_point_cents);

  if old.price_reduced_at is null and new.guest_price_per_point_cents >= baseline then
    new.original_guest_price_per_point_cents := new.guest_price_per_point_cents;
    new.price_reduced_at := null;
    return new;
  end if;

  new.original_guest_price_per_point_cents := coalesce(old.original_guest_price_per_point_cents, baseline);

  if new.guest_price_per_point_cents < new.original_guest_price_per_point_cents then
    if new.guest_price_per_point_cents is distinct from old.guest_price_per_point_cents then
      new.price_reduced_at := now();
    else
      new.price_reduced_at := coalesce(new.price_reduced_at, old.price_reduced_at, now());
    end if;
  else
    new.price_reduced_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists ready_stays_track_markdown on public.ready_stays;
create trigger ready_stays_track_markdown
before insert or update on public.ready_stays
for each row execute function public.ready_stays_track_markdown();
