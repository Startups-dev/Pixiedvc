insert into public.resorts (slug, name, calculator_code)
values (
  'fort-wilderness-cabins',
  'The Cabins at Disney''s Fort Wilderness Resort',
  'CFW'
)
on conflict (slug) do update
set name = excluded.name,
    calculator_code = excluded.calculator_code;
