# PixieDVC Security Decisions

## Supabase RLS Strategy

We operate on a **deny-by-default** model.

### Server-only tables
The following tables intentionally have:
- RLS enabled
- No client policies
- No anon/authenticated grants

They must only be accessed via server routes using the service role key.

- admin_audit_events
- cron_locks
- confirmed_bookings

Reason:
These tables either contain sensitive data or lack user-scoping columns
that would allow safe Row Level Security policies.

⚠️ Do NOT add client RLS policies unless a proper ownership model exists.

### Public tables
- resort_layouts

Policy:
- SELECT allowed to anon/authenticated
- No INSERT/UPDATE/DELETE

Reason:
Static, non-sensitive metadata used by the frontend.

## Important Principle
If a table cannot be safely filtered by auth.uid(), it must remain server-only.
