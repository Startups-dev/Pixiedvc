-- Dedupe resorts by normalized name and enforce unique canonical slug

create or replace function public.normalize_resort_name(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    trim(both '-' from regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                lower(coalesce($1, '')),
                'disney[’'']?s?\s+','', 'g'
              ),
              '\\(([^)]*)\\)',' \\1 ', 'g'
            ),
            '\\bat\\s+disney[’'']?s?\\s+wilderness lodge\\b','', 'g'
          ),
          '\\bat\\s+wilderness lodge\\b','', 'g'
        ),
        '&','and','g'
      ),
      '[^a-z0-9\\s-]','', 'g'
    )),
    '\\s+', '-', 'g'
  );
$$;

alter table if exists public.resorts
  add column if not exists canonical_slug text;

update public.resorts
set canonical_slug = public.normalize_resort_name(name)
where canonical_slug is null;

alter table if exists public.resorts
  alter column canonical_slug set not null;

create temp table resort_canonical as
select canonical_slug, id as canonical_id
from (
  select
    id,
    canonical_slug,
    name,
    row_number() over (
      partition by canonical_slug
      order by
        (case when lower(name) like '% at %' then 1 else 0 end),
        (case when name ~ '\\(' then 1 else 0 end),
        length(name),
        id
    ) as rn
  from public.resorts
) ranked
where rn = 1;

create temp table resort_dedupe_map as
select r.id as duplicate_id, c.canonical_id
from public.resorts r
join resort_canonical c on c.canonical_slug = r.canonical_slug
where r.id <> c.canonical_id;

do $$
declare
  rec record;
begin
  for rec in
    select
      c.conrelid::regclass as table_name,
      a.attname as column_name
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = c.conkey[1]
    where c.confrelid = 'public.resorts'::regclass
      and c.contype = 'f'
      and array_length(c.conkey, 1) = 1
  loop
    execute format(
      'update %s t set %I = m.canonical_id from resort_dedupe_map m where t.%I = m.duplicate_id',
      rec.table_name,
      rec.column_name,
      rec.column_name
    );
  end loop;
end $$;

delete from public.resorts r
using resort_dedupe_map m
where r.id = m.duplicate_id;

create unique index if not exists resorts_canonical_slug_key
  on public.resorts (canonical_slug);

comment on column public.resorts.canonical_slug is
  'Normalized resort name used to prevent duplicate resort rows.';
