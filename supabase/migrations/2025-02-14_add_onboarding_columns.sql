-- Adds onboarding support columns to profiles + owners.

alter table public.profiles
  add column if not exists role text
    check (role in ('owner','guest')),
  add column if not exists onboarding_completed boolean not null default false;

alter table public.owners
  add column if not exists user_id uuid references auth.users(id);

create unique index if not exists owners_user_id_key
  on public.owners(user_id)
  where user_id is not null;

-- backfill: assume legacy records used profile/ user ids that match owners.id.
update public.owners as o
set user_id = o.id
where user_id is null
  and exists (select 1 from auth.users where id = o.id);

comment on column public.profiles.role is 'User role chosen during onboarding (owner | guest).';
comment on column public.profiles.onboarding_completed is 'True once the onboarding wizard is finished.';
comment on column public.owners.user_id is 'FK to auth.users; set during owner onboarding.';
