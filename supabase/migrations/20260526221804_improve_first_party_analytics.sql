begin;

alter table public.visitor_sessions
alter column exit_page_path drop not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_visitor_sessions_updated_at
on public.visitor_sessions;

create trigger set_visitor_sessions_updated_at
before update on public.visitor_sessions
for each row
execute function public.set_updated_at();

create index if not exists visitor_sessions_created_at_visitor_idx
on public.visitor_sessions (created_at desc, visitor_id);

create index if not exists visitor_pageviews_page_created_idx
on public.visitor_pageviews (page_path, created_at desc);

create index if not exists visitor_events_session_event_idx
on public.visitor_events (session_id, event_name);

commit;
