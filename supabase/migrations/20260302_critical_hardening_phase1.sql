begin;

-- ---------------------------------------------------------------------------
-- B1) Enable RLS on uncovered tables (deny-by-default unless policies exist).
-- ---------------------------------------------------------------------------
alter table if exists public.owners enable row level security;
alter table if exists public.owner_comments enable row level security;
alter table if exists public.owner_verification_events enable row level security;
alter table if exists public.guest_preferences enable row level security;
alter table if exists public.guest_request_activity enable row level security;
alter table if exists public.renter_requests enable row level security;
alter table if exists public.pricing_promotions enable row level security;
alter table if exists public.resorts enable row level security;
alter table if exists public.resort_photos enable row level security;
alter table if exists public.confirmed_bookings enable row level security;
alter table if exists public.cron_locks enable row level security;
alter table if exists public.owner_membership_use_year_points enable row level security;

-- Keep core owner/admin flows working with least privilege.
drop policy if exists owners_self_select on public.owners;
drop policy if exists owners_self_insert on public.owners;
drop policy if exists owners_self_update on public.owners;
drop policy if exists owners_admin_manage on public.owners;

create policy owners_self_select
  on public.owners
  for select
  to authenticated
  using (user_id = auth.uid());

create policy owners_self_insert
  on public.owners
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy owners_self_update
  on public.owners
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy owners_admin_manage
  on public.owners
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists owner_comments_owner_select on public.owner_comments;
drop policy if exists owner_comments_admin_manage on public.owner_comments;

create policy owner_comments_owner_select
  on public.owner_comments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.owners o
      where o.id = owner_comments.owner_id
        and o.user_id = auth.uid()
    )
  );

create policy owner_comments_admin_manage
  on public.owner_comments
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists owner_verification_events_owner_select on public.owner_verification_events;
drop policy if exists owner_verification_events_admin_manage on public.owner_verification_events;

create policy owner_verification_events_owner_select
  on public.owner_verification_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.owners o
      where o.id = owner_verification_events.owner_id
        and o.user_id = auth.uid()
    )
  );

create policy owner_verification_events_admin_manage
  on public.owner_verification_events
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists guest_preferences_self_select on public.guest_preferences;
drop policy if exists guest_preferences_self_insert on public.guest_preferences;
drop policy if exists guest_preferences_self_update on public.guest_preferences;
drop policy if exists guest_preferences_admin_manage on public.guest_preferences;

create policy guest_preferences_self_select
  on public.guest_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

create policy guest_preferences_self_insert
  on public.guest_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy guest_preferences_self_update
  on public.guest_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy guest_preferences_admin_manage
  on public.guest_preferences
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists renter_requests_self_select on public.renter_requests;
drop policy if exists renter_requests_self_insert on public.renter_requests;
drop policy if exists renter_requests_self_update on public.renter_requests;
drop policy if exists renter_requests_admin_manage on public.renter_requests;

create policy renter_requests_self_select
  on public.renter_requests
  for select
  to authenticated
  using (renter_id = auth.uid());

create policy renter_requests_self_insert
  on public.renter_requests
  for insert
  to authenticated
  with check (renter_id = auth.uid());

create policy renter_requests_self_update
  on public.renter_requests
  for update
  to authenticated
  using (renter_id = auth.uid())
  with check (renter_id = auth.uid());

create policy renter_requests_admin_manage
  on public.renter_requests
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists guest_request_activity_renter_select on public.guest_request_activity;
drop policy if exists guest_request_activity_admin_manage on public.guest_request_activity;

create policy guest_request_activity_renter_select
  on public.guest_request_activity
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.renter_requests rr
      where rr.id = guest_request_activity.request_id
        and rr.renter_id = auth.uid()
    )
  );

create policy guest_request_activity_admin_manage
  on public.guest_request_activity
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists pricing_promotions_admin_manage on public.pricing_promotions;
create policy pricing_promotions_admin_manage
  on public.pricing_promotions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists confirmed_bookings_admin_manage on public.confirmed_bookings;
create policy confirmed_bookings_admin_manage
  on public.confirmed_bookings
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists cron_locks_service_manage on public.cron_locks;
create policy cron_locks_service_manage
  on public.cron_locks
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists owner_membership_use_year_points_owner_select on public.owner_membership_use_year_points;
drop policy if exists owner_membership_use_year_points_owner_insert on public.owner_membership_use_year_points;
drop policy if exists owner_membership_use_year_points_owner_update on public.owner_membership_use_year_points;
drop policy if exists owner_membership_use_year_points_admin_manage on public.owner_membership_use_year_points;

create policy owner_membership_use_year_points_owner_select
  on public.owner_membership_use_year_points
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.owner_memberships om
      join public.owners o on o.id = om.owner_id
      where om.id = owner_membership_use_year_points.owner_membership_id
        and o.user_id = auth.uid()
    )
  );

create policy owner_membership_use_year_points_owner_insert
  on public.owner_membership_use_year_points
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.owner_memberships om
      join public.owners o on o.id = om.owner_id
      where om.id = owner_membership_use_year_points.owner_membership_id
        and o.user_id = auth.uid()
    )
  );

create policy owner_membership_use_year_points_owner_update
  on public.owner_membership_use_year_points
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.owner_memberships om
      join public.owners o on o.id = om.owner_id
      where om.id = owner_membership_use_year_points.owner_membership_id
        and o.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.owner_memberships om
      join public.owners o on o.id = om.owner_id
      where om.id = owner_membership_use_year_points.owner_membership_id
        and o.user_id = auth.uid()
    )
  );

create policy owner_membership_use_year_points_admin_manage
  on public.owner_membership_use_year_points
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Public browse access for resort listing/content only.
drop policy if exists resorts_public_read on public.resorts;
create policy resorts_public_read
  on public.resorts
  for select
  to anon, authenticated
  using (true);

drop policy if exists resort_photos_public_read on public.resort_photos;
create policy resort_photos_public_read
  on public.resort_photos
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- B3) Tighten affiliate lead insertion to prevent attribution poisoning.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated can insert affiliate leads" on public.affiliate_leads;
drop policy if exists affiliate_leads_insert_owned_booking on public.affiliate_leads;

create policy affiliate_leads_insert_owned_booking
  on public.affiliate_leads
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.affiliates a
      where a.id = affiliate_id
        and a.status::text in ('active', 'verified', 'pending_review')
    )
    and exists (
      select 1
      from public.booking_requests b
      where b.id = booking_request_id
        and b.renter_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- B4) Fix support privilege escalation paths.
-- ---------------------------------------------------------------------------
drop policy if exists support_agents_self_insert on public.support_agents;
drop policy if exists support_agents_admin_insert on public.support_agents;

create policy support_agents_admin_insert
  on public.support_agents
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists support_handoffs_agent_select on public.support_handoffs;
drop policy if exists support_handoffs_agent_update on public.support_handoffs;
drop policy if exists support_handoffs_agent_select_strict on public.support_handoffs;
drop policy if exists support_handoffs_agent_update_strict on public.support_handoffs;

create policy support_handoffs_agent_select_strict
  on public.support_handoffs
  for select
  to authenticated
  using (
    assigned_agent_user_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy support_handoffs_agent_update_strict
  on public.support_handoffs
  for update
  to authenticated
  using (
    assigned_agent_user_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    assigned_agent_user_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

commit;
