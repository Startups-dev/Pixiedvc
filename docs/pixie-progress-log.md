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

Phase 1 planner-state foundation is complete. Pixie now has typed, deterministic schemas and local-draft utilities.

Phase 2 deterministic resort recommendation foundation is complete. Pixie now has a Walt Disney World DVC resort allowlist, identifier adapters, room-capacity handling, deterministic eligibility/scoring, point-estimation adapters, guest accommodation estimate adapters, typed recommendation output, tests, and recommendation documentation.

Phase 2.5 pricing and resort-identity reconciliation is complete. Pixie now has an explicit pricing authority map, synchronized calculator source/package output, pricing-context separation, hardened AKV/Kidani/Jambo identifier behavior, and regression tests for source/runtime drift.

Pixie still has no frontend, AI calls, persistence, migrations, Ready Stay matching, booking conversion, voice, avatar, or deployment.

## Current Phase

Phase 2.5: Pricing and resort-identity reconciliation.

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

Phase 1, Phase 2, and Phase 2.5 are complete. The next approved implementation phase is deterministic Ready Stay matching.

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

### 2026-07-10: Phase 2 resort recommendation foundation completed

Implemented:

- Walt Disney World DVC resort catalog for Pixie v1.
- Canonical Pixie resort identifiers and identifier resolution.
- Non-WDW and unsupported WDW resort exclusion handling.
- Room-type normalization and room-capacity checks from calculator metadata.
- Hard resort eligibility filtering.
- Explainable deterministic scoring with centralized weights.
- Budget compatibility rules for accommodation-only, nightly, total-trip, and unknown budgets.
- DVC point-estimation adapter over the existing calculator package.
- Guest accommodation estimate adapter over existing calculator pricing policy.
- Typed recommendation result including reason codes, tradeoffs, warnings, data quality, scoring version, catalog version, and calculator/pricing status.
- Resort recommendation reference documentation.

Not implemented in this phase:

- Ready Stay matching.
- AI orchestration or model-provider calls.
- Chat route.
- `/pixie` frontend.
- Database persistence.
- Database migrations.
- Booking conversion.
- Voice or avatar.

### 2026-07-11: Phase 2.5 pricing and resort-identity reconciliation completed

Implemented:

- Audited calculator source, package export, dist output, tests, Next aliases, Docker build path, and Cloud Run runtime expectations.
- Rebuilt and synchronized calculator generated output with source Access-tier pricing.
- Fixed a calculator declaration-build type mismatch in `quoteStay`.
- Unignored generated calculator package entry files so source/package output can be versioned together.
- Added calculator package tests comparing source and generated output rates/categories.
- Added Pixie production import-path tests for `pixiedvc-calculator`.
- Added explicit Pixie pricing contexts: `custom_request_estimate` and `ready_stay_listing_price`.
- Added a Ready Stay listing-price contract without implementing Ready Stay matching.
- Hardened Pixie pricing to reject stale legacy categories.
- Hardened resort identifier errors and AKV/Kidani/Jambo handling.
- Documented pricing authority and resort identifier matrix.

Not implemented in this phase:

- Ready Stay matching.
- AI orchestration or model-provider calls.
- Chat route.
- `/pixie` frontend.
- Database persistence.
- Database migrations.
- Booking conversion or checkout changes.
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
- Pixie v1 resort recommendations use a dedicated WDW DVC allowlist backed by existing calculator metadata and canonical slug helpers.
- The canonical Pixie resort identifier is a stable lowercase calculator-code-like ID such as `akv`, `blt`, or `rva`.
- Booking-form handoff uses the canonical resort slug as the Phase 2 `bookingValue`; booking conversion may refine the final contract later.
- `public.resorts` remains the runtime booking/catalog database authority, but Phase 2 recommendation code does not require Supabase reads or database resort IDs.
- Fort Wilderness Cabins are unsupported until calculator resort metadata includes category, room-type, and occupancy support.
- Non-WDW DVC properties are hard excluded from Pixie v1.
- Room capacity is trusted only when present in calculator metadata.
- Point estimates reject unsupported years before calculator fallback behavior can hide missing charts.
- Guest accommodation estimates use the installed calculator package pricing policy and are labelled as estimates.
- Ready Stay owner payout and Ready Stay fee logic are not used for custom Pixie guest accommodation estimates.
- Custom request guest estimates now use Access-tier calculator pricing: Premier Access, Priority Access, Select Access, and Value Access.
- Legacy calculator categories `PREMIUM`, `REGULAR`, and `ADVANTAGE` are treated as stale and unsupported by Pixie pricing.
- Pixie price results include `pricingContext`, `source`, `sourceVersion`, and `estimateStatus`.
- Ready Stay listing prices are listing-specific and separate from custom-request estimates.
- Owner payout and founding-owner bonus rates must never be exposed as guest pricing.
- Calculator source and package generated output must stay synchronized through tests.
- Animal Kingdom Villas canonical Pixie identity is `akv` / `animal-kingdom-villas` / `AKV`.
- Kidani and Jambo are AKV sub-property/building preferences; bare `kidani`, `jambo`, and historical `KV` fail closed as ambiguous.

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

Phase 2 resort recommendation foundation:

- `docs/pixie-resort-recommendations.md`
- `src/lib/pixie/resorts/catalog.ts`
- `src/lib/pixie/resorts/eligibility.ts`
- `src/lib/pixie/resorts/explanations.ts`
- `src/lib/pixie/resorts/identifiers.ts`
- `src/lib/pixie/resorts/index.ts`
- `src/lib/pixie/resorts/recommendation-service.ts`
- `src/lib/pixie/resorts/room-types.ts`
- `src/lib/pixie/resorts/scoring.ts`
- `src/lib/pixie/resorts/types.ts`
- `src/lib/pixie/pricing/guest-price-adapter.ts`
- `src/lib/pixie/pricing/index.ts`
- `src/lib/pixie/pricing/points-adapter.ts`
- `src/lib/pixie/pricing/types.ts`
- `src/lib/pixie/tests/guest-price-adapter.test.ts`
- `src/lib/pixie/tests/points-adapter.test.ts`
- `src/lib/pixie/tests/recommendation-service.test.ts`
- `src/lib/pixie/tests/resort-catalog.test.ts`
- `src/lib/pixie/tests/resort-eligibility.test.ts`
- `src/lib/pixie/tests/resort-identifiers.test.ts`
- `src/lib/pixie/tests/resort-scoring.test.ts`
- `src/lib/pixie/tests/room-types.test.ts`

Phase 2.5 pricing and identity reconciliation:

- `docs/pixie-pricing-authority.md`
- `docs/pixie-resort-identifier-matrix.md`
- `packages/pixiedvc-calculator/dist/index.d.ts`
- `packages/pixiedvc-calculator/dist/index.js`
- `packages/pixiedvc-calculator/dist/index.js.map`
- `packages/pixiedvc-calculator/test/pricing-contract.test.ts`
- `src/lib/pixie/tests/pricing-authority.test.ts`

## Files Modified

Documentation reference:

- `README.md`

Phase 1 documentation updates:

- `docs/pixie-development-bible.md`
- `docs/pixie-progress-log.md`

Phase 2 documentation updates:

- `docs/pixie-development-bible.md`
- `docs/pixie-progress-log.md`

Phase 2.5 updates:

- `docs/pixie-development-bible.md`
- `docs/pixie-progress-log.md`
- `docs/pixie-resort-recommendations.md`
- `packages/pixiedvc-calculator/.gitignore`
- `packages/pixiedvc-calculator/src/engine/calc.ts`
- `src/lib/pixie/pricing/guest-price-adapter.ts`
- `src/lib/pixie/pricing/types.ts`
- `src/lib/pixie/resorts/catalog.ts`
- `src/lib/pixie/resorts/identifiers.ts`
- `src/lib/pixie/resorts/recommendation-service.ts`
- `src/lib/pixie/resorts/scoring.ts`
- `src/lib/pixie/resorts/types.ts`
- `src/lib/pixie/tests/guest-price-adapter.test.ts`
- `src/lib/pixie/tests/points-adapter.test.ts`
- `src/lib/pixie/tests/resort-identifiers.test.ts`
- `src/lib/pixie/tests/resort-scoring.test.ts`

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

### 2026-07-10 Phase 2 Validation

- `pnpm exec vitest run src/lib/pixie/tests`: passed. 12 test files, 118 tests.
- `pnpm exec tsc --noEmit --pretty false`: failed on existing repository type issues. The final run did not report `src/lib/pixie` errors. Existing examples include generated Next route-handler type mismatches, Supabase relation array/object typing, missing Vitest globals in older tests, contract snapshot typing, package React type mismatches, and calculator package strictness issues.
- `pnpm run lint`: failed on existing repository lint issues. No `src/lib/pixie` lint errors were visible in the final run. Existing examples include calculator `any` usage, CommonJS script imports, `TestimonialsSection` hook-order violations, unescaped entities, owner/dashboard `any` usage, and image/useEffect warnings.
- `pnpm run build`: first sandboxed run failed with Turbopack `Operation not permitted` while creating a process/binding an internal port. Escalated rerun succeeded. Next emitted existing `themeColor` metadata warnings and skipped lint/type validation.

### 2026-07-11 Phase 2.5 Validation

- `pnpm --dir packages/pixiedvc-calculator run build`: passed after a minimal type fix in `src/engine/calc.ts`. Warning: duplicate root `baseUrl`.
- `pnpm exec vitest run src/lib/pixie/tests`: passed. 13 test files, 126 tests.
- `pnpm --dir packages/pixiedvc-calculator exec vitest run`: passed. 2 test files, 13 tests.
- `pnpm run lint`: failed on existing repository lint issues. No `src/lib/pixie` errors were reported. The modified calculator engine errors were removed; remaining calculator lint errors are in the pre-existing calculator UI.
- `pnpm exec tsc --noEmit --pretty false`: failed on existing repository type issues. No `src/lib/pixie` errors were visible in the final run.
- `pnpm run build`: passed when run outside the sandbox. Next emitted existing metadata `themeColor` warnings and skipped lint/type validation.

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
- Calculator source and package generated output were reconciled in Phase 2.5. Future drift is covered by tests, but package output must be regenerated when calculator source pricing changes.
- Fort Wilderness Cabins have chart/fallback traces but no calculator resort metadata, so Pixie excludes them.
- A migration references Kidani as calculator code `KV`, while the calculator package uses `AKV` for Animal Kingdom Villas. Pixie Phase 2.5 treats `KV` as ambiguous and uses `AKV` only for umbrella Animal Kingdom Villas.
- Cross-year point estimates can fail when chart data is missing; the adapter surfaces unsupported calculator errors rather than estimating. The previously observed BLT 2026/2027 gap no longer reproduces after calculator output synchronization.

## Future Work

Future phases:

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
- Should Fort Wilderness Cabins be added after calculator metadata is completed?
- What final room/view mapping should booking conversion use when Pixie moves from recommendation to booking draft?
- Should Pixie hide or alter the global support widget on `/pixie`?
- What retention policy should apply to saved Pixie conversations and plans?
- Should users be able to delete saved Pixie trips from v1?
- Which Pixie analytics events are required for launch?

## Next Approved Task

Phase 3: Deterministic Ready Stay matching foundation.

The next implementation task should build trusted, non-AI Ready Stay matching against the existing Ready Stay visibility, pricing, capacity, and booking handoff systems. It must reuse existing Ready Stay logic, avoid checkout or lock changes, avoid AI calls, avoid frontend UI, avoid persistence changes, and recheck Ready Stay availability at action time in later phases.

Before starting any future Pixie task, Codex must read:

1. `docs/pixie-development-bible.md`
2. `docs/pixie-progress-log.md`
3. `docs/pixie-planner-state.md`
4. `docs/pixie-resort-recommendations.md` when the phase touches resorts, rooms, points, pricing, recommendations, or Ready Stay matching
5. Existing repository files relevant to the requested phase
