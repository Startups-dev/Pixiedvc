-- Runbook:
-- 1) Review the dry-run report below (duplicates + canonical selection + ref counts).
-- 2) If it looks correct, allow the migration to proceed to the APPLY MERGE section.
-- This migration repoints all FK references to the canonical resort row, deletes duplicates,
-- and enforces unique indexes on resort identifiers.

-- Ensure normalization helper exists
create or replace function public.normalize_resort_name(input text)
returns text
language sql
immutable
as $$
  select trim(both ' ' from regexp_replace(
    lower(coalesce($1, '')),
    '[^a-z0-9 ]',
    '',
    'g'
  ));
$$;

-- Build FK reference list for resorts
create temp table resort_fk_columns as
select
  c.conrelid::regclass as table_name,
  a.attname as column_name
from pg_constraint c
join pg_attribute a
  on a.attrelid = c.conrelid
 and a.attnum = c.conkey[1]
where c.confrelid = 'public.resorts'::regclass
  and c.contype = 'f'
  and array_length(c.conkey, 1) = 1;

-- Count references per resort id across all FK columns
create temp table resort_ref_counts (
  resort_id uuid primary key,
  ref_count bigint not null default 0
);

do $$
declare
  rec record;
begin
  for rec in select table_name, column_name from resort_fk_columns loop
    execute format(
      'insert into resort_ref_counts (resort_id, ref_count)
       select %1$I::uuid as resort_id, count(*)::bigint as ref_count
       from %2$s
       where %1$I is not null
       group by %1$I
       on conflict (resort_id) do update
       set ref_count = resort_ref_counts.ref_count + excluded.ref_count',
      rec.column_name,
      rec.table_name
    );
  end loop;
end $$;

-- Identify duplicate groups by normalized name
create temp table resort_candidates as
select
  id,
  name,
  slug,
  calculator_code,
  created_at,
  public.normalize_resort_name(name) as normalized_name,
  coalesce(ref.ref_count, 0) as ref_count
from public.resorts r
left join resort_ref_counts ref on ref.resort_id = r.id;

create temp table resort_duplicate_groups as
select normalized_name
from resort_candidates
group by normalized_name
having count(*) > 1;

create temp table resort_ranked as
select
  r.*,
  row_number() over (
    partition by r.normalized_name
    order by
      (case when r.calculator_code is not null and r.calculator_code <> '' then 1 else 0 end) desc,
      r.ref_count desc,
      r.created_at asc,
      r.id asc
  ) as rn
from resort_candidates r
where r.normalized_name in (select normalized_name from resort_duplicate_groups);

create temp table resort_merge_map as
select
  d.id as duplicate_id,
  c.id as canonical_id,
  d.normalized_name
from resort_ranked d
join resort_ranked c
  on c.normalized_name = d.normalized_name
 and c.rn = 1
where d.rn > 1;

-- DRY-RUN REPORT: duplicates + canonical selection + ref counts
select
  r.normalized_name,
  array_agg(r.id order by r.rn) as ids,
  array_agg(r.name order by r.rn) as names,
  array_agg(r.slug order by r.rn) as slugs,
  array_agg(r.calculator_code order by r.rn) as calculator_codes,
  array_agg(r.created_at order by r.rn) as created_at,
  array_agg(r.ref_count order by r.rn) as ref_counts,
  max(case when r.rn = 1 then r.id end) as canonical_id
from resort_ranked r
group by r.normalized_name
order by r.normalized_name;

-- APPLY MERGE: repoint FKs to canonical rows

do $$
declare
  rec record;
begin
  for rec in select table_name, column_name from resort_fk_columns loop
    execute format(
      'update %s t
       set %I = m.canonical_id
       from resort_merge_map m
       where t.%I = m.duplicate_id',
      rec.table_name,
      rec.column_name,
      rec.column_name
    );
  end loop;
end $$;

-- Delete duplicate resort rows
delete from public.resorts r
using resort_merge_map m
where r.id = m.duplicate_id;

-- Enforce unique identifiers
create unique index if not exists resorts_slug_unique
  on public.resorts (slug);

create unique index if not exists resorts_calculator_code_unique
  on public.resorts (calculator_code)
  where calculator_code is not null and calculator_code <> '';
