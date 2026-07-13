# Pixie Phase 6 Validation

Phase 6 validates the Phase 5 anonymous text prototype at `/pixie` and hardens issues found during local testing. It does not add persistence, booking conversion, Ready Stay locking, voice, avatar, or deployment.

## Scenarios Tested

Local server testing was run with:

- `PIXIE_PUBLIC_ENABLED=true`
- `PIXIE_MODEL=gpt-5.6-sol`
- synthetic trip data only

Validated requests included:

- incomplete trip: “We want to go to Disney.”
- complete family trip: “We are two adults and two children, ages 6 and 9. We want to visit October 10 through October 17, 2026. We love EPCOT and swimming, and we want a balanced trip.”
- feature flag disabled behavior
- missing model configuration behavior
- NDJSON response shape

The in-app browser automation tool could not attach in this environment because the Node REPL browser runtime failed with `codex/sandbox-state-meta: missing field sandboxPolicy`. Manual localhost HTTP validation and automated UI/state tests were used instead. Full visual browser inspection remains a launch-readiness item.

## Bugs Found

- Stream events used one turn ID for `turn_started` and a different turn ID inside the final result.
- Client state accepted stream events without checking whether they belonged to the active turn.
- A duplicated final event could duplicate assistant messages and analytics.
- A new user turn did not clear stale recommendation, Ready Stay, and plan-outline panels while updated results were pending.
- Malformed NDJSON stream lines surfaced as raw JSON parsing failures.
- `/pixie` displayed the global support widget, creating a competing assistant and potential mobile composer overlap.
- Resort and Ready Stay cards displayed raw numeric scores, which implied more precision than the scoring model should claim.
- Analytics could emit `pixie_planning_started` and card-shown events more than once.

## Fixes Made

- Every Pixie planner stream event now carries `turnId`.
- `streamPixiePlannerTurn` passes the same turn ID into `runPixiePlannerTurn`, so `turn_started`, intermediate events, and `turn_completed.result.turnId` match.
- Client state now records `activeTurnId` and ignores stale or mismatched events.
- New turns clear stale recommendations, Ready Stay matches, plan outlines, and warnings until authoritative replacement results arrive.
- Client NDJSON parsing now returns a safe `malformed_stream_event` error.
- Completion and failure analytics are deduplicated by turn ID.
- `pixie_planning_started` fires once per draft session.
- The global support widget is hidden on `/pixie` only.
- Resort cards show user-facing fit labels and tradeoffs instead of raw scores.
- Ready Stay cards show classification labels and a “Review Ready Stay” action instead of raw scores.

## Conversation Quality

The complete-family synthetic scenario extracted dates, party, child ages, EPCOT/swimming interests, and balanced pace. The response was concise and asked for budget context next. No duplicate date or party question was observed.

The incomplete scenario did not produce premature resort pricing or inventory claims. It asked for dates as the next useful question.

No prompt version change was made in Phase 6. The issues found were state, stream, UI, and analytics issues rather than prompt-behavior failures.

## Mobile Findings

The most important mobile issue found through rendered markup inspection was the support widget overlap risk. Phase 6 hides the global support widget on `/pixie`.

Full viewport, keyboard-open, drawer-focus, and rotation validation still require an interactive browser session after the browser tooling issue is resolved.

## Desktop Findings

The desktop page rendered through the normal PixieDVC layout and returned HTTP 200 when enabled. No desktop-only code change was made beyond the support-widget decision and card-label changes.

## Streaming Findings

Pixie uses progressive NDJSON events. Phase 6 hardens the contract so:

- every event has a turn ID;
- stale events are ignored by the client;
- mismatched final result IDs are rejected;
- duplicate final events do not duplicate assistant messages;
- malformed stream lines produce a safe client error.

## Local Draft Findings

The anonymous draft remains browser-local under `pixiedvc:pixie:draft:v1`. Phase 6 keeps the Phase 5 storage contract unchanged.

Multiple-tab behavior is last-writer-wins through browser `localStorage`. Pixie does not yet implement cross-tab merge or conflict UI. A tab should not accept stale stream events for another active turn, but concurrent edits in multiple tabs can overwrite each other at the storage layer. This remains a known limitation until persistence or cross-tab coordination is added.

## Support Widget Decision

Decision: hide the global support widget on `/pixie`.

Reasoning:

- Pixie is itself an assistant experience.
- The support widget can overlap the mobile composer and drawer.
- Two assistant entry points on the same page are confusing.
- Existing support remains available on other routes.

Future concierge escalation should be presented inside Pixie as a clear human-help action rather than a second floating assistant.

## Accessibility Findings

Phase 6 preserves Phase 5 semantic structure, accessible composer behavior, and dialog/drawer contracts. Automated UI tests cover escaped user text, composer keyboard behavior, and support-widget absence on `/pixie`.

Full keyboard-only and screen-reader walkthroughs remain required before public launch.

## Analytics Findings

Phase 6 deduplicates:

- `pixie_planning_started`
- `pixie_turn_completed`
- `pixie_turn_failed`
- `pixie_resort_recommendations_shown`
- `pixie_ready_stay_matches_shown`
- `pixie_profile_progressed`

Analytics remain limited to safe metadata. No full messages, raw trip state, provider payloads, secrets, legal names, or accessibility notes are sent.

## Remaining Launch Blockers

- Distributed rate limiting is required before public multi-instance production exposure.
- Full visual browser validation is still needed because the in-app browser runtime failed in this environment.
- Full mobile keyboard and drawer-focus testing remains manual/browser-gated.
- Authenticated persistence does not exist yet.
- Ready Stay links still require the existing Ready Stay flow to recheck inventory and price.
- No booking-request conversion exists yet.

## Next Phase Recommendation

Authenticated Pixie persistence can begin after a final interactive browser pass confirms the Phase 6 UI behavior on real desktop and mobile viewports. Public production exposure should wait for distributed rate limiting.
