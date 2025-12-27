-- View: public.resort_full
-- Aggregates normalized resort tables into the JSON shape expected by the Next.js app.

create or replace view public.resort_full as
with photo_data as (
  select
    rp.resort_slug,
    jsonb_agg(
      jsonb_build_object(
        'src', rp.url,
        'alt', rp.alt,
        'caption', coalesce(rp.alt, rp.url),
        'sort_order', rp.sort_order
      )
      order by rp.sort_order nulls last, rp.url
    ) as photos,
    (
      select rp2.url
      from resort_photos rp2
      where rp2.resort_slug = rp.resort_slug
      order by case when coalesce(rp2.is_hero, false) then 0 else 1 end,
               rp2.sort_order nulls last,
               rp2.url
      limit 1
    ) as hero_image
  from resort_photos rp
  group by rp.resort_slug
),
layout_data as (
  select
    rl.resort_slug,
    jsonb_agg(
      jsonb_build_object(
        'name', rl.name,
        'sleeps', rl.sleeps,
        'square_feet', rl.square_feet,
        'bed_config', rl.bed_config,
        'image_url', rl.image_url,
        'sort_order', rl.sort_order
      )
      order by rl.sort_order nulls last, rl.name
    ) as layouts,
    (
      select jsonb_build_object(
        'title', rl2.name,
        'bullets', to_jsonb(array_remove(
          array[
            case when rl2.sleeps is not null then 'Sleeps ' || rl2.sleeps || ' Guests' end,
            case when rl2.square_feet is not null then rl2.square_feet || ' sq.ft' end,
            rl2.bed_config
          ], null)),
        'notes', null,
        'image', rl2.image_url
      )
      from resort_room_layouts rl2
      where rl2.resort_slug = rl.resort_slug
      order by rl2.sort_order nulls last, rl2.name
      limit 1
    ) as layout_primary
  from resort_room_layouts rl
  group by rl.resort_slug
),
fact_data as (
  select
    rf.resort_slug,
    jsonb_agg(
      jsonb_build_object(
        'title', rf.label,
        'value', rf.value,
        'sort_order', rf.sort_order
      )
      order by rf.sort_order nulls last, rf.label
    ) as facts
  from resort_facts rf
  group by rf.resort_slug
),
essential_data as (
  select
    re.resort_slug,
    jsonb_agg(
      jsonb_build_object(
        'icon', re.icon,
        'title', re.title,
        'body', re.body,
        'sort_order', re.sort_order
      )
      order by re.sort_order nulls last, re.title
    ) as essentials_sections,
    jsonb_build_object(
      'transportation', (
        select coalesce(
          (
            select re2.body
            from resort_essentials re2
            where re2.resort_slug = re.resort_slug
              and lower(re2.title) = 'transportation'
            order by re2.sort_order nulls last
            limit 1
          ), ''
        )
      ),
      'amenities', coalesce((
        select jsonb_agg(trim(v.value))
        from (
          select re3.sort_order,
                 trim(val) as value,
                 row_number() over (partition by re3.resort_slug, re3.sort_order order by ordinality) as line_order
          from resort_essentials re3,
               unnest(coalesce(regexp_split_to_array(re3.body, E'\s*\n+\s*'), array['']::text[])) with ordinality as val(value, ordinality)
          where re3.resort_slug = re.resort_slug
            and lower(re3.title) = 'amenities'
            and trim(val) <> ''
        ) v
        order by v.sort_order nulls last, v.line_order
      ), '[]'::jsonb),
      'dining', coalesce((
        select jsonb_agg(trim(v.value))
        from (
          select re3.sort_order,
                 trim(val) as value,
                 row_number() over (partition by re3.resort_slug, re3.sort_order order by ordinality) as line_order
          from resort_essentials re3,
               unnest(coalesce(regexp_split_to_array(re3.body, E'\s*\n+\s*'), array['']::text[])) with ordinality as val(value, ordinality)
          where re3.resort_slug = re.resort_slug
            and lower(re3.title) = 'dining'
            and trim(val) <> ''
        ) v
        order by v.sort_order nulls last, v.line_order
      ), '[]'::jsonb),
      'notices', coalesce((
        select jsonb_agg(trim(v.value))
        from (
          select re3.sort_order,
                 trim(val) as value,
                 row_number() over (partition by re3.resort_slug, re3.sort_order order by ordinality) as line_order
          from resort_essentials re3,
               unnest(coalesce(regexp_split_to_array(re3.body, E'\s*\n+\s*'), array['']::text[])) with ordinality as val(value, ordinality)
          where re3.resort_slug = re.resort_slug
            and lower(re3.title) in ('notices', 'notice', 'refurbishments')
            and trim(val) <> ''
        ) v
        order by v.sort_order nulls last, v.line_order
      ), '[]'::jsonb)
    ) as essentials_object
  from resort_essentials re
  group by re.resort_slug
),
neighbor_data as (
  select
    rn.resort_slug,
    jsonb_agg(
      jsonb_build_object(
        'slug', rn.neighbor_slug,
        'name', r2.name,
        'distance', rn.distance,
        'notes', rn.notes
      )
      order by rn.distance, rn.neighbor_slug
    ) as nearby
  from resort_neighbors rn
  left join resorts r2 on r2.slug = rn.neighbor_slug
  group by rn.resort_slug
)
select
  r.slug,
  r.name,
  coalesce(r.location, '') as location,
  r.tagline,
  coalesce(pd.hero_image, r.hero_image) as hero_image,
  r.card_image,
  coalesce(r.chips, array[]::text[]) as chips,
  r.points_range,
  coalesce(fd.facts, '[]'::jsonb) as facts,
  coalesce(ld.layout_primary, '{}'::jsonb) as layout,
  coalesce(ld.layouts, '[]'::jsonb) as layouts,
  coalesce(pd.photos, '[]'::jsonb) as photos,
  coalesce(ed.essentials_object, '{}'::jsonb) as essentials,
  coalesce(ed.essentials_sections, '[]'::jsonb) as essentials_sections,
  '{}'::jsonb as map,
  coalesce(nd.nearby, '[]'::jsonb) as nearby
from resorts r
left join photo_data pd on pd.resort_slug = r.slug
left join layout_data ld on ld.resort_slug = r.slug
left join fact_data fd on fd.resort_slug = r.slug
left join essential_data ed on ed.resort_slug = r.slug
left join neighbor_data nd on nd.resort_slug = r.slug;
