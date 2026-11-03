-- Include authorized no-charge test submissions in the existing Admin alert path.
-- Test bookings remain isolated from real booking operations by the existing guards.
begin;

alter table public.admin_reservation_request_alerts
  add column is_test_booking boolean not null default false;

create or replace function public.alert_on_booking_request_submission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status::text = 'submitted'
    and (new.is_test_booking or new.accepted_terms is true) then
    if tg_op = 'INSERT' then
      insert into public.admin_reservation_request_alerts(booking_request_id, is_test_booking)
      values (new.id, new.is_test_booking)
      on conflict (booking_request_id) do nothing;
    elsif old.status::text is distinct from 'submitted' then
      insert into public.admin_reservation_request_alerts(booking_request_id, is_test_booking)
      values (new.id, new.is_test_booking)
      on conflict (booking_request_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

commit;
