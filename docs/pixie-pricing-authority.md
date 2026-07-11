# Pixie Pricing Authority

This document defines pricing authority boundaries for Pixie. It exists because Pixie recommendations need estimates, Ready Stays need listing prices, and owner operations need payout rates. These are separate domains.

## Calculator Source And Runtime

The `pixiedvc-calculator` package has two relevant paths:

- Source: `packages/pixiedvc-calculator/src`.
- Package export/runtime output: `packages/pixiedvc-calculator/dist`.

Root app TypeScript and Next development/build configuration point `pixiedvc-calculator` at source:

- `tsconfig.json` maps `pixiedvc-calculator` to `packages/pixiedvc-calculator/src`.
- `next.config.ts` Turbopack aliases `pixiedvc-calculator` to `./packages/pixiedvc-calculator/src`.
- `next.config.ts` also uses `transpilePackages: ["pixiedvc-calculator"]`.

The package manifest points bare package consumers at generated output:

- `packages/pixiedvc-calculator/package.json` `exports["."].import` points at `./dist/index.js`.
- `packages/pixiedvc-calculator/package.json` `types` points at `./dist/index.d.ts`.

Phase 2.5 found that the generated output was stale. Source used Access-tier categories while `dist` used legacy tiers.

Resolved state:

- Source and generated output both use Access-tier categories.
- Generated output is versionable by unignoring `packages/pixiedvc-calculator/dist/index.js`, `index.js.map`, and `index.d.ts`.
- Regression tests compare source and package export values.

## Pricing Categories

Current custom-request calculator categories:

| Category | Display | Dollars Per Point |
| --- | --- | ---: |
| `PREMIER_ACCESS` | Premier Access | 29 |
| `PRIORITY_ACCESS` | Priority Access | 26 |
| `SELECT_ACCESS` | Select Access | 24 |
| `VALUE_ACCESS` | Value Access | 22 |

Booking-window rule:

- `SELECT_ACCESS` and `VALUE_ACCESS` stay fixed.
- `PREMIER_ACCESS` and `PRIORITY_ACCESS` use their category rate only when secured at least seven calendar months before check-in.
- Inside seven months, `PREMIER_ACCESS` and `PRIORITY_ACCESS` estimate at `SELECT_ACCESS`.

Legacy stale generated categories removed from the trusted Pixie path:

- `PREMIUM`: 25.
- `REGULAR`: 23.
- `ADVANTAGE`: 20.

If those legacy categories appear in Pixie pricing, Pixie must fail closed as an ambiguous pricing source.

## Authority Map

| Context | Authority | Inputs | Output | Price Type | Variation | Estimate Or Confirmed | Consumers | Must Not Be Used By |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `custom_request_estimate` | `packages/pixiedvc-calculator/src/engine/rates.ts`, `pointRates.ts`, `calc.ts`, and synchronized package `dist` | Resort calculator code, points, arrival date, booking date | `estimatedTotalCents`, `ratePerPointCents`, category, source/version | Per point | Resort category and booking window | Estimate | Pixie resort recommendations, future booking draft preview | Ready Stay listing totals, owner payout |
| `ready_stay_listing_price` | `ready_stays.guest_price_per_point_cents`, `ready_stays.test_guest_total_cents`, `src/lib/ready-stays/test-pricing.ts` | Actual Ready Stay listing row | `confirmedListingTotalCents`, listing rate | Listing-specific per point or test total override | Listing row and optional test override | Listing price for that stay | Ready Stay marketplace, future Pixie Ready Stay matching display | Custom request estimates, general resort recommendations |
| `owner_payout` | `src/lib/pricing.ts` `computeOwnerPayout` | Booking points, booking resort id, matched owner membership resort id, bonus cents | Owner payout cents/rate fields | Per point | Home-resort premium and owner bonus | Owner payout calculation | Owner matching and owner operations | Guest-facing Pixie pricing, custom request guest estimates |
| Founder owner adjustment | `src/lib/founding-owner-bonus.ts` | Owner bonus fields and active promotion | Additional owner payout cents per point | Per point owner bonus | Owner-specific promotion state | Owner payout adjustment | Owner payout only | Guest-facing pricing |
| Affiliate adjustments | Existing affiliate attribution/conversion systems | Referral/affiliate attribution | Attribution/conversion records | Not a pricing source | Attribution state | Not pricing | Analytics/affiliate payouts | Pixie guest price calculation |

## Pixie Price Contract

Pixie uses `PixieGuestPriceResult`.

Supported custom request estimate:

```ts
{
  pricingContext: "custom_request_estimate";
  supported: true;
  estimatedTotalCents: number;
  ratePerPointCents: number;
  currency: "USD";
  pricingCategory: string;
  source: string;
  sourceVersion: string;
  estimateStatus: "estimate";
  warnings: string[];
}
```

Supported Ready Stay listing price:

```ts
{
  pricingContext: "ready_stay_listing_price";
  supported: true;
  confirmedListingTotalCents: number;
  ratePerPointCents: number;
  currency: "USD";
  pricingCategory: "ready_stay_listing";
  source: string;
  sourceVersion: string;
  estimateStatus: "listing_price";
  readyStayId: string;
  warnings: string[];
}
```

Unsupported result:

```ts
{
  pricingContext: "custom_request_estimate" | "ready_stay_listing_price";
  supported: false;
  currency: "USD";
  source: string;
  sourceVersion: string;
  estimateStatus: "unsupported";
  unsupportedReason: string;
  warnings: string[];
}
```

## Non-Negotiable Rules

- Pixie must never use Ready Stay pricing rules for a custom request.
- Pixie must never display owner payout rates as guest pricing.
- Pixie must never infer guest price from owner payout.
- Pixie must never hardcode a spread unless a canonical approved service owns it.
- Ready Stay listing totals are listing-specific.
- Custom request totals are estimates.
- Money values are integer cents.
- Unknown or stale pricing categories return unsupported.
- Recommendation output may remain points-only when pricing is unsupported.

## Validation

Regression coverage:

- Source and package export rates match.
- Source and package export resort categories match.
- Package export quote uses Access-tier pricing.
- Legacy categories are no longer accepted by Pixie pricing.
- Ready Stay listing pricing requires a listing ID.
- Ready Stay listing totals use listing-specific fields or test listing override.
- Owner payout rates are not exposed as guest price.
