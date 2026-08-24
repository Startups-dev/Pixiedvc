-- Owner account closure hardening.
-- This migration is intentionally non-destructive. It tightens live inventory
-- writes and replaces broad test reset behavior with test-scoped cleanup.
-- Optional tables/columns are guarded for schema drift.

do $$
begin
  if to_regclass('public.private_inventory') is not null
    and to_regclass('public.owners') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'private_inventory' and column_name = 'owner_id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'private_inventory' and column_name = 'status'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'owners' and column_name = 'lifecycle_status'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'owners' and column_name = 'verification'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'owners' and column_name = 'user_id'
    )
  then
    execute 'drop policy if exists "Owners can insert private inventory" on public.private_inventory';
    execute $policy$
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
        )
    $policy$;

    execute 'drop policy if exists "Owners can update submitted inventory" on public.private_inventory';
    execute $policy$
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
        )
    $policy$;
  end if;
end;
$$;

create or replace function public.prevent_history_rental_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_history boolean;
  old_row jsonb;
  old_id uuid;
  old_status text;
begin
  old_row := to_jsonb(old);
  old_id := nullif(old_row->>'id', '')::uuid;
  old_status := old_row->>'status';

  if old_status in ('booked', 'stay_in_progress', 'completed') then
    raise exception 'rental_has_platform_history_soft_close_instead'
      using errcode = '23503',
            detail = 'History-bearing rentals cannot be physically deleted.';
  end if;

  if old_id is null then
    return old;
  end if;

  if to_regclass('public.payout_ledger') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'payout_ledger' and column_name = 'rental_id'
    )
  then
    execute 'select exists (select 1 from public.payout_ledger where rental_id = $1)' using old_id into has_history;
    if has_history then
      raise exception 'rental_has_payout_history_soft_close_instead'
        using errcode = '23503',
              detail = 'Rentals with payout history cannot be physically deleted.';
    end if;
  end if;

  if to_regclass('public.rental_documents') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'rental_documents' and column_name = 'rental_id'
    )
  then
    execute 'select exists (select 1 from public.rental_documents where rental_id = $1)' using old_id into has_history;
    if has_history then
      raise exception 'rental_has_document_history_soft_close_instead'
        using errcode = '23503',
              detail = 'Rentals with reservation documents cannot be physically deleted.';
    end if;
  end if;

  if to_regclass('public.rental_exceptions') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'rental_exceptions' and column_name = 'rental_id'
    )
  then
    execute 'select exists (select 1 from public.rental_exceptions where rental_id = $1)' using old_id into has_history;
    if has_history then
      raise exception 'rental_has_exception_history_soft_close_instead'
        using errcode = '23503',
              detail = 'Rentals with exception history cannot be physically deleted.';
    end if;
  end if;

  if to_regclass('public.ready_stays') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'rental_id'
    )
  then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'is_test_listing'
    ) then
      execute 'select exists (select 1 from public.ready_stays where rental_id = $1 and coalesce(is_test_listing, false) = false)' using old_id into has_history;
    else
      execute 'select exists (select 1 from public.ready_stays where rental_id = $1)' using old_id into has_history;
    end if;

    if has_history then
      raise exception 'rental_has_ready_stay_history_soft_close_instead'
        using errcode = '23503',
              detail = 'Rentals linked to non-test Ready Stay history cannot be physically deleted.';
    end if;
  end if;

  return old;
end;
$$;

do $$
begin
  if to_regclass('public.rentals') is not null then
    execute 'drop trigger if exists prevent_history_rental_delete on public.rentals';
    execute 'create trigger prevent_history_rental_delete before delete on public.rentals for each row execute function public.prevent_history_rental_delete()';
  end if;
end;
$$;

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
  v_disposable_rental_ids uuid[] := '{}'::uuid[];
  v_contract_ids bigint[] := '{}'::bigint[];
  v_test_filter text := 'coalesce(is_test_listing, false) = true';
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
  if to_regclass('public.ready_stays') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'is_test_listing'
    )
  then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'status'
    ) then
      v_test_filter := v_test_filter || ' and coalesce(status::text, '''') <> ''sold''';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'sold_booking_request_id'
    ) then
      v_test_filter := v_test_filter || ' and sold_booking_request_id is null';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'booking_request_id'
    ) then
      execute 'select coalesce(array_agg(distinct booking_request_id) filter (where booking_request_id is not null), ''{}''::uuid[]) from public.ready_stays where ' || v_test_filter
        into v_booking_ids;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'lock_session_id'
    ) then
      execute 'select array(select distinct unnest($1 || coalesce(array_agg(distinct lock_session_id) filter (where lock_session_id is not null), ''{}''::uuid[]))) from public.ready_stays where ' || v_test_filter
        using v_booking_ids
        into v_booking_ids;
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'rental_id'
    ) then
      execute 'select coalesce(array_agg(distinct rental_id) filter (where rental_id is not null), ''{}''::uuid[]) from public.ready_stays where ' || v_test_filter
        into v_rental_ids;
    end if;
  end if;

  if cardinality(v_booking_ids) = 0 and cardinality(v_rental_ids) = 0 then
    return query
    select 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
           0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  v_disposable_rental_ids := v_rental_ids;

  if cardinality(v_disposable_rental_ids) > 0
    and to_regclass('public.payout_ledger') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'payout_ledger' and column_name = 'rental_id'
    )
  then
    execute 'select coalesce(array_agg(id), ''{}''::uuid[]) from unnest($1::uuid[]) id where not exists (select 1 from public.payout_ledger p where p.rental_id = id)'
      using v_disposable_rental_ids
      into v_disposable_rental_ids;
  end if;

  if cardinality(v_disposable_rental_ids) > 0
    and to_regclass('public.rental_documents') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'rental_documents' and column_name = 'rental_id'
    )
  then
    execute 'select coalesce(array_agg(id), ''{}''::uuid[]) from unnest($1::uuid[]) id where not exists (select 1 from public.rental_documents d where d.rental_id = id)'
      using v_disposable_rental_ids
      into v_disposable_rental_ids;
  end if;

  if cardinality(v_disposable_rental_ids) > 0
    and to_regclass('public.rental_exceptions') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'rental_exceptions' and column_name = 'rental_id'
    )
  then
    execute 'select coalesce(array_agg(id), ''{}''::uuid[]) from unnest($1::uuid[]) id where not exists (select 1 from public.rental_exceptions e where e.rental_id = id)'
      using v_disposable_rental_ids
      into v_disposable_rental_ids;
  end if;

  if cardinality(v_disposable_rental_ids) > 0
    and to_regclass('public.ready_stays') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'rental_id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'is_test_listing'
    )
  then
    execute 'select coalesce(array_agg(id), ''{}''::uuid[]) from unnest($1::uuid[]) id where not exists (select 1 from public.ready_stays rs where rs.rental_id = id and coalesce(rs.is_test_listing, false) = false)'
      using v_disposable_rental_ids
      into v_disposable_rental_ids;
  end if;

  if to_regclass('public.contracts') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'contracts' and column_name = 'id'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'contracts' and column_name = 'booking_request_id'
    )
  then
    execute 'select coalesce(array_agg(id), ''{}''::bigint[]) from public.contracts where booking_request_id = any($1)'
      using v_booking_ids
      into v_contract_ids;
  end if;

  if cardinality(v_contract_ids) > 0
    and to_regclass('public.contract_events') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'contract_events' and column_name = 'contract_id'
    )
  then
    execute 'delete from public.contract_events where contract_id = any($1)' using v_contract_ids;
    get diagnostics v_contract_events_deleted = row_count;
  end if;

  if cardinality(v_booking_ids) > 0
    and to_regclass('public.contracts') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'contracts' and column_name = 'booking_request_id'
    )
  then
    execute 'delete from public.contracts where booking_request_id = any($1)' using v_booking_ids;
    get diagnostics v_contracts_deleted = row_count;
  end if;

  if cardinality(v_disposable_rental_ids) > 0
    and to_regclass('public.rental_milestones') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'rental_milestones' and column_name = 'rental_id'
    )
  then
    execute 'delete from public.rental_milestones where rental_id = any($1)' using v_disposable_rental_ids;
    get diagnostics v_rental_milestones_deleted = row_count;
  end if;

  if cardinality(v_booking_ids) > 0
    and to_regclass('public.booking_request_guests') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'booking_request_guests' and column_name = 'booking_id'
    )
  then
    execute 'delete from public.booking_request_guests where booking_id = any($1)' using v_booking_ids;
    get diagnostics v_booking_request_guests_deleted = row_count;
  end if;

  if cardinality(v_booking_ids) > 0
    and to_regclass('public.booking_matches') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'booking_matches' and column_name = 'booking_id'
    )
  then
    execute 'delete from public.booking_matches where booking_id = any($1)' using v_booking_ids;
    get diagnostics v_booking_matches_deleted = row_count;
  end if;

  if cardinality(v_booking_ids) > 0
    and to_regclass('public.guest_request_activity') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'guest_request_activity' and column_name = 'request_id'
    )
  then
    execute 'delete from public.guest_request_activity where request_id = any($1)' using v_booking_ids;
    get diagnostics v_guest_request_activity_deleted = row_count;
  end if;

  if to_regclass('public.ready_stays') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ready_stays' and column_name = 'is_test_listing'
    )
  then
    execute 'delete from public.ready_stays where ' || v_test_filter;
  end if;

  if cardinality(v_disposable_rental_ids) > 0
    and to_regclass('public.rentals') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'rentals' and column_name = 'id'
    )
  then
    execute 'delete from public.rentals where id = any($1)' using v_disposable_rental_ids;
    get diagnostics v_rentals_deleted = row_count;
  end if;

  if cardinality(v_booking_ids) > 0
    and to_regclass('public.confirmed_bookings') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'confirmed_bookings' and column_name = 'booking_request_id'
    )
  then
    execute 'delete from public.confirmed_bookings where booking_request_id = any($1)' using v_booking_ids;
    get diagnostics v_confirmed_bookings_deleted = row_count;
  end if;

  if cardinality(v_booking_ids) > 0
    and to_regclass('public.booking_requests') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'booking_requests' and column_name = 'id'
    )
  then
    execute 'delete from public.booking_requests where id = any($1)' using v_booking_ids;
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
