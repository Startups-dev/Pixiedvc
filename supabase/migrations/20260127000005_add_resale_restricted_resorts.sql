alter table public.resorts
  add column if not exists is_resale_restricted_resort boolean not null default false;

update public.resorts
set is_resale_restricted_resort = true
where lower(name) in (
  'disney''s riviera resort',
  'the villas at disneyland hotel',
  'the cabins at disney''s fort wilderness resort'
)
or lower(slug) in (
  'disneys-riviera-resort',
  'riviera',
  'the-villas-at-disneyland-hotel',
  'villas-at-disneyland-hotel',
  'cabins-at-disneys-fort-wilderness-resort',
  'the-cabins-at-disneys-fort-wilderness-resort'
)
or lower(coalesce(calculator_code, '')) in (
  'riv',
  'dlh',
  'fw'
);
