alter table public.booking_requests
  drop constraint if exists booking_requests_availability_status_check;

alter table public.booking_requests
  add constraint booking_requests_availability_status_check
  check (
    availability_status is null
    or availability_status in (
      'needs_check',
      'available',
      'unavailable',
      'confirmed',
      'not_available',
      'needs_clarification'
    )
  );
