alter table public.guest_request_activity
  drop constraint if exists guest_request_activity_request_id_fkey;

alter table public.guest_request_activity
  add constraint guest_request_activity_request_id_fkey
  foreign key (request_id)
  references public.booking_requests(id)
  on delete cascade;

alter table public.guest_request_activity
  add column if not exists metadata jsonb;

alter table public.guest_request_activity
  drop constraint if exists guest_request_activity_kind_check;

alter table public.guest_request_activity
  add constraint guest_request_activity_kind_check
  check (kind in ('note','status_change','availability'));
