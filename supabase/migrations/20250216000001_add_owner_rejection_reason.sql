alter table public.owners
  add column if not exists rejection_reason text;

comment on column public.owners.rejection_reason is 'Optional note explaining why an owner was rejected or asked for more info.';
