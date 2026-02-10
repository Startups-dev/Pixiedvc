-- Enforce use_year_start as DATE (first day of Use Year month)

alter table if exists public.owner_memberships
  alter column use_year_start type date
  using make_date(
    use_year_start::int,
    case lower(coalesce(use_year, 'january'))
      when 'january' then 1
      when 'february' then 2
      when 'march' then 3
      when 'april' then 4
      when 'may' then 5
      when 'june' then 6
      when 'july' then 7
      when 'august' then 8
      when 'september' then 9
      when 'october' then 10
      when 'november' then 11
      when 'december' then 12
      else 1
    end,
    1
  );

comment on column public.owner_memberships.use_year_start is
  'DATE for the first day of the Use Year month (YYYY-MM-01).';
