create table if not exists public.booking_matches (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_requests(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete cascade,
  owner_membership_id uuid references public.owner_memberships(id) on delete set null,
  response_token uuid not null default gen_random_uuid(),
  status text not null default 'pending_owner' check (status in ('pending_owner','accepted','declined')),
  points_reserved integer not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

comment on table public.booking_matches is 'Provisional matches between booking requests and owners.';
comment on column public.booking_matches.status is 'pending_owner (awaiting owner confirmation) | accepted | declined.';

create unique index if not exists booking_matches_response_token_key on public.booking_matches(response_token);
