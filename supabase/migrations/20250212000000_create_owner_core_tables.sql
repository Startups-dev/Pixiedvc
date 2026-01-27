create table if not exists public.resorts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  location text,
  tagline text,
  created_at timestamptz not null default now()
);

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  display_name text,
  email text,
  home_resort text,
  use_year text,
  member_id_last4 text,
  verification text not null default 'pending'
    check (verification in ('pending','needs_more_info','verified','rejected')),
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid,
  rejection_reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists owners_status_submitted_idx
  on public.owners (verification, submitted_at desc);

create index if not exists owners_email_idx
  on public.owners (email);

create table if not exists public.owner_memberships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.owners(id) on delete cascade,
  resort_id uuid references public.resorts(id),
  use_year text,
  points_owned int,
  points_available int,
  created_at timestamptz not null default now()
);

create table if not exists public.owner_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.owners(id) on delete cascade,
  kind text not null
    check (kind in ('id_front','id_back','membership_card','contract','other')),
  storage_path text not null,
  thumbnail_path text,
  uploaded_at timestamptz not null default now(),
  review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed','accepted','flagged')),
  notes text
);

create index if not exists owner_documents_owner_idx
  on public.owner_documents (owner_id);

create table if not exists public.owner_comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.owners(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade,
  body text not null,
  kind text not null default 'note'
    check (kind in ('note','system','reminder_sent','status_change')),
  created_at timestamptz not null default now()
);

create index if not exists owner_comments_owner_idx
  on public.owner_comments (owner_id, created_at desc);

create table if not exists public.owner_verification_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.owners(id) on delete cascade,
  old_status text,
  new_status text not null,
  actor_id uuid references auth.users(id),
  context jsonb,
  created_at timestamptz not null default now()
);

create index if not exists owner_verification_events_owner_idx
  on public.owner_verification_events (owner_id, created_at desc);
