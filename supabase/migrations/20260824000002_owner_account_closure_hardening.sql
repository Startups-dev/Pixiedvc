-- Owner account closure hardening.
-- This migration is intentionally non-destructive. It tightens live inventory
-- writes and replaces broad test reset behavior with test-scoped cleanup.

drop policy if exists "Owners can insert private inventory" on public.private_inventory;
create policy "Owners can insert private inventory"
  on public.private_inventory
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.owners o
      where (o.id = auth.uid() or o.user_id = auth.uid())
        and o.verification = 'verified'
        and coalesce(o.lifecycle_status, 'active') = 'active'
    )
  );

drop policy if exists "Owners can update submitted inventory" on public.private_inventory;
create policy "Owners can update submitted inventory"
  on public.private_inventory
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    and status = 'submitted'
    and exists (
      select 1
      from public.owners o
      where (o.id = auth.uid() or o.user_id = auth.uid())
        and coalesce(o.lifecycle_status, 'active') = 'active'
    )
  )
  with check (
    owner_id = auth.uid()
    and status = 'submitted'
    and exists (
      select 1
      from public.owners o
      where (o.id = auth.uid() or o.user_id = auth.uid())
        and coalesce(o.lifecycle_status, 'active') = 'active'
    )
  );

create or replace function public.prevent_history_rental_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_history boolean;
begin
  if old.status in ('booked', 'stay_in_progress', 'completed') then
    raise exception 'rental_has_platform_history_soft_close_instead'
      using errcode = '23503',
            detail = 'History-bearing rentals cannot be physically deleted.';
  end if;

  if to_regclass('public.payout_ledger') is not null then
    select exists (select 1 from public.payout_ledger where rental_id = old.id) into has_history;
    if has_history then
      raise exception 'rental_has_payout_history_soft_close_instead'
        using errcode = '23503',
              detail = 'Rentals with payout history cannot be physically deleted.';
    end if;
  end if;

  if to_regclass('public.rental_documents') is not null then
    select exists (select 1 from public.rental_documents where rental_id = old.id) into has_history;
    if has_history then
      raise exception 'rental_has_document_history_soft_close_instead'
        using errcode = '23503',
              detail = 'Rentals with reservation documents cannot be physically deleted.';
    end if;
  end if;

  if to_regclass('public.rental_exceptions') is not null then
    select exists (select 1 from public.rental_exceptions where rental_id = old.id) into has_history;
    if has_history then
      raise exception 'rental_has_exception_history_soft_close_instead'
        using errcode = '23503',
              detail = 'Rentals with exception history cannot be physically deleted.';
    end if;
  end if;

  if to_regclass('public.ready_stays') is not null then
    select exists (
      select 1
      from public.ready_stays
      where rental_id = old.id
        and coalesce(is_test_listing, false) = false
    ) into has_history;
    if has_history then
      raise exception 'rental_has_ready_stay_history_soft_close_instead'
        using errcode = '23503',
              detail = 'Rentals linked to non-test Ready Stay history cannot be physically deleted.';
    end if;
  end if;

  return old;
end;
$$;

drop trigger if exists prevent_history_rental_delete on public.rentals;
create trigger prevent_history_rental_delete
before delete on public.rentals
for each row execute function public.prevent_history_rental_delete();

create or replace function public.admin_reset_test_data_bookings()
returns table (
  booking_requests_deleted bigint,
  renter_requests_deleted bigint,
  rentals_deleted bigint,
  confirmed_bookings_deleted bigint,
  booking_matches_deleted bigint,
  booking_request_guests_deleted bigint,
  guest_request_activity_deleted bigint,
  contracts_deleted bigint,
  contract_events_deleted bigint,
  rental_milestones_deleted bigint,
  rental_documents_deleted bigint,
  rental_exceptions_deleted bigint,
  payout_ledger_deleted bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_ids uuid[] := '{}'::uuid[];
  v_rental_ids uuid[] := '{}'::uuid[];
  v_contract_ids bigint[] := '{}'::bigint[];
  v_booking_requests_deleted bigint := 0;
  v_renter_requests_deleted bigint := 0;
  v_rentals_deleted bigint := 0;
  v_confirmed_bookings_deleted bigint := 0;
  v_booking_matches_deleted bigint := 0;
  v_booking_request_guests_deleted bigint := 0;
  v_guest_request_activity_deleted bigint := 0;
  v_contracts_deleted bigint := 0;
  v_contract_events_deleted bigint := 0;
  v_rental_milestones_deleted bigint := 0;
  v_rental_documents_deleted bigint := 0;
  v_rental_exceptions_deleted bigint := 0;
  v_payout_ledger_deleted bigint := 0;
begin
  if to_regclass('public.ready_stays') is not null then
    select coalesce(array_agg(distinct id) filter (where id is not null), '{}'::uuid[])
      into v_booking_ids
    from (
      select booking_request_id as id from public.ready_stays where coalesce(is_test_listing, false) = true
      union
      select lock_session_id as id from public.ready_stays where coalesce(is_test_listing, false) = true
      union
      select sold_booking_request_id as id from public.ready_stays where coalesce(is_test_listing, false) = true
    ) ids;

    select coalesce(array_agg(distinct rental_id) filter (where rental_id is not null), '{}'::uuid[])
      into v_rental_ids
    from public.ready_stays
    where coalesce(is_test_listing, false) = true;
  end if;

  if cardinality(v_booking_ids) = 0 and cardinality(v_rental_ids) = 0 then
    return query
    select 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
           0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  if to_regclass('public.contracts') is not null then
    select coalesce(array_agg(id), '{}'::bigint[])
      into v_contract_ids
    from public.contracts
    where booking_request_id = any(v_booking_ids);
  end if;

  if to_regclass('public.contract_events') is not null and cardinality(v_contract_ids) > 0 then
    delete from public.contract_events where contract_id = any(v_contract_ids);
    get diagnostics v_contract_events_deleted = row_count;
  end if;

  if to_regclass('public.contracts') is not null then
    delete from public.contracts where booking_request_id = any(v_booking_ids);
    get diagnostics v_contracts_deleted = row_count;
  end if;

  if to_regclass('public.payout_ledger') is not null then
    delete from public.payout_ledger where rental_id = any(v_rental_ids);
    get diagnostics v_payout_ledger_deleted = row_count;
  end if;

  if to_regclass('public.rental_exceptions') is not null then
    delete from public.rental_exceptions where rental_id = any(v_rental_ids);
    get diagnostics v_rental_exceptions_deleted = row_count;
  end if;

  if to_regclass('public.rental_documents') is not null then
    delete from public.rental_documents where rental_id = any(v_rental_ids);
    get diagnostics v_rental_documents_deleted = row_count;
  end if;

  if to_regclass('public.rental_milestones') is not null then
    delete from public.rental_milestones where rental_id = any(v_rental_ids);
    get diagnostics v_rental_milestones_deleted = row_count;
  end if;

  if to_regclass('public.booking_request_guests') is not null then
    delete from public.booking_request_guests where booking_id = any(v_booking_ids);
    get diagnostics v_booking_request_guests_deleted = row_count;
  end if;

  if to_regclass('public.booking_matches') is not null then
    delete from public.booking_matches where booking_id = any(v_booking_ids);
    get diagnostics v_booking_matches_deleted = row_count;
  end if;

  if to_regclass('public.guest_request_activity') is not null then
    delete from public.guest_request_activity where request_id = any(v_booking_ids);
    get diagnostics v_guest_request_activity_deleted = row_count;
  end if;

  if to_regclass('public.ready_stays') is not null then
    delete from public.ready_stays where coalesce(is_test_listing, false) = true;
  end if;

  if to_regclass('public.rentals') is not null then
    delete from public.rentals
    where id = any(v_rental_ids)
      and not exists (
        select 1
        from public.ready_stays rs
        where rs.rental_id = rentals.id
          and coalesce(rs.is_test_listing, false) = false
      );
    get diagnostics v_rentals_deleted = row_count;
  end if;

  if to_regclass('public.confirmed_bookings') is not null then
    delete from public.confirmed_bookings where booking_request_id = any(v_booking_ids);
    get diagnostics v_confirmed_bookings_deleted = row_count;
  end if;

  if to_regclass('public.booking_requests') is not null then
    delete from public.booking_requests where id = any(v_booking_ids);
    get diagnostics v_booking_requests_deleted = row_count;
  end if;

  return query
  select
    v_booking_requests_deleted,
    v_renter_requests_deleted,
    v_rentals_deleted,
    v_confirmed_bookings_deleted,
    v_booking_matches_deleted,
    v_booking_request_guests_deleted,
    v_guest_request_activity_deleted,
    v_contracts_deleted,
    v_contract_events_deleted,
    v_rental_milestones_deleted,
    v_rental_documents_deleted,
    v_rental_exceptions_deleted,
    v_payout_ledger_deleted;
end;
$$;

revoke all on function public.admin_reset_test_data_bookings() from public;
grant execute on function public.admin_reset_test_data_bookings() to service_role;
