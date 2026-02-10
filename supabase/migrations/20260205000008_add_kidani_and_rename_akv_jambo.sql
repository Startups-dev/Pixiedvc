-- Rename AKV resort to Jambo House and add Kidani Village

update public.resorts
set name = 'Disney''s Animal Kingdom Villas – Jambo House'
where id = '9d796d31-30f6-45fb-9902-1c6f769475d0';

insert into public.resorts (name, slug, calculator_code)
values (
  'Disney''s Animal Kingdom Villas – Kidani Village',
  'animal-kingdom-kidani',
  'KV'
)
on conflict (slug) do update
set name = excluded.name,
    calculator_code = excluded.calculator_code;
