-- Phase 2: Ready Stays public showcase + admin merchandising controls.
-- Extends existing ready_stays table safely (no duplicate table).

alter type ready_stay_status add value if not exists 'paused';

alter table if exists public.ready_stays
  add column if not exists slug text,
  add column if not exists title text,
  add column if not exists short_description text,
  add column if not exists sleeps integer,
  add column if not exists image_url text,
  add column if not exists badge text not null default 'Ready to Book',
  add column if not exists cta_label text not null default 'View Stay',
  add column if not exists href text,
  add column if not exists featured boolean not null default false,
  add column if not exists priority integer not null default 0,
  add column if not exists placement_home boolean not null default false,
  add column if not exists placement_resort boolean not null default true,
  add column if not exists placement_search boolean not null default false,
  add column if not exists expires_at timestamptz,
  add column if not exists sort_override integer;

-- Safe backfill defaults for legacy rows.
update public.ready_stays rs
set
  slug = coalesce(nullif(rs.slug, ''), rs.id::text),
  title = coalesce(
    nullif(rs.title, ''),
    trim(
      both ' '
      from concat(
        coalesce(r.name, 'Ready Stay'),
        ' ',
        coalesce(rs.room_type, ''),
        ' - ',
        to_char(rs.check_in, 'Mon DD')
      )
    )
  ),
  sleeps = coalesce(rs.sleeps, 4)
from public.resorts r
where r.id = rs.resort_id;

create unique index if not exists ready_stays_slug_unique_idx
  on public.ready_stays (slug)
  where slug is not null and slug <> '';

create index if not exists ready_stays_public_home_idx
  on public.ready_stays (status, placement_home, featured desc, priority desc, check_in asc);

create index if not exists ready_stays_public_resort_idx
  on public.ready_stays (status, resort_id, placement_resort, featured desc, priority desc, check_in asc);

create index if not exists ready_stays_public_search_idx
  on public.ready_stays (status, placement_search, featured desc, priority desc, check_in asc);

create index if not exists ready_stays_sort_override_idx
  on public.ready_stays (sort_override)
  where sort_override is not null;

create index if not exists ready_stays_expires_at_idx
  on public.ready_stays (expires_at)
  where expires_at is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ready_stays_date_range_check'
      and conrelid = 'public.ready_stays'::regclass
  ) then
    alter table public.ready_stays
      add constraint ready_stays_date_range_check check (check_out > check_in);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ready_stays_active_showcase_fields_check'
      and conrelid = 'public.ready_stays'::regclass
  ) then
    alter table public.ready_stays
      add constraint ready_stays_active_showcase_fields_check
      check (
        status <> 'active'::ready_stay_status
        or (
          coalesce(nullif(slug, ''), '') <> ''
          and coalesce(nullif(title, ''), '') <> ''
          and coalesce(nullif(image_url, ''), '') <> ''
          and sleeps is not null
          and sleeps > 0
        )
      );
  end if;
end $$;

-- Public read policy for published showcase-eligible rows.
drop policy if exists "Public can view active ready stays showcase" on public.ready_stays;
create policy "Public can view active ready stays showcase"
  on public.ready_stays
  for select
  to anon, authenticated
  using (
    status = 'active'::ready_stay_status
    and coalesce(nullif(slug, ''), '') <> ''
    and coalesce(nullif(title, ''), '') <> ''
    and coalesce(nullif(image_url, ''), '') <> ''
    and check_out >= current_date
    and (expires_at is null or expires_at > now())
  );

-- Optional direct admin RLS access for authenticated admin users.
drop policy if exists "Admins can manage ready stays" on public.ready_stays;
create policy "Admins can manage ready stays"
  on public.ready_stays
  for all
  to authenticated
  using (
    coalesce(auth.jwt() ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    coalesce(auth.jwt() ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
