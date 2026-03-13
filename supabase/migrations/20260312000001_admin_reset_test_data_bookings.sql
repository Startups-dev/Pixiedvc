create or replace function public.admin_reset_test_data_bookings()
returns table (
  booking_requests_deleted bigint,
  renter_requests_deleted bigint,
  rentals_deleted bigint,
  confirmed_bookings_deleted bigint
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
begin
  -- Optional dependents: contracts and events
  if to_regclass('public.contract_events') is not null then
    delete from public.contract_events;
  end if;

  if to_regclass('public.contracts') is not null then
    delete from public.contracts;
  end if;

  -- Optional rental dependents
  if to_regclass('public.payout_ledger') is not null then
    delete from public.payout_ledger;
  end if;

  if to_regclass('public.rental_exceptions') is not null then
    delete from public.rental_exceptions;
  end if;

  if to_regclass('public.rental_documents') is not null then
    delete from public.rental_documents;
  end if;

  if to_regclass('public.rental_milestones') is not null then
    delete from public.rental_milestones;
  end if;

  -- Optional booking/renter dependents
  if to_regclass('public.booking_request_guests') is not null then
    delete from public.booking_request_guests;
  end if;

  if to_regclass('public.booking_matches') is not null then
    delete from public.booking_matches;
  end if;

  if to_regclass('public.guest_request_activity') is not null then
    delete from public.guest_request_activity;
  end if;

  -- Required reset scope
  if to_regclass('public.rentals') is not null then
    select count(*) into v_rentals_deleted from public.rentals;
    delete from public.rentals;
  end if;

  if to_regclass('public.confirmed_bookings') is not null then
    select count(*) into v_confirmed_bookings_deleted from public.confirmed_bookings;
    delete from public.confirmed_bookings;
  end if;

  if to_regclass('public.booking_requests') is not null then
    select count(*) into v_booking_requests_deleted from public.booking_requests;
    delete from public.booking_requests;
  end if;

  if to_regclass('public.renter_requests') is not null then
    select count(*) into v_renter_requests_deleted from public.renter_requests;
    delete from public.renter_requests;
  end if;

  return query
  select
    v_booking_requests_deleted,
    v_renter_requests_deleted,
    v_rentals_deleted,
    v_confirmed_bookings_deleted;
end;
$$;

revoke all on function public.admin_reset_test_data_bookings() from public;
grant execute on function public.admin_reset_test_data_bookings() to service_role;
