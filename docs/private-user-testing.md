# Private User Testing (Guest + Owner)

This system uses private invite links with PixieDVC's existing auth flow.

## URL pattern

- Private test link: `/test/private/<token>`
- Non-invite landing: `/test`

## Core tables

- `private_test_campaigns`
- `private_test_invites`
- `private_test_sessions`
- `private_test_survey_responses`
- `private_test_events`

## Admin JSON export endpoint

- `GET /api/admin/testing/export`
- Optional query params:
  - `flow=guest|owner`
  - `campaign=<campaign-slug>`

Example:

```bash
curl -H "Cookie: <admin-session-cookie>" \
  "http://localhost:3000/api/admin/testing/export?flow=guest"
```

## Useful SQL queries

### 1) Session funnel by flow

```sql
select
  flow_type,
  count(*) as sessions_total,
  count(*) filter (where consent_accepted = true and confidentiality_accepted = true) as consented,
  count(*) filter (where status = 'completed') as completed
from public.private_test_sessions
group by flow_type
order by flow_type;
```

### 2) Latest completed responses

```sql
select
  s.id as session_id,
  s.flow_type,
  s.user_id,
  s.completed_at,
  r.submitted_at,
  r.response_answers
from public.private_test_sessions s
join public.private_test_survey_responses r on r.session_id = s.id
where s.status = 'completed'
order by r.submitted_at desc;
```

### 3) Filter by campaign slug

```sql
select
  c.slug as campaign_slug,
  i.token,
  s.flow_type,
  s.status,
  s.started_at,
  s.completed_at,
  r.response_answers
from public.private_test_sessions s
join public.private_test_invites i on i.id = s.invite_id
left join public.private_test_campaigns c on c.id = i.campaign_id
left join public.private_test_survey_responses r on r.session_id = s.id
where c.slug = 'your-campaign-slug'
order by s.created_at desc;
```

### 4) Biggest confusion + favorite part extraction

```sql
select
  s.flow_type,
  r.response_answers ->> 'biggest_confusion' as biggest_confusion,
  r.response_answers ->> 'favorite_part' as favorite_part
from public.private_test_survey_responses r
join public.private_test_sessions s on s.id = r.session_id
where s.status = 'completed';
```

