# Pixie Development Bible

This document is the permanent engineering handbook for Pixie, the AI Disney vacation planner inside PixieDVC. Every future Pixie task must read this file completely before changing code.

Pixie is expected to grow across frontend, backend, AI, voice, booking, Ready Stays, analytics, and operations. This document exists to keep those changes aligned with the PixieDVC production repository instead of re-deciding architecture in each prompt.

## 1. Product Vision

Pixie is a mobile-first AI Disney vacation planner built inside PixieDVC.

Pixie helps families plan Walt Disney World vacations first. Booking comes later, only after the user has received planning value, understands the recommendation, and explicitly chooses to move forward.

Pixie is not a chatbot. It is a structured planning engine with a conversational interface. The conversation helps gather intent and explain recommendations, but the durable product output is a continuously improved vacation plan.

Pixie exists to connect guest planning with the strongest parts of PixieDVC:

- `PixieDVC`: the production platform, auth system, Supabase data model, booking workflows, owner matching operations, analytics, affiliate attribution, and design system.
- `Ready Stays`: confirmed DVC stay opportunities with fixed resort, room type, dates, and price that can be recommended when they match user intent.
- `Booking Requests`: custom DVC accommodation requests created only after deterministic validation and explicit user confirmation.
- `Affiliates`: attribution and referral tracking that must continue through Pixie-led journeys.
- `Guest Planning`: resort selection, party needs, dates, budget, room fit, itinerary preferences, and education before any booking ask.

Pixie should feel like a helpful Disney vacation planner that naturally understands when DVC accommodations, Ready Stays, or a custom booking request are relevant. It should never feel like a sales bot pushing users into a funnel before helping them.

## 2. Product Principles

- Help before selling.
- Planning before booking.
- Structured data over conversation history.
- Truth over persuasion.
- Explain recommendations in plain language.
- Never fabricate Disney information.
- Never fabricate pricing.
- Never fabricate points.
- Never fabricate capacity.
- Never fabricate inventory.
- Never fabricate availability.
- Never fabricate Ready Stays.
- Booking always requires explicit user confirmation.
- Users receive value before registration.
- Voice and avatar are presentation layers.
- The planning engine is the product.

If a recommendation cannot be supported by trusted data or deterministic logic, Pixie must say so and ask for clarification or offer a safe next step.

## 3. Product Scope

Version 1 scope:

- Walt Disney World only.
- Web first.
- Mobile first.
- Text conversation first.
- Anonymous planning allowed.
- Authenticated save.
- Ready Stay recommendations.
- Booking request creation after explicit user confirmation.
- No Disney account integration.
- No live Disney APIs.
- No Lightning Lane automation.
- No dining reservation automation.
- No ticket purchasing.

Future roadmap may expand the destination and feature surface, but v1 must stay focused. Do not introduce Disneyland, cruise, Universal, ticketing, dining automation, or Disney account linking unless an explicit roadmap decision changes this document.

## 4. Architecture

Pixie lives inside the existing Next.js App Router repository. It must reuse existing PixieDVC systems instead of creating parallel engines.

Approved high-level flow:

```text
User
  |
  v
Conversation UI
  |
  v
Structured Planner State
  |
  v
Trusted Services
  |
  v
AI Explanation
  |
  v
Updated Plan
```

The AI never owns business logic. The model may propose changes, ask questions, and explain tradeoffs. Server-side services validate and compute the facts.

Core layers:

- Frontend: `/pixie` route, mobile-first chat surface, trip summary panel, resort cards, Ready Stay cards, save and booking CTAs.
- Planner State: typed state object representing destination, dates, party, room needs, budget, priorities, resort shortlist, Ready Stay matches, itinerary, and missing fields.
- AI: provider-backed orchestration that returns structured proposals, not trusted facts.
- Trusted Services: deterministic TypeScript services for resort scoring, points, guest price estimates, Ready Stay matching, and booking conversion.
- Booking: existing `booking_requests` flow and booking form schema, extracted into shared server logic where needed.
- Ready Stays: existing visibility, pricing, lock, package, agreement, and checkout flows.
- Supabase: authenticated persistence after the read-only planner is working.
- Analytics: existing visitor/session/event patterns with Pixie-specific event names when needed.

## 5. Source Of Truth

Ownership is non-negotiable.

| Domain | Source of truth | Notes |
| --- | --- | --- |
| Conversation | Pixie UI and message history | Useful context, not durable truth. |
| Planner State | Typed Pixie planner state | Primary working state for the trip. |
| Saved Trips | `pixie_trips` after persistence phase | Authenticated user-owned records. |
| Pricing | Deterministic services | Never model-generated. |
| DVC Points | `packages/pixiedvc-calculator` and wrappers | Server recomputes. |
| Resort identity | Existing `resorts` table and canonicalization helpers | WDW-only filter for v1. |
| Ready Stay availability | `ready_stays` plus visibility/locking helpers | Recheck at action time. |
| Booking Requests | Existing backend booking services and `booking_requests` | Never AI-owned. |
| Affiliate attribution | Existing affiliate cookies and booking attribution helpers | Preserve through Pixie. |
| Analytics | Existing analytics routes/tables | No separate analytics stack. |

Conversation history must never become the only source of trip facts. Every important fact must be represented in structured planner state.

## 6. Approved Implementation Order

Build order:

1. Planner schemas.
2. Recommendation engine.
3. Ready Stay matching.
4. AI orchestration.
5. Frontend.
6. Prototype testing.
7. Persistence.
8. Booking conversion.
9. Voice.
10. Avatar.
11. Analytics.
12. Production hardening.

This order was chosen to keep deterministic state and services ahead of AI and UI polish. Pixie must be useful and testable without persistence, voice, avatar, or booking conversion. Voice and avatar must attach to the same planner brain later; they must not create alternate planning logic.

Codex must not jump ahead in this roadmap unless a future prompt explicitly changes the approved phase.

## 7. Directory Structure

Approved folders and files:

```text
src/app/pixie/
  page.tsx
  PixieClient.tsx
  actions.ts

src/app/api/pixie/
  chat/route.ts
  trips/route.ts
  trips/[tripId]/route.ts

src/components/pixie/
  PixieChat.tsx
  PixieComposer.tsx
  PixiePlanSummary.tsx
  PixieResortRecommendations.tsx
  PixieReadyStayMatches.tsx
  PixieTripDrawer.tsx

src/lib/pixie/
  schema.ts
  types.ts
  ai.ts
  prompts.ts
  planner.ts
  resorts.ts
  ready-stays.ts
  booking-request.ts
  auth.ts
  rate-limit.ts
  *.test.ts

supabase/migrations/
  YYYYMMDDHHMMSS_create_pixie_trips.sql
```

Purpose:

- `src/app/pixie`: route-level page composition, server actions, route-specific client shell.
- `src/app/api/pixie`: HTTP boundaries for chat, saved trips, and future structured actions.
- `src/components/pixie`: reusable UI components only. Keep business logic out.
- `src/lib/pixie`: typed planner state, deterministic services, AI provider abstraction, validation, matching, and conversion helpers.
- `supabase/migrations`: Pixie persistence only when the approved phase reaches database work.

## 8. Data Model Philosophy

Pixie data should start flexible and become relational only when behavior proves stable.

Core concepts:

- Trip State: user-provided and inferred facts such as destination, dates, party, ages, budget, resort preferences, accessibility needs, and room needs.
- Planner State: Trip State plus derived recommendations, missing fields, stage, warnings, Ready Stay matches, and itinerary draft.
- Generated Plan: itinerary and narrative suggestions derived from Planner State.
- Local Draft: anonymous browser draft stored in localStorage/sessionStorage during v1.
- Database: authenticated saved trips and messages after persistence phase.
- Future Normalization: move repeated, query-heavy facts into relational columns only when needed.

Use JSON for evolving planner state. Use relational columns for ownership, status, foreign keys, timestamps, and operational links.

Anonymous persistence is initially local because Supabase anonymous sign-ins are disabled and server-side anonymous trip storage requires signed-token access, cleanup policy, and stricter abuse controls. Do not add anonymous Supabase persistence until explicitly approved.

Never store:

- Raw payment data.
- API keys.
- Secret prompts.
- Raw audio by default.
- Unnecessary personal information.
- Unvalidated AI output as trusted data.
- Provider credentials.
- Hidden model chain-of-thought.

Schema versioning:

- Planner state must include a version field, for example `schemaVersion: 1`.
- Any persisted JSON must be migrated or safely interpreted by version.
- Unknown model fields must be rejected, not silently saved.

## 9. AI Architecture

Pixie uses controlled planner-state orchestration.

Expected model contract:

```ts
type PixieModelResult = {
  response: string;
  tripPatch: PixieTripPatch;
  requestedTools: PixieToolRequest[];
  nextQuestion?: string;
  planningStage: PixiePlanningStage;
};
```

Flow:

1. Server receives user message and current planner state.
2. Server validates message size and payload size.
3. Server calls AI provider through a lightweight abstraction.
4. Model returns a structured proposal.
5. Server validates the proposal with Zod.
6. Server rejects unknown fields.
7. Server applies allowed patches.
8. Server runs trusted tools.
9. Server recomputes critical values.
10. Server returns final state and assistant response.

The model can propose. The server decides.

Critical values must be recomputed outside the model:

- Nights.
- Points.
- Estimated guest price.
- Capacity.
- Ready Stay availability.
- Resort IDs.
- Booking request payload.

Provider rule:

- AI providers must stay behind a lightweight abstraction.
- Existing OpenAI helper: `src/lib/ai/openai.ts`.
- Existing Gemini support route: `src/app/api/support/chat/route.ts`.
- Pixie should not reuse support chat as its planner brain. Support chat is question-answering; Pixie is stateful planning.

## 10. AI Tool Contract

Approved future tools:

| Tool | Purpose | Input | Output | Read-only | Confirmation required |
| --- | --- | --- | --- | --- | --- |
| `get_trip_state` | Return current validated planner state. | `tripId` or client state | Planner state | Yes | No |
| `update_trip_state` | Apply validated non-destructive state patch. | Allowed patch fields | Updated planner state | No | No for draft-only fields |
| `get_missing_trip_information` | Identify required facts still missing. | Planner state | Missing field list and next question | Yes | No |
| `recommend_resorts` | Score WDW DVC resorts against intent. | Planner state, resort catalog | Ranked resort recommendations | Yes | No |
| `estimate_points` | Estimate DVC points for resort, room, dates. | Resort code, room type, dates | Points total and nightly rows | Yes | No |
| `estimate_guest_price` | Estimate guest accommodation cost from trusted pricing policy. | Points, pricing tier/policy | Price estimate with label | Yes | No |
| `find_ready_stays` | Find public Ready Stays matching intent. | Planner state and filters | Exact and near matches | Yes | No |
| `generate_itinerary` | Draft park/resort day plan from state. | Planner state | Itinerary draft | Yes | No |
| `revise_itinerary_day` | Revise one itinerary day. | Day id, user instruction, planner state | Revised day | Yes | No |
| `prepare_booking_request_draft` | Convert validated planner state to booking draft payload. | Planner state | Booking request draft, warnings | Yes | Yes before submit |
| `submit_booking_request` | Create a real booking request through backend services. | Confirmed draft id/payload | Booking request id | No | Yes |
| `select_ready_stay` | Link user intent to a Ready Stay handoff. | Ready Stay id | Handoff URL or lock start | No | Yes |

Only `submit_booking_request` and `select_ready_stay` initiate user-impacting booking actions. Both require explicit user confirmation and server revalidation.

## 11. Trusted Services

Trusted deterministic services own facts and business rules:

- Resort scoring.
- Room and party fit.
- DVC points calculation.
- Guest price estimation.
- Ready Stay matching.
- Ready Stay availability recheck.
- Booking request conversion.
- Affiliate attribution handoff.

These services never belong inside prompts. Prompts may ask the model to explain service results, but not to invent or replace them.

Existing services and helpers to reuse:

- `packages/pixiedvc-calculator`
- `src/lib/stay/stayCalculator.ts`
- `src/lib/resort-calculator.ts`
- `src/lib/resorts/getResorts.ts`
- `src/lib/resorts/canonical.ts`
- `src/lib/ready-stays/showcase-live.ts`
- `src/lib/ready-stays/visibility.ts`
- `src/lib/ready-stays/test-pricing.ts`
- `src/lib/booking-attribution.ts`

## 12. Frontend Principles

Pixie frontend rules:

- Mobile first.
- Accessible.
- Chat first.
- Trip panel always reachable.
- Sticky composer.
- Useful before login.
- Typed input fallback always available.
- Voice optional.
- Avatar optional.
- Keyboard safe.
- Loading states for real work only.
- Error states for model, network, validation, and tool failures.
- Skeletons only when content is genuinely pending.
- No fake loading.
- Visible trip updates after Pixie learns something.
- Estimates clearly labelled.
- Exact Ready Stay matches and near matches clearly differentiated.
- No fake availability.
- Account prompt only after meaningful value.
- Video/avatar failure must not break the planner.

The `/pixie` experience may need a route-specific layout decision later if the global support widget or footer conflicts with a full-screen mobile planner. Any such change must be scoped and documented.

## 13. Security

Always consider:

- RLS on all persisted Pixie tables.
- Ownership checks on every authenticated read/write.
- No direct browser access to service-role behavior.
- Per-IP rate limits.
- Per-user rate limits.
- Maximum message size.
- Maximum payload size.
- Model timeout.
- Tool allowlist.
- Prompt injection.
- Server-only secrets.
- Log redaction.
- Rechecking inventory at action time.
- Explicit booking confirmation.
- PII minimization.
- Conversation retention.
- Future voice security.

Pixie-specific rules:

- The AI cannot call arbitrary tools.
- The AI cannot select hidden tools by name.
- Tool arguments must be validated before execution.
- User-provided text must never override system or developer rules.
- Prompt content must not include secrets.
- Logs must not include raw payment details, API keys, full auth tokens, or unnecessary PII.
- Ready Stay rows must be checked with existing public/admin visibility rules before display and again before handoff.
- Booking creation must require an authenticated user.

Recommended persisted table policy:

- `pixie_trips`: authenticated users can manage rows where `user_id = auth.uid()`.
- `pixie_messages`: authenticated users can access messages through owned parent trips.
- `pixie_plan_versions`: authenticated users can access versions through owned parent trips.
- No broad anonymous Supabase RLS for Pixie trips in v1.

## 14. Repository Integration

Pixie must reuse existing PixieDVC systems:

- Booking package: `packages/booking-form`.
- Existing booking route and request model: `src/app/api/booking/create/route.ts`, `booking_requests`, `booking_request_guests`.
- Calculator: `packages/pixiedvc-calculator`.
- Points wrapper: `src/lib/stay/stayCalculator.ts`.
- Ready Stays public and booking flow: `src/app/ready-stays`, `src/lib/ready-stays/*`.
- Ready Stay visibility and pricing helpers: `src/lib/ready-stays/visibility.ts`, `src/lib/ready-stays/test-pricing.ts`.
- Supabase SSR clients: `src/lib/supabase/server.ts`, `src/lib/supabase-server.ts`.
- Service-role clients: `src/lib/supabase-admin.ts`, `src/lib/supabase-service-client.ts`.
- Authentication: `/login`, `/auth/callback`, Supabase session cookies.
- Affiliate tracking and attribution: `src/components/affiliate/AffiliateTracker.tsx`, `src/components/referral/ReferralCapture.tsx`, `src/lib/booking-attribution.ts`.
- Analytics: `src/components/analytics/VisitorTracker.tsx`, `src/lib/analytics/*`, `/api/analytics/*`.
- Design system: `packages/design-system`.
- Resort canonicalization: `src/lib/resorts/canonical.ts`, `src/lib/resorts/getResorts.ts`.
- Email system: `src/lib/email.ts`, `src/lib/email/templates/*`.
- Support handoff only when human escalation is needed; do not use support chat as Pixie planner architecture.

Never duplicate these systems.

## 15. Engineering Rules

Non-negotiable:

- Never duplicate business logic.
- Never bypass validation.
- Never duplicate the booking flow.
- Never duplicate Ready Stay checkout.
- Never trust model output.
- Never create hidden state.
- Never let chat history be the source of truth.
- Never let AI write directly to Supabase.
- Never let AI invent price, points, capacity, inventory, or availability.
- Never submit a booking request without explicit user confirmation.
- Never apply migrations remotely from a Pixie implementation task.
- Never deploy from a Pixie implementation task.
- Never modify unrelated files.
- Never introduce breaking architectural changes without documenting them in this file and the progress log.

If a prompt conflicts with this document, stop and report the conflict before coding.

## 16. Code Quality Standards

Expected standards:

- Small components.
- Reusable service functions.
- Typed APIs.
- Zod validation at boundaries.
- Focused tests around planner logic and server actions.
- No giant files.
- Clear naming.
- Comments only where valuable.
- Repository consistency over new patterns.
- Server-only logic marked or located safely.
- Client components only where interactivity requires them.
- Deterministic services testable without model calls.

Pixie should be easy to reason about without reading prompts. The code should make the architecture visible.

## 17. Testing Requirements

Testing philosophy:

- Unit test planner schemas and patch application.
- Unit test resort scoring.
- Unit test Ready Stay matching.
- Unit test points/price wrappers.
- Unit test booking draft conversion.
- Test model-result validation with malformed output.
- Test prompt-injection-like user messages against tool allowlist behavior.
- Test anonymous draft restore.
- Test authenticated save and ownership checks when persistence is added.
- Test booking conversion authorization and confirmation requirements.
- Run lint.
- Run typecheck.
- Run production build.

Manual scenarios:

- Family with flexible dates and budget.
- User with exact resort and dates.
- User asking for cheapest option.
- User asking for Ready Stays now.
- User with accessibility needs.
- User with incomplete dates.
- User changes mind mid-conversation.
- Prompt injection attempt.
- Model provider failure.
- Ready Stay disappears before click.

## 18. Future Roadmap

Possible future ideas, not current commitments:

- Disneyland planning.
- Disney Cruise Line planning.
- Universal Orlando planning.
- Richer voice mode.
- Avatar improvements.
- Planner marketplace or concierge handoff packages.
- Notifications.
- Native mobile apps.
- Live data integrations.
- Trip sharing.
- Collaborative planning.
- Dining and park-day planning integrations.

Do not implement these unless a future approved phase explicitly requests them.

## 19. Decision Log

Append architectural decisions here when they are made.

### 2026-07-10: Pixie engineering foundation

- Pixie is a first-class feature inside the PixieDVC repository.
- Pixie is separate from support chat.
- Pixie v1 is Walt Disney World only.
- Text comes before voice; voice comes before avatar.
- Anonymous drafts start in browser localStorage/sessionStorage.
- Database persistence comes after the read-only planner works.
- AI output is always a proposal.
- Server-side deterministic services own facts, calculations, and writes.
- Existing Ready Stay and booking flows must be reused.
- A progress log must be updated after each implementation phase.

## 20. How Codex Must Operate

Every future Pixie prompt must begin with this workflow:

1. Read `docs/pixie-development-bible.md` completely.
2. Read `docs/pixie-progress-log.md` completely.
3. Inspect repository files relevant to the current phase.
4. Review the current phase and next approved task.
5. Identify conflicts between the prompt, this bible, the progress log, and current implementation.
6. If a conflict exists, stop and report it before changing code.
7. Implement only the requested scope.
8. Do not deploy.
9. Do not apply migrations remotely.
10. Do not modify unrelated files.
11. Run lint.
12. Run typecheck.
13. Run tests relevant to the change.
14. Run production build when feasible.
15. Report files changed, validation results, and any unresolved risks.

Prompt template:

```text
You are working on the Pixie AI planner inside the existing PixieDVC repository.

Before doing anything:

- Read docs/pixie-development-bible.md completely.
- Read docs/pixie-progress-log.md completely.
- Inspect all files relevant to this phase.
- Treat the development bible as the source of truth.
- If this prompt conflicts with the bible or current implementation, stop and report the conflict before changing code.
- Do not deploy.
- Do not apply migrations remotely.
- Do not modify unrelated files.
```

The rest of each prompt should contain one specific bounded task.
