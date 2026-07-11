# Pixie Resort Recommendation Foundation

This document describes the deterministic Walt Disney World DVC resort recommendation foundation created for Pixie Phase 2.

Permanent product and architecture rules remain in `docs/pixie-development-bible.md`. Planner-state rules remain in `docs/pixie-planner-state.md`.

## Scope

Phase 2 creates trusted recommendation primitives only:

- Walt Disney World DVC resort catalog.
- Resort identifier adapter.
- Room-type and capacity adapter.
- Hard eligibility filtering.
- Explainable deterministic scoring.
- DVC point-estimation adapter over the existing calculator package.
- Guest accommodation estimate adapter over existing calculator pricing policy.
- Typed recommendation output.

Phase 2 does not include AI calls, AI prose, Ready Stay matching, frontend components, persistence, booking conversion, voice, avatar, or deployment.

## Canonical Resort Source

Pixie uses a narrow catalog adapter over existing repository systems:

- `pixiedvc-calculator` `Resorts` metadata for calculator code, room codes, room capacity, and pricing category.
- `src/lib/resorts/canonical.ts` for canonical slug normalization.
- `src/lib/resort-calculator.ts` and calculator chart availability for operational cross-checks.
- `src/lib/resort-image.ts` indirectly through resolver inputs for future UI image selection.

`public.resorts` remains the runtime booking/catalog database authority for existing app flows. It is not used as the Phase 2 static source because this foundation must run without persistence and because current database records can contain operational variants or historical aliases. Pixie stores no database resort ID in planner recommendations during this phase.

## WDW V1 Allowlist

Pixie v1 supports only verified Walt Disney World DVC resorts that have calculator metadata and room-capacity support.

| Pixie ID | Calculator Code | Canonical Slug | Booking Value | Display Name |
| --- | --- | --- | --- | --- |
| `akv` | `AKV` | `animal-kingdom-villas` | `animal-kingdom-villas` | Animal Kingdom Villas |
| `blt` | `BLT` | `bay-lake-tower` | `bay-lake-tower` | Bay Lake Tower at Disney's Contemporary Resort |
| `bcv` | `BCV` | `beach-club-villas` | `beach-club-villas` | Beach Club Villas |
| `bwv` | `BWV` | `boardwalk-villas` | `boardwalk-villas` | BoardWalk Villas |
| `brv` | `BRV` | `boulder-ridge-villas` | `boulder-ridge-villas` | Boulder Ridge Villas at Disney's Wilderness Lodge |
| `ccv` | `CCV` | `copper-creek-villas` | `copper-creek-villas` | Copper Creek Villas & Cabins at Disney's Wilderness Lodge |
| `okw` | `OKW` | `old-key-west` | `old-key-west` | Disney's Old Key West Resort |
| `pvb` | `PVB` | `polynesian-villas` | `polynesian-villas` | Disney's Polynesian Villas & Bungalows |
| `rva` | `RVA` | `riviera-resort` | `riviera-resort` | Disney's Riviera Resort |
| `ssr` | `SSR` | `saratoga-springs` | `saratoga-springs` | Disney's Saratoga Springs Resort & Spa |
| `vgf` | `VGF` | `grand-floridian-villas` | `grand-floridian-villas` | The Villas at Disney's Grand Floridian Resort & Spa |

The canonical Pixie resort identifier is the lowercase calculator-code-like ID. Booking-form handoff uses the canonical slug because existing booking creation can resolve slug, UUID, or calculator code.

## Excluded Resorts

Non-WDW DVC resorts are hard excluded from Pixie v1:

- `AUL` / Aulani.
- `VDH` / Villas at Disneyland Hotel.
- `VGC` / Villas at Grand Californian.
- `HHI` / Hilton Head Island.
- `VB` / Vero Beach.

Fort Wilderness Cabins (`CFW`, `fort-wilderness-cabins`) are also excluded for now. The repository has slug fallback and a 2027 point chart, but the calculator resort metadata does not currently provide `CFW` category, room types, or occupancy. Pixie must not recommend it until that source data is complete.

## Identifier Rules

The identifier adapter resolves verified IDs, slugs, aliases, and calculator codes to a Pixie catalog item.

Rules:

- Unknown identifiers fail safely.
- Non-WDW identifiers fail safely.
- Unsupported WDW identifiers fail safely.
- Ambiguous inputs are rejected.
- Display-name variations may resolve for user preference matching, but display names are not permanent identity.
- Trusted services should pass `PixieResortId` once a resort has been resolved.

## Room Types And Capacity

Room metadata is derived from the calculator package's supported room codes and occupancy values. Pixie does not guess capacity.

Normalized room IDs:

| Room ID | Calculator Codes | Capacity Source | Kitchen | Laundry |
| --- | --- | --- | --- | --- |
| `studio` | `STUDIO` | Calculator occupancy | Kitchenette | Shared |
| `duo_studio` | `DUOSTUDIO` | Calculator occupancy | Kitchenette | Shared |
| `tower_studio` | `TOWERSTUDIO` | Calculator occupancy | Kitchenette | Shared |
| `deluxe_studio` | `DELUXESTUDIO` | Calculator occupancy | Kitchenette | Shared |
| `resort_studio` | `RESORTSTUDIO` | Calculator occupancy | Kitchenette | Shared |
| `one_bedroom` | `ONEBR` | Calculator occupancy | Full | In room |
| `two_bedroom` | `TWOBR` | Calculator occupancy | Full | In room |
| `three_bedroom_grand_villa` | `GRANDVILLA` | Calculator occupancy | Full | In room |
| `bungalow` | `TWOBRBUNGALOW` | Calculator occupancy | Full | In room |
| `cabin` | `CABIN` | Calculator occupancy | Full | In room |
| `treehouse` | `TREEHOUSE` | Calculator occupancy | Full | In room |
| `penthouse` | `PENTHOUSE` | Calculator occupancy | Full | In room |

Capacity rules:

- `canRoomAccommodateParty` uses the Phase 1 normalized party total.
- Party size must be greater than zero.
- A room is eligible only when calculator metadata has a positive finite occupancy.
- The service chooses the smallest eligible room by capacity, then display name.
- A preferred resort can never bypass capacity.

Current verified capacities are whatever the installed calculator package exposes for each resort-room code. Typical supported values include studios at 2 to 5 guests depending on room code, one-bedroom villas at 4 to 5, two-bedroom villas at 8 to 9, bungalows/cabins at 8, treehouse villas at 9, and grand villas at 12.

## Hard Exclusions

Hard exclusions remove a resort from final recommendations:

- Unsupported property.
- Non-WDW property.
- User explicitly excluded the resort.
- No supported room mapping.
- No eligible room can accommodate the party.
- Unsupported calculator year or invalid exact dates when point estimation is required.

Subjective preferences are soft scoring inputs unless the user explicitly excludes a resort.

## Scoring

Scoring is deterministic, bounded to 0-100, and explainable. It is not a claim of scientific precision.

Weights are centralized in `PIXIE_SCORING_WEIGHTS`:

| Dimension | Max Points |
| --- | ---: |
| Capacity fit | 18 |
| Preferred resort | 12 |
| Park proximity | 14 |
| Transportation | 12 |
| Kitchen | 10 |
| Pool | 8 |
| Walking sensitivity | 8 |
| Vacation pace | 6 |
| Budget | 12 |

Missing preferences are generally neutral. They may produce `incomplete_preferences`, but they do not hard-exclude resorts.

Tie-breaking is stable:

1. Higher score.
2. Stronger budget fit.
3. Smaller suitable room.
4. Fewer warnings.
5. Catalog order.

## Budget Interpretation

Budget values in `PixieTripState` are user preferences, not authoritative pricing.

Rules:

- Money is represented in integer cents.
- `accommodation_only` compares against estimated accommodation total.
- `nightly` multiplies by trusted number of nights before comparison.
- `total_trip` is not treated as an accommodation-only budget.
- Missing, unknown, incompatible, or unsupported pricing returns neutral/unknown status.
- The service uses conservative labels: `within_accommodation_budget`, `possibly_over_budget`, `likely_over_budget`, `budget_context_missing`, or `cannot_evaluate`.

## Points Adapter

`estimateDvcPoints` wraps the existing DVC calculator and does not duplicate point-chart logic.

Rules:

- Exact arrival and departure dates are required.
- Checkout date is not charged as a stay night.
- Date-only UTC math is used through Phase 1 utilities.
- Supported chart years are currently `2025`, `2026`, and `2027`.
- Unsupported years fail clearly before calling calculator fallback behavior.
- Unsupported resort-room combinations fail clearly.
- The adapter never averages, guesses, or substitutes another room.
- The first verified calculator view for the resort-room combination is used internally because Pixie Phase 2 has not introduced view-type selection.

Known limitation: a cross-year stay can still fail if the installed chart data is missing one side of the date range. The adapter surfaces this as unsupported instead of estimating.

## Guest Price Adapter

`estimateGuestAccommodationPrice` uses the installed calculator package's rate category policy.

Current verified runtime source:

- `pixiedvc-calculator` `RATE_BY_CATEGORY`.
- Calculator resort category.
- Calculator booking-window tier policy.

The installed runtime currently exposes legacy pricing categories:

- `PREMIUM`: 2500 cents per point outside seven months, downgraded to `REGULAR` inside seven months.
- `REGULAR`: 2300 cents per point.
- `ADVANTAGE`: 2000 cents per point.

The TypeScript source in the calculator package also contains newer access-category names. The adapter supports both shapes, but the source/dist mismatch should be resolved before Pixie pricing is promoted as a public source of truth.

The adapter:

- Uses integer cents only.
- Records pricing source and category.
- Marks output as an estimate, not confirmed pricing.
- Does not use Ready Stay owner payout as guest pricing.
- Does not duplicate Ready Stay-specific fee logic.
- Returns unsupported when the pricing category cannot be evaluated confidently.

## Reason Codes

Reason codes are stable records for future UI and AI explanation layers:

- `preferred_resort`
- `near_priority_park`
- `monorail_access`
- `skyliner_access`
- `boat_transportation`
- `strong_pool_match`
- `kitchen_match`
- `lower_walking_burden`
- `relaxed_pace_match`
- `suitable_for_large_party`
- `smallest_supported_room`
- `within_accommodation_budget`
- `possibly_over_budget`
- `likely_over_budget`
- `budget_context_missing`
- `budget_cannot_evaluate`
- `exact_dates_priced`
- `dates_not_exact`
- `calculator_year_unsupported`
- `room_capacity_verified`
- `room_capacity_unverified`
- `user_excluded`
- `unsupported_property`
- `unsupported_room_mapping`
- `incomplete_preferences`

Explanation fragments are deterministic templates. Future AI may rephrase them conversationally but must not change scores or facts.

## Recommendation Output

`recommendPixieResorts` returns:

- `recommendations`
- `excludedResorts`
- `warnings`
- `inputSummary`
- `recommendationReadiness`
- `generatedAt`
- `scoringVersion`
- `catalogVersion`
- `pricingVersion`
- `calculatorCoverage`

Each recommendation includes:

- Stable `recommendationId`.
- `resortId`, `resortSlug`, and display name.
- Rank and score.
- Eligible room types.
- Recommended room type.
- Point estimate when exact dates and calculator support allow it.
- Guest price estimate when point estimate and pricing support allow it.
- Budget fit.
- Reason codes.
- Explanation fragments.
- Tradeoffs.
- Warnings.
- Data quality.
- Pricing and calculator status.
- Scoring breakdown.

The default top count is three. No ineligible resort appears in final recommendations.

## Data Quality

Recommendation output exposes data-quality indicators so future UI and AI can be honest:

- `complete`
- `partial`
- `estimate_only`
- `unsupported_dates`
- `unsupported_room_mapping`
- `pricing_unavailable`
- `incomplete_preferences`

Pixie should say when exact-date pricing was used, when pricing is unavailable, and when more user preferences would improve ranking.

## Known Data Limitations

- `public.resorts` may contain operational aliases and database identifiers that differ from calculator identifiers. Pixie Phase 2 deliberately keeps database IDs out of local recommendations.
- Fort Wilderness Cabins need calculator resort metadata before recommendation support.
- The installed calculator package runtime and TypeScript source currently differ in pricing-category naming and rates.
- Existing migrations include a Kidani `KV` calculator-code reference, while the calculator uses `AKV` for Animal Kingdom Villas. Pixie treats AKV as the supported calculator identity for Phase 2.
- The adapter does not yet model room view preferences as first-class Pixie state.
- The adapter does not calculate park tickets, dining, flights, total vacation cost, or Ready Stay-specific pricing.

## Example

A trip with exact 2027 dates, party size four, Magic Kingdom priority, and monorail preference should favor eligible Magic Kingdom-area resorts with verified room capacity and calculator support. A low accommodation-only budget can reduce their score, but it will not cause Pixie to invent cheaper prices or hide unsupported pricing.
