alter table public.rentals
  add column if not exists match_id uuid references public.booking_matches(id) on delete set null,
  add column if not exists owner_id uuid references public.owners(id) on delete set null,
  add column if not exists guest_id uuid references auth.users(id) on delete set null,
  add column if not exists dvc_confirmation_number text;

create index if not exists rentals_match_id_idx
  on public.rentals (match_id);
