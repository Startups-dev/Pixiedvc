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

Current work is documentation-only foundation work.

## Current Phase

Phase 0: Engineering foundation documentation.

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

No functional Pixie code should exist before Phase 1 starts.

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

## Files Added

Documentation foundation:

- `docs/pixie-development-bible.md`
- `docs/pixie-progress-log.md`

## Files Modified

Documentation reference:

- `README.md`

## Database Migrations

None.

No Pixie migrations have been created.

No remote migrations have been applied.

## Tests

No Pixie tests exist yet.

Required validation for this documentation-only task:

- `pnpm run lint`
- Typecheck command available in this repository, or `pnpm exec tsc --noEmit` if no script exists.
- `pnpm run build`

Record results below after validation is run.

### 2026-07-10 Validation

- `pnpm run lint`: failed on pre-existing repository lint issues unrelated to Pixie documentation. Examples include `@typescript-eslint/no-explicit-any` in calculator/admin/owner files, CommonJS `require()` warnings in scripts, React hook rule violations in `src/components/TestimonialsSection.tsx`, and existing image/lint warnings.
- `pnpm exec tsc --noEmit`: failed on pre-existing repository type errors unrelated to Pixie documentation. Examples include Next 15 route handler type mismatches, Supabase relationship typing mismatches, missing Vitest globals in test files, React type mismatches in workspace packages, and contract snapshot typing issues.
- `pnpm run build`: first sandboxed run failed with a Turbopack process/port permission error while processing `src/app/owner/rentals/[rentalId]/rental-header.module.css`.
- `pnpm run build`: rerun outside the sandbox succeeded. Next reported many existing `themeColor` metadata warnings and noted that production build skips type validation and linting.

## Known Issues

- The repository has an OpenAI helper at `src/lib/ai/openai.ts`, but the main support chat route currently uses Gemini.
- Support KB schema supports vector embeddings, but `scripts/support-index.js` currently upserts documents without generating embeddings.
- Existing canonical resort helpers include non-Walt Disney World resorts; Pixie v1 must filter to WDW only.
- Booking creation logic currently lives in `/api/booking/create`; Pixie booking conversion should extract or share that logic instead of duplicating it.
- Ready Stay recommendation results can become stale and must be rechecked at action time.
- Cost estimate policy for custom booking requests needs a confirmed source of truth beyond points calculation.

## Future Work

Future phases:

- Define `PixiePlannerState`, `PixieTripPatch`, and validation schemas.
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
- What is the exact WDW DVC resort allowlist for v1?
- What guest price estimate policy should custom Pixie plans use?
- Should Pixie hide or alter the global support widget on `/pixie`?
- What retention policy should apply to saved Pixie conversations and plans?
- Should users be able to delete saved Pixie trips from v1?
- Which Pixie analytics events are required for launch?

## Next Approved Task

Phase 1: Planner schemas.

The next implementation task should create typed Pixie planner schemas and validation helpers only. It should not add AI calls, frontend UI, database persistence, voice, avatar, Ready Stay checkout changes, or booking request creation.

Before starting Phase 1, Codex must read:

1. `docs/pixie-development-bible.md`
2. `docs/pixie-progress-log.md`
3. Existing repository files relevant to planner schema design
