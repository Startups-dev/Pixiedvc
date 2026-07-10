# Pixie Progress Log

This is the living engineering journal for Pixie implementation. Update it after every Pixie phase or meaningful architecture change.

Permanent rules live in `docs/pixie-development-bible.md`. This file tracks status, history, files touched, validation, and the next approved task.

## Project Status

Pixie has not been implemented yet.

The architecture audit is complete. The repository has been inspected for relevant systems:

- Next.js App Router application under `src/app`.
- Shared libraries under `src/lib`.
- Supabase SSR, browser, admin, and service-role clients.
- Existing booking request flow.
- Existing Ready Stay marketplace and booking flow.
- Existing affiliate attribution.
- Existing analytics.
- Existing email system.
- Existing design-system package.
- Existing DVC calculator package.
- Existing OpenAI helper and Gemini-powered support chat route.

Phase 1 planner-state foundation is complete. Pixie now has typed, deterministic schemas and local-draft utilities, but still has no frontend, AI calls, persistence, migrations, Ready Stay matching, point estimation, pricing, or booking conversion.

## Current Phase

Phase 1: Planner schemas and deterministic state foundation.

Approved implementation order from the development bible:

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

Phase 1 is complete. The next approved implementation phase is the deterministic recommendation engine foundation.

## Completed Work

### 2026-07-10: Architecture audit completed

Findings:

- Pixie should be a first-class feature, not an extension of support chat.
- Pixie should use structured planner state as the source of truth.
- The AI should propose state changes and explanations only.
- Server-side deterministic services should own validation, points, pricing, Ready Stay matching, and booking conversion.
- Existing booking and Ready Stay flows should be reused rather than duplicated.
- Anonymous v1 drafts should remain local until persistence is approved.

### 2026-07-10: Engineering documentation foundation created

Created:

- `docs/pixie-development-bible.md`
- `docs/pixie-progress-log.md`

Purpose:

- Establish permanent Pixie product and engineering rules.
- Establish required Codex workflow for future Pixie tasks.
- Preserve architecture decisions before implementation starts.

### 2026-07-10: Phase 1 planner-state foundation completed

Implemented:

- Canonical `PixieTripState` Zod schema.
- Strict `PixieTripPatch` schema.
- Deterministic patch application through `applyPixieTripPatch`.
- Date-only night calculation using UTC day math.
- Party-count reconciliation with stable local traveller IDs.
- Age-group derivation.
- Planning-stage derivation.
- Deterministic completeness/readiness evaluation.
- Browser-independent local-draft serialization, migration, validation, and recovery.
- Planner-state reference documentation.

Not implemented in this phase:

- AI/model-provider calls.
- `/pixie` frontend.
- Database persistence.
- Database migrations.
- Resort scoring.
- DVC point estimation.
- Pricing.
- Ready Stay matching or checkout changes.
- Booking request conversion.
- Voice or avatar.

## Architecture Decisions

- Pixie lives inside the existing PixieDVC production repository.
- Pixie is separate from support chat.
- Pixie is a planner, not a chatbot.
- Planner state is the source of truth.
- Conversation history is context, not durable truth.
- AI output is untrusted until validated.
- AI never writes directly to Supabase.
- Pricing, points, capacity, inventory, availability, booking, and Ready Stay state are owned by trusted deterministic services.
- Existing booking request and Ready Stay checkout flows must be reused.
- AI providers must stay behind a lightweight abstraction.
- Text, voice, and avatar must share the same Pixie brain and tools.
- Anonymous drafts initially live in browser storage.
- Database persistence starts only after the read-only planner works.
- Pixie planner state uses schema version `1`.
- Pixie local draft version is `1`.
- Pixie local draft storage key is `pixiedvc:pixie:draft:v1`.
- Budget preferences use integer cents via `amountCents`.
- Date calculations use `YYYY-MM-DD` date-only strings and UTC day math.
- Empty drafts and partial drafts are valid.
- Generated/trusted results are placeholders in state but cannot be directly patched.
- Traveller array edits use explicit operations: `addTraveller`, `updateTraveller`, and `removeTraveller`.
- Blank preference/interests array entries are accepted at parse time and removed during normalization.
- Extra unknown/sensitive fields in planner state are rejected rather than silently serialized.

## Files Added

Documentation foundation:

- `docs/pixie-development-bible.md`
- `docs/pixie-progress-log.md`

Phase 1 planner foundation:

- `docs/pixie-planner-state.md`
- `src/lib/pixie/constants.ts`
- `src/lib/pixie/schema.ts`
- `src/lib/pixie/types.ts`
- `src/lib/pixie/planner-state.ts`
- `src/lib/pixie/completeness.ts`
- `src/lib/pixie/local-draft.ts`
- `src/lib/pixie/tests/schema.test.ts`
- `src/lib/pixie/tests/planner-state.test.ts`
- `src/lib/pixie/tests/completeness.test.ts`
- `src/lib/pixie/tests/local-draft.test.ts`

## Files Modified

Documentation reference:

- `README.md`

Phase 1 documentation updates:

- `docs/pixie-development-bible.md`
- `docs/pixie-progress-log.md`

## Database Migrations

None.

No Pixie migrations have been created.

No remote migrations have been applied.

## Tests

Pixie Phase 1 tests exist under `src/lib/pixie/tests`.

Targeted Pixie validation should run before broad repository validation.

### 2026-07-10 Validation

- `pnpm run lint`: failed on pre-existing repository lint issues unrelated to Pixie documentation. Examples include `@typescript-eslint/no-explicit-any` in calculator/admin/owner files, CommonJS `require()` warnings in scripts, React hook rule violations in `src/components/TestimonialsSection.tsx`, and existing image/lint warnings.
- `pnpm exec tsc --noEmit`: failed on pre-existing repository type errors unrelated to Pixie documentation. Examples include Next 15 route handler type mismatches, Supabase relationship typing mismatches, missing Vitest globals in test files, React type mismatches in workspace packages, and contract snapshot typing issues.
- `pnpm run build`: first sandboxed run failed with a Turbopack process/port permission error while processing `src/app/owner/rentals/[rentalId]/rental-header.module.css`.
- `pnpm run build`: rerun outside the sandbox succeeded. Next reported many existing `themeColor` metadata warnings and noted that production build skips type validation and linting.

### 2026-07-10 Phase 1 Validation

- `pnpm exec vitest run src/lib/pixie/tests`: passed. 4 test files, 52 tests.
- `pnpm run lint`: failed on existing repository lint issues. No `src/lib/pixie` lint errors were reported in the final run. Existing examples include calculator `any` usage, CommonJS script imports, `TestimonialsSection` hook-order violations, unescaped entities, and image/useEffect warnings.
- `pnpm exec tsc --noEmit --pretty false`: failed on existing repository type issues. After Pixie fixes, the final run did not report `src/lib/pixie` errors. Existing examples include Next 15 route-handler type mismatches, Supabase relation array/object typing, missing Vitest globals in older tests, contract snapshot typing, and package React type mismatches.
- `pnpm run build`: first sandboxed run failed with Turbopack `Operation not permitted` while creating a process/binding an internal port. Escalated rerun succeeded. Next still emitted existing `themeColor` metadata warnings and skipped lint/type validation.

## Known Issues

- The repository has an OpenAI helper at `src/lib/ai/openai.ts`, but the main support chat route currently uses Gemini.
- Support KB schema supports vector embeddings, but `scripts/support-index.js` currently upserts documents without generating embeddings.
- Existing canonical resort helpers include non-Walt Disney World resorts; Pixie v1 must filter to WDW only.
- Booking creation logic currently lives in `/api/booking/create`; Pixie booking conversion should extract or share that logic instead of duplicating it.
- Ready Stay recommendation results can become stale and must be rechecked at action time.
- Cost estimate policy for custom booking requests needs a confirmed source of truth beyond points calculation.
- The exact canonical room-type identifier set remains unresolved; Phase 1 uses opaque `selectedRoomType` strings until the recommendation/booking boundary confirms canonical IDs.
- The exact WDW DVC resort allowlist should be verified against current canonical resort data before resort scoring begins.
- `booking_ready` currently means ready for a booking draft handoff, not ready to submit a booking without authentication and booking-form details.

## Future Work

Future phases:

- Build deterministic resort recommendation service for Walt Disney World.
- Build deterministic Ready Stay matching service.
- Add AI orchestration behind provider abstraction.
- Build `/pixie` mobile-first frontend.
- Add authenticated persistence.
- Add booking request conversion.
- Add voice.
- Add avatar.
- Add admin analytics and production hardening.

## Open Questions

- Which model provider should Pixie use first: OpenAI, Gemini, or a provider abstraction with one configured default?
- What is the exact WDW DVC resort allowlist for v1, including whether Fort Wilderness cabins should be included in Phase 2 scoring?
- What canonical room-type IDs should Pixie expose before booking conversion?
- What guest price estimate policy should custom Pixie plans use?
- Should Pixie hide or alter the global support widget on `/pixie`?
- What retention policy should apply to saved Pixie conversations and plans?
- Should users be able to delete saved Pixie trips from v1?
- Which Pixie analytics events are required for launch?

## Next Approved Task

Phase 2: Deterministic recommendation engine foundation.

The next implementation task should build trusted, non-AI resort recommendation inputs and scoring primitives for Walt Disney World only. It should reuse existing canonical resort/calculator data, avoid point/pricing promises unless the trusted calculator path is explicitly wired, and must not add AI calls, frontend UI, persistence, migrations, Ready Stay checkout changes, or booking request creation.

Before starting Phase 1, Codex must read:

1. `docs/pixie-development-bible.md`
2. `docs/pixie-progress-log.md`
3. Existing repository files relevant to planner schema design
