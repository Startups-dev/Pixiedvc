# Ready Stays Phase 2 Rollout

## Feature Flags

Set these environment variables to control rollout scope:

- `READY_STAYS_SHOWCASE_HOME=true|false`
- `READY_STAYS_SHOWCASE_RESORT=true|false`
- `READY_STAYS_SHOWCASE_SEARCH=true|false`
- `READY_STAYS_LIVE_DATA=true|false`
- `READY_STAYS_ADMIN=true|false`

Recommended staged rollout:

1. `READY_STAYS_LIVE_DATA=false`, `READY_STAYS_ADMIN=true` on staging.
2. Seed/fix merchandising fields in admin (`/admin/ready-stays`).
3. Turn on `READY_STAYS_LIVE_DATA=true` in staging and verify sections.
4. Promote to production with `READY_STAYS_LIVE_DATA=true` only after checks.

## Seed Checklist (Manual)

For each listing you want visible in showcase sections:

- `status = active`
- `slug` set and unique
- `title` set
- `image_url` set
- `sleeps >= 1`
- `placement_home`, `placement_resort`, `placement_search` set as needed
- `priority` / `sort_override` set for ordering
- `check_out >= current_date`
- `expires_at` null or future date

## Optional SQL Seed Example

```sql
update public.ready_stays
set
  slug = coalesce(nullif(slug, ''), id::text),
  title = coalesce(nullif(title, ''), 'Ready Stay'),
  image_url = coalesce(nullif(image_url, ''), 'https://example.com/ready-stay.jpg'),
  sleeps = coalesce(sleeps, 4),
  placement_home = true,
  placement_resort = true,
  placement_search = false,
  featured = true,
  priority = 100,
  status = 'active'
where id = '<READY_STAY_ID>';
```

## Rollback

To disable live showcase instantly without code rollback:

- Set `READY_STAYS_LIVE_DATA=false`

The UI falls back to mock showcase cards and keeps page rendering stable.
