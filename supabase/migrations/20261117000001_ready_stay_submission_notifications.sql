begin;

-- No backfill: only submissions made after this trigger is installed are queued.
create table public.ready_stay_submission_outbox (
  ready_stay_id uuid primary key references public.ready_stays(id) on delete cascade,
  details jsonb not null,
  created_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  error_message text,
  expanded_at timestamptz
);
alter table public.ready_stay_submission_outbox enable row level security;
revoke all on public.ready_stay_submission_outbox from public, anon, authenticated;
grant select, insert, update, delete on public.ready_stay_submission_outbox to service_role;
create index ready_stay_submission_outbox_pending_idx
  on public.ready_stay_submission_outbox(next_attempt_at) where expanded_at is null;

-- NULL defaults keep every existing/historical email outside automatic delivery.
alter table public.outbound_emails
  add column queue_request jsonb,
  add column queue_next_attempt_at timestamptz,
  add column queue_first_attempt_at timestamptz,
  add column queue_locked_until timestamptz,
  add column queue_claim_token uuid;
create index outbound_emails_queue_due_idx
  on public.outbound_emails(queue_next_attempt_at)
  where queue_request is not null and status <> 'sent';

alter table public.admin_reservation_request_alerts
  add column ready_stay_id uuid references public.ready_stays(id) on delete cascade;

alter table public.admin_reservation_request_alerts
  drop constraint admin_reservation_request_alerts_one_source_check;

alter table public.admin_reservation_request_alerts
  add constraint admin_reservation_request_alerts_one_source_check
    check (num_nonnulls(booking_request_id, renter_request_id, ready_stay_id) = 1);

create unique index admin_reservation_request_alerts_ready_stay_uidx
  on public.admin_reservation_request_alerts(ready_stay_id)
  where ready_stay_id is not null;

create or replace function public.queue_admin_reservation_request_sms()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pref record;
begin
  -- The existing SMS dispatcher supports guest booking and renter requests only.
  -- Ready Stay submissions use the dashboard chime and submission email path.
  if new.booking_request_id is null and new.renter_request_id is null then
    return new;
  end if;

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

create or replace function public.alert_on_ready_stay_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.is_test_listing, false) = false
    and new.verification_status::text in ('proof_uploaded', 'submitted')
    and new.verification_submitted_at is not null
    and (
      tg_op = 'INSERT'
      or old.verification_submitted_at is null
      or coalesce(old.verification_status::text, '') not in ('proof_uploaded', 'submitted')
    ) then
    insert into public.admin_reservation_request_alerts(ready_stay_id)
    values (new.id)
    on conflict (ready_stay_id)
    where ready_stay_id is not null
    do nothing;

    -- This intent commits with the Ready Stay and alert, before any HTTP response.
    -- No exception handler: a failure aborts the save and is returned to the caller.
    insert into public.ready_stay_submission_outbox(ready_stay_id, details)
    values (new.id, jsonb_build_object(
      'id', new.id, 'ownerId', new.owner_id,
      'ownerEmail', (select u.email from auth.users u where u.id = new.owner_id),
      'resortName', coalesce((select r.name from public.resorts r where r.id = new.resort_id), 'Disney Vacation Club resort'),
      'checkIn', new.check_in, 'checkOut', new.check_out,
      'roomType', new.room_type, 'points', new.points
    )) on conflict (ready_stay_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists admin_ready_stay_submitted_alert on public.ready_stays;
create trigger admin_ready_stay_submitted_alert
after insert or update of verification_status, verification_submitted_at on public.ready_stays
for each row execute function public.alert_on_ready_stay_submission();

revoke all on function public.alert_on_ready_stay_submission() from public, anon, authenticated;
grant execute on function public.alert_on_ready_stay_submission() to service_role;

-- Freeze recipients, sender and rendered payload, and create the email log rows
-- atomically. Concurrent expanders either commit all messages or do nothing.
create function public.expand_ready_stay_submission_emails(p_id uuid, p_messages jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_event public.ready_stay_submission_outbox; v_message jsonb;
begin
  select * into v_event from public.ready_stay_submission_outbox
    where ready_stay_id = p_id for update;
  if not found or v_event.expanded_at is not null then return; end if;
  if jsonb_typeof(p_messages) is distinct from 'array' then
    raise exception 'Email messages must be an array';
  end if;
  if jsonb_array_length(p_messages) < 2 then
    raise exception 'Owner and configured Admin recipients are required';
  end if;
  for v_message in select value from jsonb_array_elements(p_messages) loop
    insert into public.outbound_emails (
      template_key, recipient_email, recipient_user_id, related_entity_type,
      related_entity_id, subject, status, provider, metadata, idempotency_key,
      queue_request, queue_next_attempt_at
    ) values (
      v_message->>'templateKey', v_message->'request'->>'to',
      (v_message->>'recipientUserId')::uuid, 'ready_stay', p_id,
      v_message->'request'->>'subject', 'pending', 'resend',
      jsonb_build_object('readyStayId', p_id, 'audience', v_message->>'audience', 'durableQueue', true),
      v_message->>'idempotencyKey', v_message->'request', now()
    ) on conflict (idempotency_key) where idempotency_key is not null do nothing;
  end loop;
  update public.ready_stay_submission_outbox set expanded_at = now() where ready_stay_id = p_id;
end;
$$;

-- Claim one message at a time so a batch cannot outlive its lease. Expired claims
-- are recovered after a crash; tokens fence stale completion/failure writes.
create function public.claim_ready_stay_submission_email()
returns setof public.outbound_emails
language plpgsql security definer set search_path = '' as $$
begin
  -- Resend remembers keys for 24h. Stop ambiguous retries after 23h rather than
  -- risking a duplicate after expiry; retain the row for provider reconciliation.
  update public.outbound_emails set queue_next_attempt_at = null,
    error_message = 'Idempotency window expired; reconcile with Resend before retrying',
    status = 'failed'
  where queue_request is not null and status <> 'sent'
    and queue_next_attempt_at is not null
    and queue_first_attempt_at <= now() - interval '23 hours'
    and (queue_locked_until is null or queue_locked_until <= now());

  return query
  with candidate as (
    select id from public.outbound_emails
    where queue_request is not null and status <> 'sent'
      and queue_next_attempt_at <= now()
      and (queue_locked_until is null or queue_locked_until <= now())
    order by queue_next_attempt_at, id for update skip locked limit 1
  )
  update public.outbound_emails e set
    queue_claim_token = gen_random_uuid(), queue_locked_until = now() + interval '2 minutes',
    queue_first_attempt_at = coalesce(e.queue_first_attempt_at, now()),
    retry_count = e.retry_count + 1, last_retry_at = now(), status = 'pending'
  from candidate c where e.id = c.id returning e.*;
end;
$$;

create function public.finish_ready_stay_submission_email(
  p_id uuid, p_token uuid, p_provider_id text, p_error text,
  p_definitely_rejected boolean default false
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.outbound_emails set
    status = case when p_error is null then 'sent' else 'failed' end,
    sent_at = case when p_error is null then now() else sent_at end,
    failed_at = case when p_error is not null then now() else failed_at end,
    provider_message_id = coalesce(p_provider_id, provider_message_id),
    provider_delivery_status = case when p_error is null then 'accepted' else 'failed' end,
    error_message = p_error,
    -- A definitive rejection on the first attempt cannot have sent an email.
    -- Keep retrying such failures automatically even across a long outage.
    -- Never clear an earlier ambiguous attempt merely because a later one rejects.
    queue_first_attempt_at = case
      when p_error is not null and p_definitely_rejected and queue_first_attempt_at = last_retry_at then null
      else queue_first_attempt_at end,
    queue_next_attempt_at = case when p_error is null then null
      else now() + make_interval(secs => least(3600, (60 * power(2, least(retry_count - 1, 6)))::int)) end,
    queue_locked_until = null, queue_claim_token = null
  where id = p_id and queue_claim_token = p_token and queue_locked_until > now();
  return found;
end;
$$;

revoke all on function public.expand_ready_stay_submission_emails(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.claim_ready_stay_submission_email() from public, anon, authenticated;
revoke all on function public.finish_ready_stay_submission_email(uuid, uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.expand_ready_stay_submission_emails(uuid, jsonb) to service_role;
grant execute on function public.claim_ready_stay_submission_email() to service_role;
grant execute on function public.finish_ready_stay_submission_email(uuid, uuid, text, text, boolean) to service_role;

commit;
