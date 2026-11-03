-- Synthetic, isolated PostgreSQL fixture. No production data or credentials.
-- Relevant RLS policies/helpers below are copied from the production schema
-- backup of 2026-10-30; the affected policy/ACL was also verified live read-only.
-- Tables contain only columns needed for this authorization/query regression.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid;
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create type public.user_role as enum ('guest', 'owner', 'admin');
create table public.profiles (id uuid primary key, role public.user_role not null);
create table public.owners (id uuid primary key, user_id uuid not null);
create table public.resorts (id uuid primary key, name text not null);
create table public.booking_requests (
  id uuid primary key,
  renter_id uuid not null,
  status text not null default 'submitted',
  is_test_booking boolean not null default false,
  deposit_status text,
  deposit_due numeric not null default 99,
  deposit_paid numeric not null default 99,
  payment_status text, paid_at timestamptz, stripe_checkout_session_id text,
  owner_transfer_confirmed_at timestamptz, disney_confirmation_number text,
  accepted_terms boolean default false, accepted_insurance boolean default false,
  primary_resort_id uuid references public.resorts(id),
  created_at timestamptz not null default now(),
  check_in date, check_out date, primary_room text,
  adults integer, youths integer, total_points integer
);
create table public.booking_matches (id uuid primary key, booking_id uuid not null, owner_id uuid not null);
alter table public.profiles enable row level security;
alter table public.owners enable row level security;
alter table public.resorts enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_matches enable row level security;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;

insert into public.profiles values
  ('11111111-1111-4111-8111-111111111111', 'guest'),
  ('22222222-2222-4222-8222-222222222222', 'guest'),
  ('4de38521-9534-4b81-b54e-81e6b7c58539', 'guest'),
  ('33333333-3333-4333-8333-333333333333', 'owner'),
  ('44444444-4444-4444-8444-444444444444', 'owner'),
  ('55555555-5555-4555-8555-555555555555', 'admin');
insert into public.owners values
  ('66666666-6666-4666-8666-666666666666', '33333333-3333-4333-8333-333333333333'),
  ('77777777-7777-4777-8777-777777777777', '44444444-4444-4444-8444-444444444444');
insert into public.resorts values ('88888888-8888-4888-8888-888888888888', 'Synthetic Resort');
insert into public.booking_requests (id, renter_id, primary_resort_id, primary_room) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '88888888-8888-4888-8888-888888888888', 'STUDIO'),
  ('a0000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', '88888888-8888-4888-8888-888888888888', 'STUDIO'),
  ('a0000000-0000-4000-8000-000000000003', '4de38521-9534-4b81-b54e-81e6b7c58539', '88888888-8888-4888-8888-888888888888', 'STUDIO'),
  ('a0000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '88888888-8888-4888-8888-888888888888', 'STUDIO'),
  ('a0000000-0000-4000-8000-000000000005', '33333333-3333-4333-8333-333333333333', '88888888-8888-4888-8888-888888888888', 'STUDIO');
update public.booking_requests set is_test_booking=true, deposit_status='test_bypassed', deposit_paid=0
  where id='a0000000-0000-4000-8000-000000000003';
update public.booking_requests set status='draft' where id='a0000000-0000-4000-8000-000000000004';
insert into public.booking_matches values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '66666666-6666-4666-8666-666666666666'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', '77777777-7777-4777-8777-777777777777');

-- Exact existing policy/function definitions follow.

CREATE FUNCTION public.first_uuid_from_json(j jsonb, keys text[]) RETURNS uuid
    LANGUAGE plpgsql STABLE
    AS $$
declare
  k text;
  v text;
begin
  foreach k in array keys loop
    v := j ->> k;
    if v is not null and btrim(v) <> '' then
      begin
        return v::uuid;
      exception
        when others then
          null;
      end;
    end if;
  end loop;

  return null;
end;
$$;

CREATE FUNCTION public.booking_request_guest_uid(br public.booking_requests) RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select public.first_uuid_from_json(
    to_jsonb(br),
    array[
      'guest_user_id',
      'guest_id',
      'guest_profile_id',
      'user_id',
      'profile_id',
      'requester_user_id',
      'traveler_user_id',
      'traveler_id',
      'renter_user_id',
      'renter_id'
    ]
  );
$$;

CREATE FUNCTION public.booking_request_owner_uid(br public.booking_requests) RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select public.first_uuid_from_json(
    to_jsonb(br),
    array[
      'owner_user_id',
      'owner_id',
      'owner_profile_id',
      'owner_userid'
    ]
  );
$$;

CREATE FUNCTION public.current_user_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.profiles as profile_row
    where profile_row.id = (select auth.uid())
      and profile_row.role::text = 'admin'
  );
$$;

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.profiles as profile_row
    where profile_row.id = (select auth.uid())
      and profile_row.role::text = 'admin'
  );
$$;

CREATE FUNCTION public.is_admin(uid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  select exists (
    select 1
    from public.profiles as profile_row
    where profile_row.id = uid
      and profile_row.role::text = 'admin'
  );
$$;

CREATE POLICY "Admins manage owners" ON public.owners USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Booking requests – renter select" ON public.booking_requests FOR SELECT USING ((renter_id = auth.uid()));

CREATE POLICY "Booking – admin select" ON public.booking_requests FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));

CREATE POLICY "Booking – user delete own" ON public.booking_requests FOR DELETE USING ((auth.uid() = renter_id));

CREATE POLICY "Booking – user insert own" ON public.booking_requests FOR INSERT WITH CHECK ((auth.uid() = renter_id));

CREATE POLICY "Booking – user select own" ON public.booking_requests FOR SELECT USING ((auth.uid() = renter_id));

CREATE POLICY "Booking – user update own" ON public.booking_requests FOR UPDATE USING ((auth.uid() = renter_id)) WITH CHECK ((auth.uid() = renter_id));

CREATE POLICY "Owner update self" ON public.owners FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));

CREATE POLICY "Owner view self" ON public.owners FOR SELECT USING ((id = auth.uid()));

CREATE POLICY "Owners can view booking matches" ON public.booking_matches FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.owners o
  WHERE ((o.id = booking_matches.owner_id) AND ((o.user_id = auth.uid()) OR (o.id = auth.uid()))))));

CREATE POLICY "Owners can view matched booking requests" ON public.booking_requests FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.booking_matches m
     JOIN public.owners o ON ((o.id = m.owner_id)))
  WHERE ((m.booking_id = booking_requests.id) AND ((o.user_id = auth.uid()) OR (o.id = auth.uid()))))));

CREATE POLICY "Owners – admin delete" ON public.owners FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));

CREATE POLICY "Owners – admin insert" ON public.owners FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));

CREATE POLICY "Owners – owner/admin select" ON public.owners FOR SELECT USING (((id = auth.uid()) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role))))));

CREATE POLICY "Owners – owner/admin update" ON public.owners FOR UPDATE USING (((id = auth.uid()) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))))) WITH CHECK (((id = auth.uid()) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role))))));

CREATE POLICY "Profiles – user can select own" ON public.profiles FOR SELECT USING ((auth.uid() = id));

CREATE POLICY "Profiles – user can update own" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));

CREATE POLICY "Public read resorts" ON public.resorts FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can read their profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));

CREATE POLICY admins_full_access_booking_requests ON public.booking_requests TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "owners insert self" ON public.owners FOR INSERT WITH CHECK (((id = auth.uid()) OR public.is_admin()));

CREATE POLICY "owners self read" ON public.owners FOR SELECT USING (((id = auth.uid()) OR public.is_admin()));

CREATE POLICY "owners self update" ON public.owners FOR UPDATE USING (((id = auth.uid()) OR public.is_admin()));

CREATE POLICY owners_admin_manage ON public.owners TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY owners_admin_read ON public.owners FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY owners_admin_update ON public.owners FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY owners_guests_insert_booking_requests ON public.booking_requests FOR INSERT TO authenticated WITH CHECK (((public.booking_request_owner_uid(booking_requests.*) = auth.uid()) OR (public.booking_request_guest_uid(booking_requests.*) = auth.uid()) OR public.is_admin()));

CREATE POLICY owners_guests_select_booking_requests ON public.booking_requests FOR SELECT TO authenticated USING (((public.booking_request_owner_uid(booking_requests.*) = auth.uid()) OR (public.booking_request_guest_uid(booking_requests.*) = auth.uid()) OR public.is_admin()));

CREATE POLICY owners_guests_update_booking_requests ON public.booking_requests FOR UPDATE TO authenticated USING (((public.booking_request_owner_uid(booking_requests.*) = auth.uid()) OR (public.booking_request_guest_uid(booking_requests.*) = auth.uid()) OR public.is_admin())) WITH CHECK (((public.booking_request_owner_uid(booking_requests.*) = auth.uid()) OR (public.booking_request_guest_uid(booking_requests.*) = auth.uid()) OR public.is_admin()));

CREATE POLICY owners_owner_read ON public.owners FOR SELECT TO authenticated USING ((id = auth.uid()));

CREATE POLICY owners_owner_update ON public.owners FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));

CREATE POLICY owners_self_insert ON public.owners FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

CREATE POLICY owners_self_select ON public.owners FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY owners_self_update ON public.owners FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "profiles self read" ON public.profiles FOR SELECT USING (((id = auth.uid()) OR public.is_admin()));

CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE USING (((id = auth.uid()) OR public.is_admin()));

CREATE POLICY profiles_admin_manage ON public.profiles TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY profiles_self_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));

CREATE POLICY profiles_self_select ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));

CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));

CREATE POLICY resorts_public_read ON public.resorts FOR SELECT TO authenticated, anon USING (true);

alter function public.is_admin() owner to postgres;

revoke all on function public.is_admin() from public;

grant execute on function public.is_admin() to anon, authenticated, service_role;

alter function public.is_admin(uuid) owner to postgres;

revoke all on function public.is_admin(uuid) from public, anon, authenticated, service_role;

alter function public.current_user_is_admin() owner to postgres;

revoke all on function public.current_user_is_admin() from public, anon;

grant execute on function public.current_user_is_admin() to authenticated, service_role;

alter table public.booking_requests
  add constraint booking_requests_test_deposit_isolation_check
  check (
    (not is_test_booking and deposit_status is null) or (is_test_booking and
      deposit_due = 99
      and coalesce(deposit_paid, 0) = 0
      and coalesce(payment_status, '') <> 'paid'
      and paid_at is null
      and stripe_checkout_session_id is null
      and owner_transfer_confirmed_at is null
      and disney_confirmation_number is null
      and accepted_terms is not true
      and accepted_insurance is not true
      and (
        (status::text = 'draft' and deposit_status = 'test_pending')
        or (status::text = 'submitted' and deposit_status = 'test_bypassed')
        or (status::text = 'cancelled' and deposit_status in ('test_pending', 'test_bypassed'))
      )
    )
  );
