alter table public.owner_memberships
  add column if not exists contract_year integer;

comment on column public.owner_memberships.contract_year is 'Calendar year for the points in this contract (optional).';
