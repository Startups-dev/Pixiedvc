create or replace function public.confirm_booking_availability(
  request_id uuid,
  availability_status text,
  note text,
  actor_id uuid
)
returns table (
  id uuid,
  status text,
  availability_status text,
  availability_checked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  prev_status text;
  new_status text;
begin
  select status into prev_status
  from public.booking_requests
  where id = request_id;

  update public.booking_requests
  set availability_status = confirm_booking_availability.availability_status,
      availability_checked_at = now(),
      availability_notes = note,
      status = case
        when confirm_booking_availability.availability_status = 'confirmed'
          and status in ('submitted', 'needs_check') then 'pending_match'
        else status
      end,
      updated_at = now()
  where id = request_id
  returning public.booking_requests.status into new_status;

  if not found then
    return;
  end if;

  insert into public.guest_request_activity (
    request_id,
    author_id,
    kind,
    body,
    metadata
  ) values (
    request_id,
    actor_id,
    'availability',
    note,
    jsonb_build_object('availability_status', availability_status)
  );

  if prev_status is distinct from new_status then
    insert into public.guest_request_activity (
      request_id,
      author_id,
      kind,
      body,
      from_status,
      to_status,
      metadata
    ) values (
      request_id,
      actor_id,
      'status_change',
      null,
      prev_status,
      new_status,
      jsonb_build_object('action', 'promote_to_matching')
    );
  end if;

  return query
    select br.id, br.status, br.availability_status, br.availability_checked_at
    from public.booking_requests br
    where br.id = request_id;
end;
$$;
