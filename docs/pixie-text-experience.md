# Pixie Text Experience

This document describes Pixie Phase 5: the first mobile-first text planning experience at `/pixie` and the server API route at `/api/pixie/chat`.

Permanent architecture rules remain in `docs/pixie-development-bible.md`.

## Scope

Phase 5 adds anonymous, browser-local text planning only.

It does:

- Render `/pixie` as a mobile-first planning workspace.
- Let visitors type natural-language planning messages.
- Stream Pixie-owned NDJSON events from `/api/pixie/chat`.
- Update structured `PixieTripState` through the Phase 4 orchestrator.
- Render trip progress, trip summary, resort recommendations, Ready Stay matches, warnings, and plan outline.
- Restore the anonymous local draft after refresh.
- Reset the local draft with confirmation.
- Show a future-facing sign-in prompt without claiming server persistence.

It does not:

- Persist Pixie trips to Supabase.
- Create booking requests.
- Lock Ready Stays.
- Modify Ready Stay checkout, agreements, payment, or booking records.
- Send email.
- Add voice or avatar video.

## Route Architecture

Files:

- `src/app/pixie/page.tsx`
- `src/app/pixie/PixieClient.tsx`
- `src/app/api/pixie/chat/route.ts`
- `src/components/pixie/*`
- `src/lib/pixie/client/*`

`/pixie` stays inside the normal PixieDVC root layout, so it keeps the existing header, footer, affiliate capture, referral capture, and visitor analytics.

Phase 6 hides the global support widget on `/pixie` so the page does not present two competing assistant experiences or overlap the mobile composer. The support widget remains available on other routes.

## API Contract

`POST /api/pixie/chat`

Request:

```ts
{
  state: PixieTripState;
  message: string;
  recentMessages: PixieRecentMessage[];
  draftId?: string;
}
```

Response:

- `application/x-ndjson`
- one serialized `PixiePlannerStreamEvent` per line
- `Cache-Control: no-store`

The route validates JSON, planner state, message length, recent-message limits, feature flag, model configuration, request size, and rate limits before invoking the orchestrator.

The route never returns raw provider responses, API keys, system prompts, service-role data, or stack traces.

## Streaming Behavior

Phase 5 uses NDJSON events, not browser-specific UI streaming.

Important event types:

- `turn_started`
- `assistant_text_delta`
- `recommendations_ready`
- `ready_stays_ready`
- `plan_outline_ready`
- `warning`
- `usage`
- `turn_completed`
- `turn_failed`

The current Phase 4 provider does not stream token-by-token text. The UI still handles progressive server events and can adopt token streaming later without changing the route contract.

Phase 6 hardening requires every stream event to carry `turnId`. The client ignores stale events, rejects final results whose envelope turn ID does not match the result turn ID, and deduplicates repeated completion/failure events by turn ID.

## Feature Flag

Environment variable:

```text
PIXIE_PUBLIC_ENABLED=false
```

Behavior:

- `true`: `/pixie` and `/api/pixie/chat` are enabled.
- `false`: page shows disabled state and API returns a safe disabled error.
- unset: enabled outside production, disabled in production.

This prevents accidental production exposure before distributed rate limiting and launch hardening are complete.

## Rate Limiting

Phase 5 uses the Phase 4 in-memory limiter with:

- anonymous IP hash key;
- draft/session key;
- configurable window and request count.

Environment variables:

```text
PIXIE_RATE_LIMIT_WINDOW_MS=60000
PIXIE_RATE_LIMIT_MAX_REQUESTS=12
```

This is suitable for local and staging verification only. It is not production-grade across multiple Cloud Run instances.

## Client State

Client state lives in `src/lib/pixie/client/chat-state.ts`.

It tracks:

- current `PixieTripState`;
- displayed messages;
- capped recent-message summaries;
- pending input;
- stream status;
- active stream turn ID;
- assistant text in progress;
- recommendations;
- Ready Stay matches;
- plan outline;
- completeness;
- warnings;
- errors;
- draft recovery notices;
- save prompt state.

Messages have stable client IDs and roles:

- `user`
- `assistant`
- `status`

Internal tool events are not displayed as normal chat bubbles.

## Local Draft Recovery

Browser storage uses the Phase 1 contract:

```text
pixiedvc:pixie:draft:v1
```

Stored data:

- structured planner state;
- capped recent-message summaries.

Not stored:

- raw provider output;
- prompts;
- API keys;
- payment data;
- auth tokens;
- hidden inventory;
- raw diagnostic objects;
- unlimited chat history.

Corrupted or unsupported drafts are reset safely and can show a recovery notice.

## Responsive Layout

Desktop:

- chat workspace on the left;
- plan panel on the right.

Mobile:

- chat-first layout;
- sticky composer;
- plan drawer opened from the chat header;
- no hover-only controls.

## Recommendation Rendering

Resort cards render trusted Phase 2 data only:

- resort name;
- resolver image;
- recommended room;
- match label;
- top deterministic reason fragments;
- points where supported;
- guest estimate where supported;
- pricing unavailable state;
- estimate disclosure.

Cards use user-facing fit labels such as “Strong fit” or “Good fit” instead of exposing raw scoring values as scientific precision.

Ready Stay cards render trusted Phase 3 matches only:

- exact/flexible/alternative grouping;
- listing-specific price;
- date-change or partial-overlap label;
- sleeps;
- budget fit;
- recheck warning;
- existing Ready Stay path.

Ready Stay cards use labels such as “Exact match,” “Flexible-date option,” and “Partial overlap.” Partial overlaps remain visibly incomplete. The card action is a review/deep-link action into the existing Ready Stay flow, not a Pixie booking or lock action.

Pixie never displays owner payout values or treats Ready Stay prices as custom request estimates.

## Analytics Events

Phase 5 emits safe client events through existing analytics infrastructure:

- `pixie_page_viewed`
- `pixie_planning_started`
- `pixie_first_message_sent`
- `pixie_turn_completed`
- `pixie_turn_failed`
- `pixie_profile_progressed`
- `pixie_resort_recommendations_shown`
- `pixie_ready_stay_matches_shown`
- `pixie_ready_stay_clicked`
- `pixie_save_prompt_shown`
- `pixie_login_clicked`
- `pixie_trip_reset`

Events never include full messages, raw trip state, provider responses, secrets, legal names, or accessibility notes.

Phase 6 deduplicates planning-started, turn-completed, turn-failed, recommendation-shown, Ready-Stay-shown, and profile-progressed events by draft/session state and stream turn ID.

## Error Handling

The API and UI support safe states for:

- invalid JSON;
- invalid request;
- message too long;
- state too large;
- feature disabled;
- missing model configuration;
- rate limited;
- model/provider unavailable;
- timeout;
- malformed model output;
- network disconnect;
- cancelled request;
- corrupted local draft.

Configuration errors do not expose model names or infrastructure details to users.

## Accessibility

Phase 5 includes:

- semantic headings;
- accessible composer label;
- Enter/Shift+Enter keyboard behavior;
- ARIA live message updates;
- accessible mobile plan drawer;
- accessible reset dialog;
- visible focus states;
- minimum touch target sizing;
- text-only rendering for user content.

## Known Limitations

- No distributed rate limiter yet.
- No server-side saved trips.
- No public booking conversion.
- No Ready Stay recheck/lock action from Pixie.
- No token-by-token model streaming.
- Multiple browser tabs use last-writer-wins localStorage behavior. Cross-tab draft merge/conflict UI is not implemented.
- Full interactive mobile keyboard and drawer validation still requires a successful browser automation or manual device pass.

## Next Phase

The next approved phase should be prototype validation and launch hardening for the text experience, or authenticated persistence if product validation accepts the Phase 5 UX.
