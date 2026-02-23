create table if not exists public.owner_membership_use_year_points (
  id bigserial primary key,
  owner_membership_id bigint not null references public.owner_memberships(id) on delete cascade,
  use_year int not null,
  available int not null default 0,
  holding int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_membership_id, use_year)
);

create index if not exists owner_membership_use_year_points_membership_idx
  on public.owner_membership_use_year_points (owner_membership_id);

create index if not exists owner_membership_use_year_points_use_year_idx
  on public.owner_membership_use_year_points (use_year);
