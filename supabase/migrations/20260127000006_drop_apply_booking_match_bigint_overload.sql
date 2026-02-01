do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as regproc
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'apply_booking_match'
      and pg_get_function_identity_arguments(p.oid) ilike '%bigint%'
  loop
    execute format('drop function if exists %s', fn.regproc);
  end loop;
end $$;
