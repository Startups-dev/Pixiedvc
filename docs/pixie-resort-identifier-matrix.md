# Pixie Resort Identifier Matrix

This document records Pixie Phase 2.5 resort identity decisions. It should be updated whenever Pixie adds a supported resort, changes booking handoff behavior, or adds Ready Stay matching.

## Identity Rules

- Pixie v1 supports Walt Disney World only.
- Pixie resort IDs are stable lowercase calculator-code-like IDs.
- Calculator codes come from `pixiedvc-calculator`.
- Booking-form value is the canonical slug unless a future booking conversion phase defines a stronger contract.
- Database IDs are not portable identifiers and must not be hardcoded.
- Ready Stay rows represent resorts through `ready_stays.resort_id` joined to `public.resorts`.
- Non-WDW resorts remain excluded.
- Unsupported mappings fail closed.

## AKV, Kidani, And Jambo Decision

Repository findings:

- The calculator models Animal Kingdom Villas as one property: `AKV`.
- Point charts are `AKV.json` for 2025, 2026, and 2027.
- The calculator does not model `KV` as a calculator resort code.
- `src/lib/resort-calculator.ts` maps `animal-kingdom-villas`, `animal-kingdom-jambo`, and `animal-kingdom-kidani` to `AKV`.
- The booking form has `building_preference: "none" | "jambo" | "kidani"`.
- The booking route persists building preference only when the resolved resort is `animal-kingdom-villas` or `AKV`.
- A historical migration added `animal-kingdom-kidani` with calculator code `KV`.
- Ready Stays can point to database resort rows, so they may distinguish Jambo/Kidani by resort row even though the calculator does not.

Pixie decision:

- Canonical Pixie resort ID: `akv`.
- Canonical Pixie slug: `animal-kingdom-villas`.
- Calculator code: `AKV`.
- Kidani and Jambo are treated as AKV sub-property/building preferences, not separate Pixie resort IDs.
- Verified full slugs such as `animal-kingdom-kidani` and `animal-kingdom-jambo` may resolve to `akv` for resort-level planning.
- Bare aliases `kidani`, `jambo`, and historical code `KV` fail closed as ambiguous resort identifiers.
- Kidani/Jambo-specific booking handoff must use explicit building preference later; Pixie Phase 2.5 does not create booking payloads.
- Kidani/Jambo-specific Ready Stay matching must use listing/database resort row data when Phase 3 is implemented.

## Matrix

| Pixie ID | Display Name | Canonical Slug | Calculator Code | Booking-Form Value | Database Lookup Strategy | Ready Stay Representation | Image Resolver Input | Aliases | Ambiguity Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `akv` | Animal Kingdom Villas | `animal-kingdom-villas` | `AKV` | `animal-kingdom-villas` | Lookup by slug or `AKV`; do not hardcode DB ID | `ready_stays.resort_id` may point to AKV/Jambo/Kidani DB rows | slug `animal-kingdom-villas`, code `AKV` | `animal-kingdom-jambo`, `animal-kingdom-kidani`, full Disney Jambo/Kidani slugs | Building-specific short aliases ambiguous | Calculator umbrella only; booking building preference is separate |
| `blt` | Bay Lake Tower at Disney's Contemporary Resort | `bay-lake-tower` | `BLT` | `bay-lake-tower` | Lookup by slug or `BLT`; do not hardcode DB ID | Joined `resorts.slug`/`calculator_code` | slug `bay-lake-tower`, code `BLT` | None verified beyond display name | Unambiguous | Supported |
| `bcv` | Beach Club Villas | `beach-club-villas` | `BCV` | `beach-club-villas` | Lookup by slug or `BCV`; do not hardcode DB ID | Joined `resorts.slug`/`calculator_code` | slug `beach-club-villas`, code `BCV` | `beach-club-villa` | Unambiguous | Supported |
| `bwv` | BoardWalk Villas | `boardwalk-villas` | `BWV` | `boardwalk-villas` | Lookup by slug or `BWV`; do not hardcode DB ID | Joined `resorts.slug`/`calculator_code` | slug `boardwalk-villas`, code `BWV` | `boardwalk` | Unambiguous | Supported |
| `brv` | Boulder Ridge Villas at Disney's Wilderness Lodge | `boulder-ridge-villas` | `BRV` | `boulder-ridge-villas` | Lookup by slug or `BRV`; do not hardcode DB ID | Joined `resorts.slug`/`calculator_code` | slug `boulder-ridge-villas`, code `BRV` | None verified | Unambiguous | Supported |
| `ccv` | Copper Creek Villas & Cabins at Disney's Wilderness Lodge | `copper-creek-villas` | `CCV` | `copper-creek-villas` | Lookup by slug or `CCV`; do not hardcode DB ID | Joined `resorts.slug`/`calculator_code` | slug `copper-creek-villas`, code `CCV` | None verified | Unambiguous | Supported |
| `okw` | Disney's Old Key West Resort | `old-key-west` | `OKW` | `old-key-west` | Lookup by slug or `OKW`; do not hardcode DB ID | Joined `resorts.slug`/`calculator_code` | slug `old-key-west`, code `OKW` | None verified | Unambiguous | Supported |
| `pvb` | Disney's Polynesian Villas & Bungalows | `polynesian-villas` | `PVB` | `polynesian-villas` | Lookup by slug or `PVB`; do not hardcode DB ID | Joined `resorts.slug`/`calculator_code` | slug `polynesian-villas`, code `PVB` | None verified | Unambiguous | Ready Stay modifiers use `POL`; Pixie uses calculator `PVB` |
| `rva` | Disney's Riviera Resort | `riviera-resort` | `RVA` | `riviera-resort` | Lookup by slug or `RVA`; do not hardcode DB ID | Joined `resorts.slug`/`calculator_code` | slug `riviera-resort`, code `RVA` | `riviera` | Unambiguous | Supported |
| `ssr` | Disney's Saratoga Springs Resort & Spa | `saratoga-springs` | `SSR` | `saratoga-springs` | Lookup by slug or `SSR`; do not hardcode DB ID | Joined `resorts.slug`/`calculator_code` | slug `saratoga-springs`, code `SSR` | `saratoga-springs-resort` | Unambiguous | Supported |
| `vgf` | The Villas at Disney's Grand Floridian Resort & Spa | `grand-floridian-villas` | `VGF` | `grand-floridian-villas` | Lookup by slug or `VGF`; do not hardcode DB ID | Joined `resorts.slug`/`calculator_code` | slug `grand-floridian-villas`, code `VGF` | None verified | Unambiguous | Supported |

## Unsupported Or Excluded

| Identifier | Status | Reason |
| --- | --- | --- |
| `CFW`, `fort-wilderness-cabins` | Unsupported WDW | Chart/fallback traces exist, but calculator resort metadata lacks complete category, room types, and occupancy. |
| `AUL`, `aulani` | Excluded | Non-WDW. |
| `VDH`, `disneyland-hotel-villas` | Excluded | Non-WDW. |
| `VGC`, `grand-californian-villas` | Excluded | Non-WDW. |
| `HHI`, `hilton-head-island` | Excluded | Non-WDW. |
| `VB`, `vero-beach` | Excluded | Non-WDW. |
| `KV`, `kidani`, `jambo` | Ambiguous | Building/sub-property labels, not standalone Pixie resort identities. |

## Fail-Closed Rules

- Unknown resort identifiers return `unknown_resort_identifier`.
- Bare Kidani/Jambo/KV return `ambiguous_resort_identifier`.
- Non-WDW identifiers return `unsupported_non_wdw_resort`.
- Fort Wilderness returns `unsupported_resort`.
- Database IDs are not accepted as durable Pixie identifiers.
- Booking mapping is not considered verified merely because a display name matched.
