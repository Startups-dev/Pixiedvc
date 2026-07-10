# Pixie Planner State

This document summarizes the Phase 1 Pixie planner-state foundation. The permanent architecture rules remain in `docs/pixie-development-bible.md`.

## State Shape

`PixieTripState` is defined in `src/lib/pixie/schema.ts`.

Top-level sections:

- `schemaVersion`
- `destination`
- `planningStage`
- `tripName`
- `dates`
- `party`
- `budget`
- `preferences`
- `accessibility`
- `generated`
- `selectedOptions`
- `metadata`

An empty draft is valid. The state is progressively completed as Pixie learns more.

## Date Rules

Dates use `YYYY-MM-DD` date-only strings. Night calculations use UTC day math to avoid timezone shifts.

Rules:

- Partial dates are valid.
- Departure must be after arrival once both are present.
- Maximum trip duration is 30 nights.
- `numberOfNights` is derived by trusted code and cannot be patched directly.

## Party Rules

The party state supports aggregate counts and individual travellers. Travellers use stable local IDs so later patches can update one traveller safely.

Aggregate counts are reconciled with individual travellers during normalization. The derived fields are:

- `totalPartySize`
- `adultCount`
- `childCount`
- `ageGroupSummary`

The maximum party size and maximum traveller count are both 12.

## Budget Rules

Budget preferences use integer cents in `amountCents`. This avoids floating-point money handling. Budget is a planning preference only and is not authoritative pricing.

Supported currencies:

- `USD`
- `CAD`

## Patch Contract

`PixieTripPatch` is strict and rejects unknown fields.

Allowed patch sections:

- `destination`
- `tripName`
- `dates`
- `party`
- `budget`
- `preferences`
- `accessibility`
- `selectedOptions`
- `metadata`

Generated trusted sections cannot be patched. `schemaVersion` cannot be patched.

Traveller updates use explicit operations:

- `addTraveller`
- `updateTraveller`
- `removeTraveller`

`applyPixieTripPatch` validates current state, validates the patch, applies allowed fields, normalizes, recomputes derived fields, updates `metadata.updatedAt`, and returns a typed success/error result.

## Completeness

`evaluatePixieCompleteness` returns:

- `score`
- `planningStage`
- `missingRequired`
- `missingRecommended`
- `warnings`
- readiness flags
- `suggestedNextQuestionKey`

Question keys are stable identifiers such as `ask_dates`, `ask_party`, and `ask_trip_priorities`. Future AI/prompt layers will turn these keys into conversational wording.

Readiness gates:

- Resort recommendations: usable dates, party size, and basic priorities.
- Point estimates: exact dates, party size, candidate resort, and room type.
- Ready Stay matching: usable dates and party size.
- Itinerary: dates or trip length, park-day intent, and pace.
- Booking draft: exact dates, party composition, resort, and room type. Authentication and booking-form guest details are still required later.

## Local Drafts

Local draft helpers live in `src/lib/pixie/local-draft.ts`.

Storage key:

```text
pixiedvc:pixie:draft:v1
```

Current draft version: `1`

The local draft stores structured planner state and a capped recent-message summary only. It does not store audio, prompts, provider responses, payment data, auth tokens, service-role data, or full booking data.

## Phase 1 Limits

- Maximum trip duration: 30 nights.
- Maximum flexible-date window: 30 days before and 30 days after.
- Maximum party size: 12.
- Maximum individual travellers: 12.
- Maximum note length: 1,000 characters.
- Maximum short text length: 160 characters.
- Maximum preference-array entries per group: 12.
- Maximum traveller interests: 8.
- Maximum local draft size: 64 KB.
- Maximum recent draft message summaries: 6.
- Maximum recent draft message length: 500 characters.

These limits are intentionally product-scale rather than theoretical extremes. They keep anonymous local drafts small, prevent runaway payloads, and still cover normal family and multi-room planning conversations.

## Implementation Notes

- `normalizePixieTripState` accepts unknown input and validates through Zod before returning a typed state.
- Blank preference/interests entries are accepted at the schema boundary and removed during normalization.
- Unknown fields are rejected by strict schemas rather than silently preserved.
- `booking_ready` is not booking submission readiness. It only means the planner has enough exact trip information to prepare a booking draft later.
