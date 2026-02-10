alter table public.contracts
  add column if not exists signed_copy_emailed_at timestamptz;

comment on column public.contracts.signed_copy_emailed_at is 'Timestamp when signed agreement copy email was sent to guest.';
