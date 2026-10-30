-- Apply only after approval. Existing bookings keep is_test_booking=false.
begin;

alter table public.booking_requests
  add column is_test_booking boolean not null default false,
  add column deposit_status text;

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

create index booking_requests_test_guest_cleanup_idx
  on public.booking_requests(renter_id, created_at desc)
  where is_test_booking;

create function public.guard_test_booking_record()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_requires_enabled boolean := false;
begin
  if tg_op = 'UPDATE' then
    if not old.is_test_booking and new.is_test_booking then
      raise exception 'An existing booking cannot be converted to a test booking';
    end if;
    if old.is_test_booking and (not new.is_test_booking or new.renter_id is distinct from old.renter_id) then
      raise exception 'A test booking cannot be converted or transferred';
    end if;
  end if;
  if new.is_test_booking and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'A test booking requires the server service role';
  end if;
  if new.is_test_booking and new.renter_id is distinct from '4de38521-9534-4b81-b54e-81e6b7c58539'::uuid then
    raise exception 'Only the designated guest may own a test booking';
  end if;
  if new.is_test_booking then
    if tg_op = 'INSERT' then
      v_requires_enabled := true;
    elsif new.status::text = 'submitted' and old.status::text is distinct from 'submitted' then
      v_requires_enabled := true;
    end if;
    if v_requires_enabled and not exists (
      select 1 from public.app_settings s
      where s.key = 'single_guest_test_booking_enabled'
        and s.value->>'enabled' = 'true'
        and s.value->>'auth_user_id' = '4de38521-9534-4b81-b54e-81e6b7c58539'
    ) then
      raise exception 'The test booking bypass is disabled';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_test_booking_record
before insert or update on public.booking_requests
for each row execute function public.guard_test_booking_record();

create function public.reject_test_booking_link()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_booking_id uuid;
begin
  v_booking_id := (to_jsonb(new)->>tg_argv[0])::uuid;
  if v_booking_id is not null and exists (
    select 1 from public.booking_requests b where b.id = v_booking_id and b.is_test_booking
  ) then
    raise exception 'Test bookings cannot create real financial, owner, or contract records';
  end if;
  return new;
end;
$$;

create trigger reject_test_booking_matches
before insert or update on public.booking_matches
for each row execute function public.reject_test_booking_link('booking_id');
create trigger reject_test_booking_transactions
before insert or update on public.transactions
for each row execute function public.reject_test_booking_link('booking_request_id');
do $$
begin
  if to_regclass('public.payments') is not null then
    execute 'create trigger reject_test_booking_payments before insert or update on public.payments for each row execute function public.reject_test_booking_link(''booking_request_id'')';
  end if;
end;
$$;
create trigger reject_test_booking_affiliate_leads
before insert or update on public.affiliate_leads
for each row execute function public.reject_test_booking_link('booking_request_id');
create trigger reject_test_booking_affiliate_conversions
before insert or update on public.affiliate_conversions
for each row execute function public.reject_test_booking_link('booking_request_id');
create trigger reject_test_booking_confirmed_bookings
before insert or update on public.confirmed_bookings
for each row execute function public.reject_test_booking_link('booking_request_id');
create trigger reject_test_booking_contracts
before insert or update on public.contracts
for each row execute function public.reject_test_booking_link('booking_request_id');
create trigger reject_test_booking_promotion_adjustments
before insert or update on public.promotion_adjustments
for each row execute function public.reject_test_booking_link('booking_request_id');
create trigger reject_test_booking_ready_stays
before insert or update on public.ready_stays
for each row execute function public.reject_test_booking_link('booking_request_id');
create trigger reject_test_booking_ready_stays_sold
before insert or update on public.ready_stays
for each row execute function public.reject_test_booking_link('sold_booking_request_id');
create trigger reject_test_booking_affiliate_payout_items
before insert or update on public.affiliate_payout_items
for each row execute function public.reject_test_booking_link('booking_request_id');

-- The reservation alert/SMS queue must exclude test submissions.
create or replace function public.alert_on_booking_request_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not new.is_test_booking and new.status::text = 'submitted' and new.accepted_terms is true then
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

-- Existing service-role-only settings table is the immediate kill switch.
-- Absence, malformed content, or disabled state fails closed in server code.
insert into public.app_settings(key, value)
values ('single_guest_test_booking_enabled', '{"enabled": false, "auth_user_id": "4de38521-9534-4b81-b54e-81e6b7c58539"}'::jsonb)
on conflict (key) do nothing;

-- Cleanup is service-role only, defaults to a count, and refuses linked real records.
create function public.cleanup_single_guest_test_bookings(p_guest_id uuid, p_execute boolean default false)
returns table(candidate_count bigint, deleted_count bigint)
language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_has_legacy_payments boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required';
  end if;
  if p_guest_id is distinct from '4de38521-9534-4b81-b54e-81e6b7c58539'::uuid then
    raise exception 'Cleanup is limited to the designated test guest';
  end if;
  select coalesce(array_agg(id), '{}'::uuid[]) into v_ids
  from public.booking_requests
  where renter_id = p_guest_id and is_test_booking;
  candidate_count := cardinality(v_ids);
  deleted_count := 0;
  if not p_execute or candidate_count = 0 then return next; return; end if;
  if to_regclass('public.payments') is not null then
    execute 'select exists (select 1 from public.payments where booking_request_id = any($1))'
      into v_has_legacy_payments using v_ids;
  end if;
  if v_has_legacy_payments
    or exists (select 1 from public.booking_matches where booking_id = any(v_ids))
    or exists (select 1 from public.transactions where booking_request_id = any(v_ids))
    or exists (select 1 from public.contracts where booking_request_id = any(v_ids))
    or exists (select 1 from public.ready_stays where booking_request_id = any(v_ids))
    or exists (select 1 from public.ready_stays where sold_booking_request_id = any(v_ids))
    or exists (select 1 from public.affiliate_conversions where booking_request_id = any(v_ids))
    or exists (select 1 from public.affiliate_payout_items where booking_request_id = any(v_ids))
    or exists (select 1 from public.confirmed_bookings where booking_request_id = any(v_ids))
    or exists (select 1 from public.affiliate_leads where booking_request_id = any(v_ids))
    or exists (select 1 from public.promotion_adjustments where booking_request_id = any(v_ids))
    or exists (select 1 from public.admin_reservation_request_alerts where booking_request_id = any(v_ids))
    or exists (select 1 from public.outbound_emails where related_entity_type = 'booking_request' and related_entity_id = any(v_ids))
  then
    raise exception 'Test booking has linked records; cleanup stopped';
  end if;
  delete from public.guest_request_activity where request_id = any(v_ids);
  delete from public.booking_request_guests where booking_id = any(v_ids);
  delete from public.booking_requests where id = any(v_ids) and renter_id = p_guest_id and is_test_booking;
  get diagnostics deleted_count = row_count;
  return next;
end;
$$;

revoke all on function public.guard_test_booking_record() from public, anon, authenticated;
revoke all on function public.reject_test_booking_link() from public, anon, authenticated;
revoke all on function public.cleanup_single_guest_test_bookings(uuid, boolean) from public, anon, authenticated;
grant execute on function public.cleanup_single_guest_test_bookings(uuid, boolean) to service_role;

commit;
