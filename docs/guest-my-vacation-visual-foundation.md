# Guest My Vacation Visual Foundation

## Design Intent

The first guest visual phase establishes `/my-trip/[tripId]` as the prototype route for the future HannaDVC "My Vacation" experience. The page should feel like opening a luxury travel itinerary, with the resort image and trip details leading the experience before any operational content.

The design direction is warm, resort-led, editorial, and restrained. It intentionally avoids the owner portal's business-dashboard pattern.

## Visual Hierarchy

The first viewport prioritizes:

1. Resort image
2. Resort-led trip title
3. Dates
4. Nights, room, and party
5. Countdown
6. Guest-facing trip status
7. One trusted primary action

Payment totals, documents, traveler management, and Hara reservation context are intentionally out of scope for this phase.

## Resort Imagery Strategy

The hero uses the existing public resort image utility in `src/lib/resort-image.ts`.

Resolution order:

1. Resort calculator code
2. Resort slug
3. Trusted Saratoga Springs fallback

No external stock images, scraped images, or unrelated Disney imagery are used.

## Hero Architecture

The hero is rendered by `GuestTripHero` from a server-owned `GuestTripHeroViewModel`.

The hero supports:

- guest first name;
- trip type;
- resort name;
- resort image;
- room type;
- check-in and check-out dates;
- derived nights;
- party summary;
- countdown;
- normalized status label;
- optional trusted primary action.

The refined hero uses a small contextual line, the resort name as the only `h1`, followed by the trusted date range, stay details, countdown, and optional trusted action. It avoids the earlier long heading pattern, such as "Your stay at [resort]", because that made long resort names wrap awkwardly and risk clipping at desktop widths.

## Identity Resolution

Guest identity is resolved server-side before the hero renders.

Resolution order:

1. `profiles.display_name`
2. `profiles.full_name`
3. authenticated user metadata display name
4. authenticated user metadata full name
5. authenticated user metadata name
6. authenticated email prefix
7. booking lead guest name as a final fallback
8. no-name greeting

The normalizer rejects honorific-only and generic values such as `Mr.`, `Ms.`, `Guest`, `null`, and `undefined`. PixieDVC/HannaDVC does not infer honorifics for guest greetings.

## Guest Navigation

The guest navigation is intentionally minimal and uses only existing routes:

- Plan with Hara: `/hara`
- Support: `/support`

Payments, Documents, Travelers, and Account are not added as navigation links in this phase because they are not yet backed by a unified guest portal route.

The top bar now uses an understated HannaDVC wordmark linked to `/my-trip`. The page avoids a redundant "My Vacation" label in the nav because the hero already establishes the trip context. The trip switcher remains visible only when multiple authenticated guest trips exist.

The global public marketing header and footer are suppressed on `/my-trip` and `/my-trip/[tripId]`. The dedicated guest trip navigation remains the page chrome for the trip experience, while public marketing, payment, contract, and tokenized routes remain unchanged.

## Countdown Behavior

Countdown labels are derived from the trusted check-in date:

- future trip: `{n} days until check-in`
- tomorrow: `Your vacation begins tomorrow`
- check-in day: `Welcome to your vacation`
- past trip: `This trip has ended`
- missing or invalid date: no countdown label

No progress ring or fake readiness percentage is used.

The visual countdown is split into a prominent value and restrained context, for example `3 days` and `until check-in`, while preserving the full accessible label.

## Status And Actions

Guest status labels are normalized server-side and never expose raw booking enums. Generic `Action needed` is avoided in favor of specific labels when current trusted status supports it:

- `Agreement needs your signature`
- `Traveler details needed`
- `Disney confirmation pending`
- `Reservation confirmed`
- `Final details are being prepared`
- `Your trip is ready`
- `This trip has ended`

The hero only renders a primary action when the action is trusted and specific. In this phase, the trusted hero action is the existing guide link for linking a confirmed reservation.

## Reservation Progress

The immediate post-hero confirmation card has been replaced with an editorial `Your reservation` section using thin dividers and rows:

- Reservation
- Disney confirmation
- My Disney Experience

The section uses the same trusted confirmation-number and transfer state as before. Pending confirmation is explained concisely, and the existing `How to link your reservation` guide remains available.

## Cancellation Presentation

The cancellation and credit content remains legally conservative and links to the existing Deferred Cancellation policy. It is presented as a subordinate editorial note under `If plans change`, without a large rounded card.

## Motion Rules

Allowed motion is limited to a one-time image settle animation and a short trip-switcher opening animation. Both use `motion-safe` utility classes so reduced-motion users do not receive the effect.

## Trip Switcher

The trip switcher appears only when the authenticated guest has multiple trips. It displays resort name and date range, never raw trip IDs.

## View Model

The view model lives in `src/lib/guest/hero-view-model.ts`.

It excludes:

- raw database rows;
- owner data;
- owner payout;
- platform margin;
- affiliate commission;
- admin notes;
- raw booking status enums;
- payment-provider secrets;
- guest email in the hero.

## Responsive Behavior

The hero uses a split editorial layout on desktop and stacks intentionally on smaller screens. The image remains meaningful on mobile, and trip details remain readable without hover-dependent controls.

Refinement goals:

- desktop title must not clip;
- left-side whitespace must remain purposeful;
- image crop must stay meaningful;
- mobile must not compress the desktop split;
- countdown and status remain readable above the immediate reservation content.

## Accessibility

The hero has one `h1`, meaningful image alt text, accessible navigation, visible focus states, and countdown/status text that does not rely on color alone.

## Prohibited Visual Patterns

This phase avoids:

- owner-style dark sidebar;
- generic SaaS dashboard composition;
- placeholder route links;
- random colored icon circles;
- payment-first dashboard hierarchy;
- fake readiness percentages;
- untrusted or unrelated imagery.

## Known Limitations

- Payment summary, timeline, documents, traveler management, support embedding, and Hara trip context are not implemented.
- Tokenized contract/payment pages are unchanged.
- Screenshot capture was blocked in this environment: no local Playwright binary is installed, the advertised browser skill file was unavailable, and Computer Use timed out when reading Firefox and Chrome. Required viewport review remains: 1440px, 1280px, 1024px, 768px, 430px, and 390px.

## Next Approved Phase

The next safe phase is a guest shell pass that decides whether protected guest routes should suppress the public marketing header/footer and how `/guest`, `/my-trip`, and Ready Stay guest workflows should share navigation without changing business logic.
