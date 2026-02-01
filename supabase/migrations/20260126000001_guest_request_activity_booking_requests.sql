alter table public.guest_request_activity
  drop constraint if exists guest_request_activity_request_id_fkey;

alter table public.guest_request_activity
  add constraint guest_request_activity_request_id_fkey
  foreign key (request_id)
  references public.booking_requests(id)
  on delete cascade;

comment on table public.guest_request_activity is 'Internal notes and status changes for concierge handling of booking requests.';
