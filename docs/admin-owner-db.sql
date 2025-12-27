-- ENUMS
create type owner_status as enum ('pending','needs_more_info','verified','rejected');
create type doc_kind as enum ('id_front','id_back','membership_card','contract','other');
create type doc_review_status as enum ('unreviewed','accepted','flagged');
create type comment_kind as enum ('note','system','reminder_sent','status_change');
create type bulk_action_type as enum ('verify','reject','send_reminder');

-- OWNERS TABLE
create table if not exists owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  display_name text,
  email citext,
  home_resort text,
  use_year text,
  member_id_last4 text,
  status owner_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid,
  rejection_reason text,
  metadata jsonb
);

create index if not exists owners_status_submitted_idx on owners(status, submitted_at desc);
create index if not exists owners_email_idx on owners(email);

-- OWNER MEMBERSHIPS (if you don't already have it)
create table if not exists owner_memberships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references owners(id) on delete cascade,
  resort_id uuid references resorts(id),
  use_year text,
  points_owned int,
  points_available int,
  created_at timestamptz not null default now()
);

-- OWNER DOCUMENTS
create table if not exists owner_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references owners(id) on delete cascade,
  kind doc_kind not null,
  storage_path text not null,
  thumbnail_path text,
  uploaded_at timestamptz not null default now(),
  review_status doc_review_status not null default 'unreviewed',
  notes text
);
create index if not exists owner_documents_owner_idx on owner_documents(owner_id);

-- OWNER COMMENTS
create table if not exists owner_comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references owners(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade,
  body text not null,
  kind comment_kind not null default 'note',
  created_at timestamptz not null default now()
);
create index if not exists owner_comments_owner_idx on owner_comments(owner_id, created_at desc);

-- OWNER VERIFICATION EVENTS
create table if not exists owner_verification_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references owners(id) on delete cascade,
  old_status owner_status,
  new_status owner_status not null,
  actor_id uuid references auth.users(id),
  context jsonb,
  created_at timestamptz not null default now()
);
create index if not exists owner_verification_events_owner_idx on owner_verification_events(owner_id, created_at desc);

-- BULK ACTIONS (optional)
create table if not exists bulk_actions (
  id uuid primary key default gen_random_uuid(),
  type bulk_action_type not null,
  actor_id uuid references auth.users(id),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- RLS POLICIES
alter table owners enable row level security;
alter table owner_memberships enable row level security;
alter table owner_documents enable row level security;
alter table owner_comments enable row level security;
alter table owner_verification_events enable row level security;

-- helper function assumes profiles table has role column
create or replace function public.is_admin(conduit uuid)
returns boolean language sql stable as $$
  select coalesce((select role from profiles where id = conduit), 'owner') in ('admin','concierge');
$$;

create policy "Admins can manage owners" on owners
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create policy "Owner can view self" on owners
  for select using (user_id = auth.uid());

create policy "Owner can update profile fields" on owners
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins manage memberships" on owner_memberships
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create policy "Owners read memberships" on owner_memberships
  for select using (exists(select 1 from owners where owners.id = owner_memberships.owner_id and owners.user_id = auth.uid()));

create policy "Admins manage documents" on owner_documents
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create policy "Owners manage own documents" on owner_documents
  using (exists(select 1 from owners where owners.id = owner_documents.owner_id and owners.user_id = auth.uid()))
  with check (exists(select 1 from owners where owners.id = owner_documents.owner_id and owners.user_id = auth.uid()));

create policy "Admins manage comments" on owner_comments
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create policy "Admins manage events" on owner_verification_events
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));
