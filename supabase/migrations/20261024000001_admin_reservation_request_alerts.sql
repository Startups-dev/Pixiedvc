-- SQL Editor copy: run this entire file as one transaction before deploying the
-- reservation alert code. Existing requests are deliberately not backfilled.
begin;

alter table public.renter_requests
  add column availability_status text not null default 'unreviewed'
    check (availability_status in ('unreviewed', 'available', 'unavailable', 'needs_clarification')),
  add column availability_checked_at timestamptz,
  add column submission_key text;
create unique index renter_requests_submission_key_uidx
  on public.renter_requests(submission_key) where submission_key is not null and status = 'submitted';

create table public.admin_reservation_request_alerts (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid unique references public.booking_requests(id) on delete cascade,
  renter_request_id bigint unique references public.renter_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  read_by uuid references auth.users(id) on delete set null,
  constraint admin_reservation_request_alerts_one_source_check
    check ((booking_request_id is not null) <> (renter_request_id is not null))
);
create index admin_reservation_request_alerts_unread_idx
  on public.admin_reservation_request_alerts(created_at desc) where read_at is null;
alter table public.admin_reservation_request_alerts enable row level security;
revoke all on public.admin_reservation_request_alerts from public, anon, authenticated;
grant select, insert, update, delete on public.admin_reservation_request_alerts to service_role;

alter table public.admin_inbox_sms_preferences
  add column reservation_opted_in boolean not null default false,
  add column reservation_enabled boolean not null default false;
alter table public.admin_inbox_sms_events
  add column reservation_alert_id uuid references public.admin_reservation_request_alerts(id) on delete set null;
alter table public.admin_inbox_sms_events
  drop constraint admin_inbox_sms_events_event_type_check;
alter table public.admin_inbox_sms_events
  add constraint admin_inbox_sms_events_event_type_check
  check (event_type in ('new_inquiry', 'assigned_reply', 'reservation_request', 'verification', 'test'));
create index admin_inbox_sms_reservation_due_idx
  on public.admin_inbox_sms_events(due_at)
  where event_type = 'reservation_request' and status = 'queued';

create or replace function public.queue_admin_reservation_request_sms()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pref record;
begin
  for v_pref in
    select p.user_id from public.admin_inbox_sms_preferences p
    where p.reservation_opted_in and p.reservation_enabled
      and p.phone_verified_at is not null and p.phone_ciphertext is not null
  loop
    insert into public.admin_inbox_sms_events
      (event_key, event_type, reservation_alert_id, recipient_user_id, due_at)
    values
      ('reservation_request:' || new.id::text || ':' || v_pref.user_id::text,
       'reservation_request', new.id, v_pref.user_id, now())
    on conflict (event_key) do nothing;
  end loop;
  return new;
end;
$$;

create or replace function public.alert_on_booking_request_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status::text = 'submitted' and new.accepted_terms is true then
    if tg_op = 'INSERT' then
      insert into public.admin_reservation_request_alerts(booking_request_id)
      values (new.id) on conflict (booking_request_id) do nothing;
    elsif old.status::text is distinct from 'submitted' then
      insert into public.admin_reservation_request_alerts(booking_request_id)
      values (new.id) on conflict (booking_request_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.alert_on_renter_request_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'submitted' then
    insert into public.admin_reservation_request_alerts(renter_request_id)
    values (new.id) on conflict (renter_request_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger admin_reservation_request_sms_queued
after insert on public.admin_reservation_request_alerts
for each row execute function public.queue_admin_reservation_request_sms();
create trigger admin_booking_request_submitted_alert
after insert or update of status on public.booking_requests
for each row execute function public.alert_on_booking_request_submission();
create trigger admin_renter_request_submitted_alert
after insert on public.renter_requests
for each row execute function public.alert_on_renter_request_submission();

revoke all on function public.queue_admin_reservation_request_sms() from public, anon, authenticated;
revoke all on function public.alert_on_booking_request_submission() from public, anon, authenticated;
revoke all on function public.alert_on_renter_request_submission() from public, anon, authenticated;
grant execute on function public.queue_admin_reservation_request_sms() to service_role;
grant execute on function public.alert_on_booking_request_submission() to service_role;
grant execute on function public.alert_on_renter_request_submission() to service_role;

commit;
