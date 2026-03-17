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
  -- Delete child rows first so booking/rental core rows can be purged safely.
  if to_regclass('public.contract_events') is not null then
    delete from public.contract_events;
    get diagnostics v_contract_events_deleted = row_count;
  end if;

  if to_regclass('public.contracts') is not null then
    delete from public.contracts;
    get diagnostics v_contracts_deleted = row_count;
  end if;

  if to_regclass('public.payout_ledger') is not null then
    delete from public.payout_ledger;
    get diagnostics v_payout_ledger_deleted = row_count;
  end if;

  if to_regclass('public.rental_exceptions') is not null then
    delete from public.rental_exceptions;
    get diagnostics v_rental_exceptions_deleted = row_count;
  end if;

  if to_regclass('public.rental_documents') is not null then
    delete from public.rental_documents;
    get diagnostics v_rental_documents_deleted = row_count;
  end if;

  if to_regclass('public.rental_milestones') is not null then
    delete from public.rental_milestones;
    get diagnostics v_rental_milestones_deleted = row_count;
  end if;

  if to_regclass('public.booking_request_guests') is not null then
    delete from public.booking_request_guests;
    get diagnostics v_booking_request_guests_deleted = row_count;
  end if;

  if to_regclass('public.booking_matches') is not null then
    delete from public.booking_matches;
    get diagnostics v_booking_matches_deleted = row_count;
  end if;

  if to_regclass('public.guest_request_activity') is not null then
    delete from public.guest_request_activity;
    get diagnostics v_guest_request_activity_deleted = row_count;
  end if;

  if to_regclass('public.rentals') is not null then
    delete from public.rentals;
    get diagnostics v_rentals_deleted = row_count;
  end if;

  if to_regclass('public.confirmed_bookings') is not null then
    delete from public.confirmed_bookings;
    get diagnostics v_confirmed_bookings_deleted = row_count;
  end if;

  if to_regclass('public.booking_requests') is not null then
    delete from public.booking_requests;
    get diagnostics v_booking_requests_deleted = row_count;
  end if;

  if to_regclass('public.renter_requests') is not null then
    delete from public.renter_requests;
    get diagnostics v_renter_requests_deleted = row_count;
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
