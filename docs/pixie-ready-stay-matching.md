# Pixie Ready Stay Matching

This document describes the deterministic Ready Stay matching foundation created in Pixie Phase 3.

Permanent architecture rules remain in `docs/pixie-development-bible.md`. Planner-state, resort recommendation, pricing, and identifier rules remain in:

- `docs/pixie-planner-state.md`
- `docs/pixie-resort-recommendations.md`
- `docs/pixie-pricing-authority.md`
- `docs/pixie-resort-identifier-matrix.md`

## Scope

Phase 3 is read-only and advisory.

It does:

- Read public-visible Ready Stay rows through existing visibility rules.
- Normalize listings into a Pixie-facing shape.
- Match exact, flexible, near-date, partial-overlap, resort-preference, and budget-compatible opportunities.
- Filter by trusted sleeping capacity.
- Use listing-specific Ready Stay prices only.
- Preserve AKV Kidani/Jambo as sub-property metadata.
- Return deterministic scores, reason codes, and stale-inventory warnings.

It does not:

- Reserve inventory.
- Create locks.
- Submit booking requests.
- Modify Ready Stay records.
- Modify checkout, agreements, payment, or booking creation.
- Use AI.
- Add frontend components.
- Add Pixie persistence.

## Public Visibility Source

Pixie uses:

```text
ready_stays public query + isPublicReadyStayRow
```

The code lives in:

- `src/lib/ready-stays/visibility.ts`
- `src/lib/pixie/ready-stays/visibility-adapter.ts`

Pixie uses the stricter public helper, not the admin-or-public helper. This means Pixie does not expose admin-only inventory.

Visible rows must satisfy the existing public visibility rules:

- `status = active`; or
- `status = test` with `is_visible_publicly = true`;
- non-empty `slug`;
- non-empty `title`;
- non-empty `image_url`;
- `check_out` not in the past;
- not expired by `expires_at`;
- not currently locked by `locked_until`;
- not `verification_status = proof_uploaded`;
- not `verification_status = rejected`.

Hidden, expired, sold, removed, paused, draft, proof-only, rejected, currently locked, and non-public test rows are excluded.

## Normalized Listing Shape

`PixieReadyStayListing` contains only fields needed for matching and presentation:

- `listingId`
- `resortId`
- `canonicalResortSlug`
- `displayResortName`
- `subProperty`
- `roomTypeId`
- `roomDisplayName`
- `arrivalDate`
- `departureDate`
- `numberOfNights`
- `sleeps`
- `points`
- `listingPriceCents`
- `ratePerPointCents`
- `currency`
- `status`
- `visibilityStatus`
- `bookingPath`
- `imageReference`
- `isTestListing`
- `sourceUpdatedAt`
- `warnings`

The adapter does not expose owner payout fields, owner identity, service-role-only metadata, lock tokens, guest PII, or booking package data.

## Listing Price Authority

Ready Stay pricing uses the Phase 2.5 `ready_stay_listing_price` context.

Authority:

- `ready_stays.guest_price_per_point_cents`
- `ready_stays.test_guest_total_cents`
- `src/lib/ready-stays/test-pricing.ts`

Rules:

- Listing price is specific to that listing only.
- Listing price is marked `listing_price`, not a custom-request estimate.
- Pixie never recalculates Ready Stay price using custom-request point rates.
- Pixie never exposes owner payout as guest price.
- Missing or malformed listing price returns an explicit warning and budget status.

## Date Classifications

Supported classifications:

- `exact_match`: arrival and departure exactly equal requested dates.
- `flexible_date_match`: dates fit declared flexibility and preserve duration.
- `near_date_match`: listing is close but outside declared flexibility.
- `partial_overlap`: listing overlaps requested dates but does not satisfy the full stay.
- `resort_preference_match`: useful resort signal when exact dates are incomplete.
- `budget_match`: budget-compatible listing signal.
- `no_match`: invalid or unusable date data.

Checkout date is exclusive. Pixie uses date-only UTC arithmetic and does not split or combine listings.

Ready Stays are treated as whole listings. A longer listing is not silently shortened, and a shorter listing is not labelled as satisfying the full trip.

## Capacity Rules

Capacity comes from `ready_stays.sleeps`.

Rules:

- Insufficient capacity is a hard exclusion.
- Missing capacity fails closed.
- Room names are not used as optimistic capacity fallback.
- Party size comes from normalized Pixie planner state.
- No infant exception is invented in Phase 3.

## Resort And Sub-Property Mapping

Pixie uses the Phase 2.5 resort identifier adapter.

Rules:

- Non-WDW listings are excluded.
- Unknown resort identifiers fail closed.
- AKV maps to Pixie resort ID `akv`.
- Kidani and Jambo remain `subProperty` metadata, not separate Pixie resort IDs.
- Bare `kidani`, bare `jambo`, and `KV` remain ambiguous and fail closed.
- Existing listing labels are preserved for display.

## Room Mapping

Room mapping uses the Phase 2 room-type adapter where possible.

Unknown room mappings may still match when listing capacity, dates, visibility, and pricing are trusted. They receive `unknown_room_mapping` and reduced data quality. Capacity remains authoritative from `sleeps`.

View handling and booking-form room conversion are intentionally out of scope.

## Budget Rules

Compatible comparisons:

- `accommodation_only`: compare directly to listing total.
- `nightly`: compare nightly budget multiplied by listing nights.

Incompatible comparisons:

- `total_trip`: cannot be treated as lodging budget.
- `unknown`: cannot evaluate.

Near-budget tolerance is `1000` basis points, or 10%.

All decisions use integer cents.

## Scoring

Weights live in `PIXIE_READY_STAY_SCORING_WEIGHTS`:

| Dimension | Max Points |
| --- | ---: |
| Date match | 35 |
| Capacity fit | 15 |
| Preferred resort | 12 |
| Selected resort | 8 |
| Room preference | 8 |
| Budget fit | 12 |
| Park/transportation preference | 5 |
| Sub-property preference | 3 |
| Data quality | 2 |

Exact date matches dominate. Missing optional preferences remain neutral. Preferred resorts do not bypass date, visibility, or capacity requirements.

Tie-breaking:

1. Stronger match classification.
2. Higher score.
3. Full-stay satisfaction.
4. Better budget fit.
5. Smaller date shift.
6. Fewer warnings.
7. Lower listing price.
8. Stable listing ID.

## Reason Codes

Phase 3 reason codes include:

- `exact_dates`
- `within_flexible_dates`
- `same_trip_length`
- `requires_date_shift`
- `requires_length_change`
- `partial_overlap_only`
- `full_stay_satisfied`
- `preferred_resort`
- `selected_resort`
- `preferred_room_type`
- `preferred_sub_property`
- `capacity_verified`
- `spare_capacity`
- `within_accommodation_budget`
- `near_accommodation_budget`
- `over_accommodation_budget`
- `budget_context_incompatible`
- `listing_price_verified`
- `listing_price_unavailable`
- `public_visible_listing`
- `visible_test_listing`
- `inventory_may_change`
- `stale_listing_warning`
- `unknown_room_mapping`
- `unknown_sub_property`
- `user_excluded_resort`
- `insufficient_capacity`
- `malformed_listing`
- `unsupported_resort_identifier`

Explanation fragments are deterministic templates. Future AI may rephrase them but must not alter facts, scores, availability, or pricing.

## Match Output

`matchPixieReadyStays` returns:

- `matches`
- `groups.exact`
- `groups.flexible`
- `groups.alternatives`
- `excludedListings`
- `warnings`
- `inputSummary`
- `readiness`
- `generatedAt`
- `matchingVersion`
- `pricingSource`
- `visibilitySource`
- `inventoryDisclaimerKey`

Every match carries:

```text
inventoryStatus = recheck_required_before_booking
inventoryDisclaimerKey = recheck_required_before_booking
```

Pixie must not say a Ready Stay is confirmed available. It can say the listing was public-visible at match time.

## Future Recheck Requirement

Before any future booking action, Pixie or the existing Ready Stay flow must recheck:

- listing still exists;
- listing is still public-visible;
- status still permits booking;
- no conflicting lock or booking exists;
- price remains current;
- dates and room remain unchanged.

Phase 3 does not implement the recheck action or booking handoff.

## Known Limitations

- Matching uses public-visible rows only; it does not query private/admin inventory.
- Room mapping can be partial when listing room text does not map cleanly.
- AKV building matching depends on listing row labels/slugs.
- Ready Stay availability can change immediately after matching.
- The future UI must clearly separate exact/flexible matches from alternatives and partial overlaps.
