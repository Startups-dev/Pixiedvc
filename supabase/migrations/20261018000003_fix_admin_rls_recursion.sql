-- The legacy profiles policies call is_admin(), which reads profiles again.
-- Make that current-identity-only check run as the trusted migration owner so
-- evaluating profiles/support RLS policies cannot recursively re-enter RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile_row
    where profile_row.id = (select auth.uid())
      and profile_row.role::text = 'admin'
  );
$$;

alter function public.is_admin() owner to postgres;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- This legacy overload accepts an arbitrary user ID. It is not used by the
-- application or any RLS policy, so remove client-role execution rather than
-- letting callers ask about another account's role.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile_row
    where profile_row.id = uid
      and profile_row.role::text = 'admin'
  );
$$;

alter function public.is_admin(uuid) owner to postgres;
revoke all on function public.is_admin(uuid) from public, anon, authenticated, service_role;

-- This helper is already used by the authenticated-only profiles admin policy.
-- Keep its current-user-only semantics and pin its resolution path as well.
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile_row
    where profile_row.id = (select auth.uid())
      and profile_row.role::text = 'admin'
  );
$$;

alter function public.current_user_is_admin() owner to postgres;
revoke all on function public.current_user_is_admin() from public, anon;
grant execute on function public.current_user_is_admin() to authenticated, service_role;

comment on function public.is_admin() is
  'Returns whether the authenticated JWT subject has the admin profile role; it accepts no caller-supplied identity and exposes no profile data.';
