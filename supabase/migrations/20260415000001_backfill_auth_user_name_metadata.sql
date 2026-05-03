begin;

with latest_owner_names as (
  select distinct on (owner_id)
    owner_id,
    nullif(trim(owner_legal_full_name), '') as owner_legal_full_name
  from public.owner_memberships
  where nullif(trim(owner_legal_full_name), '') is not null
  order by owner_id, created_at desc
),
name_sources as (
  select
    u.id,
    nullif(trim(p.display_name), '') as profile_display_name,
    nullif(trim(p.full_name), '') as profile_full_name,
    lon.owner_legal_full_name,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      lon.owner_legal_full_name
    ) as display_name_source,
    coalesce(
      nullif(trim(p.full_name), ''),
      lon.owner_legal_full_name,
      nullif(trim(p.display_name), '')
    ) as full_name_source
  from auth.users u
  left join public.profiles p
    on p.id = u.id
  left join latest_owner_names lon
    on lon.owner_id = u.id
),
patched as (
  select
    id,
    jsonb_strip_nulls(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            coalesce(raw_user_meta_data, '{}'::jsonb),
            '{display_name}',
            to_jsonb(
              coalesce(
                nullif(trim(raw_user_meta_data ->> 'display_name'), ''),
                display_name_source
              )
            ),
            true
          ),
          '{full_name}',
          to_jsonb(
            coalesce(
              nullif(trim(raw_user_meta_data ->> 'full_name'), ''),
              full_name_source
            )
          ),
          true
        ),
        '{name}',
        to_jsonb(
          coalesce(
            nullif(trim(raw_user_meta_data ->> 'name'), ''),
            full_name_source,
            display_name_source
          )
        ),
        true
      )
    ) as next_meta
  from auth.users
  join name_sources using (id)
  where
    display_name_source is not null
    or full_name_source is not null
)
update auth.users u
set
  raw_user_meta_data = patched.next_meta,
  updated_at = now()
from patched
where
  u.id = patched.id
  and u.raw_user_meta_data is distinct from patched.next_meta;

commit;
