# Pixie Progress Log

This is the living engineering journal for Pixie implementation. Update it after every Pixie phase or meaningful architecture change.

Permanent rules live in `docs/pixie-development-bible.md`. This file tracks status, history, files touched, validation, and the next approved task.

## Project Status

Pixie is implemented through the anonymous text prototype, Phase 6 validation, and the concierge-personality refinement. It is not yet launched as a production public feature.

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

Phase 3 deterministic Ready Stay matching foundation is complete. Pixie now has a read-only public-visible Ready Stay adapter, exact/flexible/near/partial date matching, capacity-safe filtering, listing-specific price handling, AKV sub-property handling, deterministic scoring, grouped match output, stale-inventory warnings, and tests.

Phase 4 server-side AI orchestration foundation is complete. Pixie now has a lightweight provider abstraction, fetch-based OpenAI provider, strict structured model output, safe patch extraction, approved tool registry/executor, orchestration flow, streaming-ready event contract, rate-limit contract, usage metadata, safety limits, and tests.

Phase 4.5 OpenAI provider verification is complete. Pixie now requires `PIXIE_MODEL`, uses the verified sample identifier `gpt-5.6-sol`, maps OpenAI configuration/auth/model/rate-limit failures to typed errors, includes mocked provider regression coverage, and has a skipped-by-default live smoke test.

Phase 5 text experience foundation is complete. Pixie now has the first `/pixie` mobile-first text planning workspace, a secure non-persistent `/api/pixie/chat` route, local browser draft restore/reset, trusted resort and Ready Stay result rendering, safe analytics events, and feature-flagged public exposure.

The concierge-personality phase is complete. Pixie now has a versioned concierge prompt, strict conversation-mode metadata, plain-text response normalization, trusted recommendation introductions, contextual quick replies, and documentation for the desired interview strategy.

Pixie still has no authenticated persistence, migrations, booking conversion, Ready Stay locking, payment, email, voice, avatar, or deployment.

## Current Phase

Concierge-personality and interview-strategy refinement after Phase 6 prototype validation.

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

Phase 1, Phase 2, Phase 2.5, Phase 3, Phase 4, Phase 4.5, Phase 5, Phase 6 validation, and the concierge-personality refinement are complete. The next approved implementation phase is recommendation storytelling refinement or authenticated persistence, depending on product priority.

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

### 2026-07-11: Phase 3 deterministic Ready Stay matching foundation completed

Implemented:

- Public-visible Ready Stay read adapter using existing `isPublicReadyStayRow` behavior.
- Pixie-facing Ready Stay listing normalization with minimum presentation/matching fields only.
- Exact-date, flexible-date, near-date, and partial-overlap classification.
- Capacity-safe filtering using listing `sleeps`.
- Resort, room, AKV Kidani/Jambo sub-property, and preference matching.
- Listing-specific Ready Stay price handling through the `ready_stay_listing_price` context.
- Budget fit for accommodation-only and nightly budgets.
- Deterministic bounded scoring and stable tie-breaking.
- Grouped match output for exact, flexible, and alternative matches.
- Stale-inventory/recheck-required warnings on every match.
- Ready Stay matching reference documentation.

Not implemented in this phase:

- Ready Stay locking or checkout changes.
- Booking requests or booking conversion.
- AI orchestration or model-provider calls.
- Chat route.
- `/pixie` frontend.
- Database persistence.
- Database migrations.
- Voice or avatar.

### 2026-07-11: Phase 4 AI orchestration foundation completed

Implemented:

- Lightweight Pixie model-provider interface.
- Fetch-based OpenAI Responses API provider with strict structured JSON output.
- Versioned Pixie system prompt.
- Strict `PixieModelTurnResult` validation.
- Safe model-proposed `PixieTripPatch` handling through `applyPixieTripPatch`.
- Approved tool allowlist and registry-backed executor.
- Deterministic tools for planner status, in-memory patching, resort recommendations, Ready Stay matching, and non-authoritative plan outlines.
- High-level non-persistent orchestration service.
- Streaming-ready event contract.
- Response-builder safeguards for Ready Stay availability language and recheck warnings.
- Safety limits for message size, recent messages, planner-state size, model output size, timeouts, tool calls, and tool rounds.
- Provider-independent rate-limit contract with in-memory development/test implementation.
- Usage metadata aggregation for tokens, model, prompt version, tool rounds, tool calls, and duration.
- AI orchestration reference documentation.

Not implemented in this phase:

- Public chat API route.
- `/pixie` frontend.
- Database persistence.
- Database migrations.
- Booking conversion.
- Ready Stay locking or checkout changes.
- Payment, email, voice, or avatar.

### 2026-07-12: Phase 4.5 OpenAI provider verification completed

Implemented:

- Verified the initial OpenAI provider remains fetch-based because the repository does not install the `openai` npm SDK.
- Verified Pixie uses `POST https://api.openai.com/v1/responses`.
- Updated sample Pixie model configuration from `gpt-5.6` to the verified accessible identifier `gpt-5.6-sol`.
- Made `PIXIE_MODEL` mandatory; missing model configuration now returns a typed `configuration_error`.
- Hardened provider failure handling for missing API key, inaccessible model, authentication failure, rate limiting, timeout, provider failure, and malformed structured output.
- Confirmed the provider does not silently fall back to another model.
- Added mocked provider regression tests for exact configured model usage, no fallback, sanitized failures, rate-limit retry metadata, malformed output, token usage extraction, and secret redaction.
- Added a skipped-by-default live provider smoke test using synthetic trip data.

Not implemented in this phase:

- Public chat API route.
- `/pixie` frontend.
- Database persistence.
- Database migrations.
- Booking conversion.
- Ready Stay locking or checkout changes.
- Payment, email, voice, or avatar.

### 2026-07-12: Phase 5 text experience foundation completed

Implemented:

- `/pixie` route with metadata, loading state, error boundary, and feature-flag-aware client shell.
- Mobile-first Pixie planning workspace with chat-first layout, desktop plan panel, and mobile plan drawer.
- Text composer with Enter-to-send, Shift+Enter newline behavior, cancellation affordance, character limit, and accessible label.
- Initial Pixie welcome message, AI disclosure, Walt Disney World scope, and starter quick replies.
- `/api/pixie/chat` route that validates request JSON, planner state, message limits, recent-message limits, feature flag, model configuration, request size, and rate limits before streaming Phase 4 orchestrator events.
- NDJSON streaming contract for route responses with `Cache-Control: no-store`.
- Feature flag `PIXIE_PUBLIC_ENABLED` with production-disabled default when unset.
- In-memory per-IP and per-draft rate limiting using the Phase 4 contract, documented as local/staging only.
- Browser-only client state helpers for chat messages, streaming events, trusted recommendations, Ready Stay matches, plan outline, warnings, and errors.
- Browser draft wrapper using the Phase 1 local-draft storage key `pixiedvc:pixie:draft:v1`.
- Corrupted-draft recovery and reset that clears only Pixie draft storage.
- Resort recommendation cards that render trusted Phase 2 results, estimate disclosures, pricing unavailable states, capacity confidence, and tradeoffs.
- Ready Stay cards that render trusted Phase 3 matches, exact/flexible/alternative distinctions, listing-specific prices, partial-overlap labels, and recheck warnings.
- Plan outline, trip progress, traveller summary, trip summary, warnings, future-facing save prompt, and reset dialog components.
- Safe client analytics wrappers for Phase 5 funnel events without full messages, raw trip state, provider output, secrets, or accessibility notes.
- Phase 5 reference documentation.
- Phase 5 route, client state, draft storage, and UI contract tests.

Not implemented in this phase:

- Authenticated Pixie persistence.
- Database migrations.
- Booking request conversion.
- Ready Stay locking, checkout, payment, agreements, or booking-record changes.
- Email.
- Voice or animated avatar.
- Deployment.

### 2026-07-15: Concierge personality and interview strategy completed

Implemented:

- Versioned Pixie prompt updated from `2026-07-11.phase4` to `2026-07-15.concierge-personality`.
- Concierge personality guidance for warm, calm, premium, concise, honest and proactive responses.
- Preferred turn structure: acknowledge, connect, guide, ask one useful question.
- Conversation-mode metadata: discovery, clarification, recommendation, refinement, general guidance, return to plan, celebration, and decision support.
- Active-decision and delight-moment metadata for response presentation.
- Prompt rules for side questions, “you decide” requests, restrained delight, recommendation introductions, and plain-text responses.
- Response-builder normalization for raw Markdown markers in the current plain-text renderer.
- Response-builder guard against repeated mechanical questions for dates, party, or budget when completeness already knows the answer.
- Compact deterministic resort recommendation introductions using trusted Phase 2 tool output.
- Contextual quick replies for budget, pace, resort recommendations, and “you decide” paths.
- Concierge personality reference documentation.
- Mocked tests for prompt content, strict structured metadata, provider schema alignment, response builder behavior, and contextual quick replies.
- Live synthetic testing with `PIXIE_MODEL=gpt-5.6-sol` confirmed that the first family-trip message can extract trip details, produce recommendations, and keep responses concise when the local timeout is raised to 60 seconds.
- Live synthetic testing also found and fixed two conversation-quality issues: repeated resort introductions during unrelated turns and unsupported specific restaurant naming during dining “you decide” guidance.

Not implemented in this phase:

- New Disney knowledge sources.
- Restaurant database.
- Deterministic pricing, points, capacity, recommendation, or Ready Stay business-logic changes.
- Persistence.
- Booking actions.
- Voice or avatar.
- Deployment.

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
- Pixie Ready Stay matching uses `isPublicReadyStayRow`, not admin-or-public visibility.
- Ready Stay matches are advisory and must carry `recheck_required_before_booking`.
- Ready Stay capacity comes from listing `sleeps`; missing capacity fails closed.
- Ready Stay listing prices are preserved as listing-specific prices and are never custom-request estimates.
- Ready Stay partial overlaps are alternatives only, not complete stay matches.
- AKV Kidani/Jambo listing distinctions remain `subProperty` metadata under Pixie resort ID `akv`.
- Pixie AI uses a provider abstraction and does not depend directly on provider response objects.
- The initial Pixie OpenAI provider is fetch-based because no `openai` SDK package is currently installed.
- Pixie AI prompt version is `2026-07-15.concierge-personality`.
- Pixie model output may include strict concierge metadata: `conversationMode`, `activeDecisionKey`, and `delightMomentKey`; these guide presentation only and do not authorize trusted facts.
- Pixie AI tool allowlist is `get_planner_status`, `apply_trip_patch`, `recommend_resorts`, `find_ready_stays`, and `generate_plan_outline`.
- Pixie AI tools are deterministic server-side functions; the model cannot execute arbitrary function names or business logic.
- Pixie AI has no Supabase write, booking, payment, email, owner, or hidden-inventory tools.
- Phase 4 memory rate limiting is not production-distributed and must be replaced or backed by a distributed store before launch.
- Phase 5 exposes `/api/pixie/chat` as an NDJSON streaming route over the Phase 4 event contract.
- Phase 5 keeps anonymous Pixie draft persistence browser-local and stores only structured planner state plus capped recent-message summaries.
- Phase 5 uses `PIXIE_PUBLIC_ENABLED`; when unset, Pixie is enabled outside production and disabled in production.
- Phase 5 remains non-persistent and performs no Supabase writes.
- Phase 5 Ready Stay actions deep-link to existing public Ready Stay routes and do not create locks or checkout state.

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

Phase 3 Ready Stay matching foundation:

- `docs/pixie-ready-stay-matching.md`
- `src/lib/pixie/ready-stays/budget-fit.ts`
- `src/lib/pixie/ready-stays/capacity.ts`
- `src/lib/pixie/ready-stays/date-matching.ts`
- `src/lib/pixie/ready-stays/explanations.ts`
- `src/lib/pixie/ready-stays/index.ts`
- `src/lib/pixie/ready-stays/listing-adapter.ts`
- `src/lib/pixie/ready-stays/matching-service.ts`
- `src/lib/pixie/ready-stays/scoring.ts`
- `src/lib/pixie/ready-stays/types.ts`
- `src/lib/pixie/ready-stays/visibility-adapter.ts`
- `src/lib/pixie/tests/ready-stay-budget-fit.test.ts`
- `src/lib/pixie/tests/ready-stay-capacity.test.ts`
- `src/lib/pixie/tests/ready-stay-date-matching.test.ts`
- `src/lib/pixie/tests/ready-stay-listing-adapter.test.ts`
- `src/lib/pixie/tests/ready-stay-matching-service.test.ts`
- `src/lib/pixie/tests/ready-stay-scoring.test.ts`
- `src/lib/pixie/tests/ready-stay-test-helpers.ts`

Phase 4 AI orchestration foundation:

- `docs/pixie-ai-orchestration.md`
- `src/lib/pixie/ai/errors.ts`
- `src/lib/pixie/ai/index.ts`
- `src/lib/pixie/ai/openai-provider.ts`
- `src/lib/pixie/ai/orchestrator.ts`
- `src/lib/pixie/ai/prompts.ts`
- `src/lib/pixie/ai/provider.ts`
- `src/lib/pixie/ai/rate-limit.ts`
- `src/lib/pixie/ai/response-builder.ts`
- `src/lib/pixie/ai/safety.ts`
- `src/lib/pixie/ai/schemas.ts`
- `src/lib/pixie/ai/tool-contract.ts`
- `src/lib/pixie/ai/tool-executor.ts`
- `src/lib/pixie/ai/tool-registry.ts`
- `src/lib/pixie/ai/usage.ts`
- `src/lib/pixie/tools/find-ready-stays.ts`
- `src/lib/pixie/tools/generate-plan-outline.ts`
- `src/lib/pixie/tools/get-planner-status.ts`
- `src/lib/pixie/tools/index.ts`
- `src/lib/pixie/tools/recommend-resorts.ts`
- `src/lib/pixie/tools/update-trip-state.ts`
- `src/lib/pixie/tests/ai-orchestrator.test.ts`
- `src/lib/pixie/tests/ai-provider.test.ts`
- `src/lib/pixie/tests/ai-safety.test.ts`
- `src/lib/pixie/tests/ai-structured-output.test.ts`
- `src/lib/pixie/tests/ai-tool-contract.test.ts`
- `src/lib/pixie/tests/ai-tool-executor.test.ts`
- `src/lib/pixie/tests/ai-usage.test.ts`

Phase 4.5 OpenAI provider verification:

- `src/lib/pixie/tests/ai-provider-live-smoke.test.ts`

Phase 5 text experience:

- `docs/pixie-text-experience.md`
- `src/app/api/pixie/chat/route.ts`
- `src/app/pixie/PixieClient.tsx`
- `src/app/pixie/error.tsx`
- `src/app/pixie/loading.tsx`
- `src/app/pixie/page.tsx`
- `src/components/pixie/PixieChat.tsx`
- `src/components/pixie/PixieComposer.tsx`
- `src/components/pixie/PixieDesktopPlanPanel.tsx`
- `src/components/pixie/PixieHeader.tsx`
- `src/components/pixie/PixieMessage.tsx`
- `src/components/pixie/PixieMessageList.tsx`
- `src/components/pixie/PixieMobilePlanDrawer.tsx`
- `src/components/pixie/PixiePlanOutline.tsx`
- `src/components/pixie/PixiePlanPanel.tsx`
- `src/components/pixie/PixiePortrait.tsx`
- `src/components/pixie/PixieProgress.tsx`
- `src/components/pixie/PixieQuickReplies.tsx`
- `src/components/pixie/PixieReadyStayCard.tsx`
- `src/components/pixie/PixieReadyStayMatches.tsx`
- `src/components/pixie/PixieResetDialog.tsx`
- `src/components/pixie/PixieResortRecommendationCard.tsx`
- `src/components/pixie/PixieResortRecommendations.tsx`
- `src/components/pixie/PixieSavePrompt.tsx`
- `src/components/pixie/PixieShell.tsx`
- `src/components/pixie/PixieThinkingState.tsx`
- `src/components/pixie/PixieTravellerSummary.tsx`
- `src/components/pixie/PixieTripSummary.tsx`
- `src/components/pixie/PixieWarnings.tsx`
- `src/lib/pixie/client/analytics.ts`
- `src/lib/pixie/client/api.ts`
- `src/lib/pixie/client/chat-state.ts`
- `src/lib/pixie/client/draft-storage.ts`
- `src/lib/pixie/client/types.ts`
- `src/lib/pixie/tests/pixie-chat-route.test.ts`
- `src/lib/pixie/tests/pixie-client-state.test.ts`
- `src/lib/pixie/tests/pixie-draft-storage.test.ts`
- `src/lib/pixie/tests/pixie-ui-contract.test.tsx`

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

Phase 3 updates:

- `docs/pixie-development-bible.md`
- `docs/pixie-progress-log.md`

Phase 4 updates:

- `docs/pixie-development-bible.md`
- `docs/pixie-progress-log.md`
- `env-production.example.yaml`
- `env-staging.example.yaml`

Phase 4.5 updates:

- `docs/pixie-ai-orchestration.md`
- `docs/pixie-progress-log.md`
- `env-production.example.yaml`
- `env-staging.example.yaml`
- `src/lib/pixie/ai/errors.ts`
- `src/lib/pixie/ai/openai-provider.ts`
- `src/lib/pixie/ai/safety.ts`
- `src/lib/pixie/ai/schemas.ts`
- `src/lib/pixie/tests/ai-orchestrator.test.ts`
- `src/lib/pixie/tests/ai-provider.test.ts`

Phase 5 updates:

- `docs/pixie-progress-log.md`
- `env-production.example.yaml`
- `env-staging.example.yaml`

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

### 2026-07-11 Phase 3 Validation

- `pnpm exec vitest run src/lib/pixie/tests`: passed. 19 test files, 161 tests.
- `pnpm exec vitest run src/lib/ready-stays`: passed. 4 test files, 10 tests.
- `pnpm exec eslint src/lib/pixie`: passed.
- `pnpm run lint`: failed on existing repository lint issues outside the new Pixie Ready Stay matching files. No `src/lib/pixie` lint errors were reported by the targeted Pixie lint run.
- `pnpm exec tsc --noEmit --pretty false`: failed on existing repository type issues. After fixing the Phase 3 pricing-context narrowing, no `src/lib/pixie` type errors were visible in the final run.
- `pnpm run build`: passed when run outside the sandbox. Next emitted existing metadata `themeColor` warnings and skipped lint/type validation.
- `git diff --check`: passed.

### 2026-07-11 Phase 4 Validation

- `pnpm exec vitest run src/lib/pixie/tests`: passed. 26 test files, 186 tests.
- `pnpm exec vitest run src/lib/pixie/tests src/lib/ready-stays`: passed. 30 test files, 196 tests.
- `pnpm --dir packages/pixiedvc-calculator exec vitest run`: passed. 2 test files, 13 tests.
- `pnpm exec eslint src/lib/pixie`: passed.
- `pnpm run lint`: failed on existing repository lint issues outside the new Pixie AI files. No `src/lib/pixie` lint errors were reported by the targeted Pixie lint run.
- `pnpm exec tsc --noEmit --pretty false`: failed on existing repository type issues. After fixing Phase 4 typing, no `src/lib/pixie` type errors were visible in the final run.
- `pnpm run build`: passed when run outside the sandbox. Next emitted existing metadata `themeColor` warnings and skipped lint/type validation.
- `git diff --check`: passed.

### 2026-07-12 Phase 4.5 Validation

- Official model-list verification: passed. The configured account returned `gpt-5.6-sol` as accessible via `/v1/models`.
- Live Pixie provider smoke test: passed with `PIXIE_MODEL=gpt-5.6-sol` and synthetic trip data. The test used `POST https://api.openai.com/v1/responses` and strict `text.format` JSON-schema output.
- `pnpm exec vitest run src/lib/pixie/tests/ai-provider.test.ts src/lib/pixie/tests/ai-structured-output.test.ts src/lib/pixie/tests/ai-orchestrator.test.ts`: passed. 3 test files, 19 tests.
- `pnpm exec vitest run src/lib/pixie/tests`: passed. 26 test files passed, 1 live smoke file skipped, 194 tests passed, 1 skipped.
- `pnpm exec eslint src/lib/pixie`: passed.
- `pnpm exec tsc --noEmit --pretty false`: failed on existing repository type issues. After fixing the Phase 4.5 Pixie test env casts, no `src/lib/pixie` errors were visible in the final run.
- `pnpm run build`: first sandboxed run failed with the known Turbopack process/port permission error while processing `src/app/owner/rentals/[rentalId]/rental-header.module.css`.
- `pnpm run build`: rerun outside the sandbox passed. Next emitted existing `themeColor` metadata warnings and skipped lint/type validation.
- `git diff --check`: passed.

### 2026-07-12 Phase 5 Validation

- `pnpm exec vitest run src/lib/pixie/tests/pixie-chat-route.test.ts src/lib/pixie/tests/pixie-client-state.test.ts src/lib/pixie/tests/pixie-draft-storage.test.ts src/lib/pixie/tests/pixie-ui-contract.test.tsx`: passed. 4 test files, 24 tests.
- `pnpm exec vitest run src/lib/pixie/tests`: passed. 30 test files passed, 1 live smoke file skipped, 218 tests passed, 1 skipped.
- `pnpm exec vitest run src/lib/ready-stays`: passed. 4 test files, 10 tests.
- `pnpm --dir packages/pixiedvc-calculator exec vitest run`: passed. 2 test files, 13 tests.
- `pnpm exec eslint src/app/pixie src/app/api/pixie/chat src/components/pixie src/lib/pixie/client src/lib/pixie/tests/pixie-chat-route.test.ts src/lib/pixie/tests/pixie-client-state.test.ts src/lib/pixie/tests/pixie-draft-storage.test.ts src/lib/pixie/tests/pixie-ui-contract.test.tsx`: passed.
- `pnpm run lint`: failed on existing repository lint issues outside the new Pixie text experience files. The targeted Phase 5 lint run passed.
- `pnpm exec tsc --noEmit --pretty false`: failed on existing repository type issues. After correcting Phase 5 test fixtures, no new `src/lib/pixie`, `src/app/pixie`, `src/app/api/pixie`, or `src/components/pixie` type errors were visible in the final run.
- `pnpm run build`: first sandboxed run failed with the known Turbopack process/port permission error while processing `src/app/owner/rentals/[rentalId]/rental-header.module.css`.
- `pnpm run build`: rerun outside the sandbox passed. Next emitted existing metadata `themeColor` warnings and skipped lint/type validation.
- `git diff --check`: passed.

### 2026-07-13 Phase 6 Validation

- Phase 6 validated `/pixie` locally as an anonymous prototype with synthetic trip data and `PIXIE_PUBLIC_ENABLED=true`.
- Browser automation could not attach in this environment because the Node REPL browser runtime failed with `codex/sandbox-state-meta: missing field sandboxPolicy`; localhost HTTP checks and automated state/UI tests were used instead.
- Complete-family and incomplete-trip API scenarios were exercised against the local route with `PIXIE_MODEL=gpt-5.6-sol`.
- Stream turn IDs were hardened so all events in a turn share the same `turnId`.
- Client state now tracks `activeTurnId`, ignores stale events, rejects mismatched final turn IDs, and clears stale recommendations/Ready Stay matches/plan outlines when a new turn starts.
- Client NDJSON parsing now returns a safe `malformed_stream_event` error for malformed stream lines.
- Analytics dedupe was added for planning-started, turn-completed, turn-failed, recommendation-shown, Ready-Stay-shown, and profile-progressed events.
- The global support widget is hidden on `/pixie` only.
- Resort and Ready Stay cards now use user-facing fit/classification labels rather than raw scores.
- Multiple-tab behavior is documented as last-writer-wins localStorage behavior; cross-tab merge/conflict UI is not implemented.
- `pnpm exec vitest run src/lib/pixie/tests/ai-orchestrator.test.ts src/lib/pixie/tests/pixie-client-state.test.ts src/lib/pixie/tests/pixie-client-api.test.ts src/lib/pixie/tests/pixie-chat-route.test.ts src/lib/pixie/tests/pixie-ui-contract.test.tsx`: passed. 5 test files, 31 tests.
- `pnpm exec vitest run src/lib/pixie/tests`: passed. 31 test files passed, 1 live smoke file skipped, 225 tests passed, 1 skipped.
- `pnpm exec vitest run src/lib/ready-stays`: passed. 4 test files, 10 tests.
- `pnpm --dir packages/pixiedvc-calculator exec vitest run`: passed. 2 test files, 13 tests.
- `pnpm exec eslint src/app/pixie src/app/api/pixie/chat src/components/pixie src/components/support/SupportWidget.tsx src/lib/pixie/client src/lib/pixie/ai/orchestrator.ts src/lib/pixie/tests/ai-orchestrator.test.ts src/lib/pixie/tests/pixie-client-state.test.ts src/lib/pixie/tests/pixie-client-api.test.ts src/lib/pixie/tests/pixie-chat-route.test.ts src/lib/pixie/tests/pixie-ui-contract.test.tsx`: passed.
- `pnpm run lint`: failed on existing repository lint issues outside the Phase 6 files. Targeted Pixie lint passed.
- `pnpm exec tsc --noEmit --pretty false`: failed on existing repository type issues. The new Phase 6 Pixie test type errors found during the first run were fixed, and no Pixie Phase 6 errors remained visible in the final run.
- `pnpm run build`: first sandboxed run failed with the known Turbopack process/port permission error while processing `src/app/owner/matches/[matchId]/match-header.module.css`.
- `pnpm run build`: rerun outside the sandbox passed. Next emitted existing metadata `themeColor` warnings and skipped lint/type validation.
- `git diff --check`: passed.

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
- Phase 3 Ready Stay matching is advisory only; booking action rechecks are still future work and must use existing Ready Stay flow.
- Room mapping for Ready Stays can be partial when listing room text does not map to a Phase 2 normalized room type.
- The `openai` npm SDK is not installed. Pixie Phase 4 uses a fetch-based OpenAI Responses API provider and should be revisited if the project later standardizes on the official SDK package.
- Phase 4 rate limiting is a local/testing contract only; production requires a distributed limiter before public launch.
- Phase 4 does not estimate model cost because no canonical versioned provider cost table exists.
- `PIXIE_MODEL` is required. The verified sample identifier is `gpt-5.6-sol`; `gpt-5.6` was not used as a fallback.
- Phase 4.5 live smoke testing is skipped by default and requires `PIXIE_LIVE_OPENAI_SMOKE=1`, `OPENAI_API_KEY`, and `PIXIE_MODEL`.
- Phase 5 `/pixie` is feature-flagged by `PIXIE_PUBLIC_ENABLED`; production defaults to disabled when unset.
- Phase 5 rate limiting is still in-memory and not production-distributed across Cloud Run instances.
- Phase 6 hides the existing global support widget on `/pixie` only; future human-concierge escalation should be designed inside Pixie.
- Phase 5 uses progressive NDJSON event streaming, not token-by-token provider streaming.
- Phase 5 save prompt is future-facing only; no server-side Pixie trip persistence exists yet.
- Phase 6 could not complete full interactive browser validation because the in-app browser runtime failed in this environment. A real browser/mobile pass remains required before launch.
- Pixie local drafts are last-writer-wins across multiple tabs; no cross-tab merge/conflict UI exists.

## Future Work

Future phases:

- Complete an interactive browser/mobile validation pass when browser tooling is available.
- Add distributed rate limiting before public production exposure.
- Add authenticated persistence.
- Add booking request conversion.
- Add voice.
- Add avatar.
- Add admin analytics and production hardening.

## Open Questions

- Should the repository add the official `openai` npm SDK later, or keep the existing fetch-based OpenAI convention?
- What is the exact WDW DVC resort allowlist for v1, including whether Fort Wilderness cabins should be included in Phase 2 scoring?
- Should Fort Wilderness Cabins be added after calculator metadata is completed?
- What final room/view mapping should booking conversion use when Pixie moves from recommendation to booking draft?
- What human-concierge escalation should Pixie expose inside the `/pixie` experience?
- What retention policy should apply to saved Pixie conversations and plans?
- Should users be able to delete saved Pixie trips from v1?
- Which Pixie analytics events are required for launch?

## Next Approved Task

Authenticated Pixie persistence.

The next implementation task can add saved Pixie trips for authenticated users after a final interactive browser/mobile pass confirms the Phase 6 UX. It must not add booking conversion, Ready Stay locking, payment, voice, avatar, or deployment unless explicitly requested. Distributed rate limiting remains required before public multi-instance production exposure.

Before starting any future Pixie task, Codex must read:

1. `docs/pixie-development-bible.md`
2. `docs/pixie-progress-log.md`
3. `docs/pixie-planner-state.md`
4. `docs/pixie-resort-recommendations.md` when the phase touches resorts, rooms, points, pricing, recommendations, or Ready Stay matching
5. `docs/pixie-pricing-authority.md` when the phase touches prices or Ready Stays
6. `docs/pixie-resort-identifier-matrix.md` when the phase touches resorts or Ready Stays
7. `docs/pixie-ready-stay-matching.md` when the phase touches Ready Stay matching
8. `docs/pixie-ai-orchestration.md` when the phase touches AI, chat, tools, provider configuration, or streaming
9. Existing repository files relevant to the requested phase
