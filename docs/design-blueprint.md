# PixieDVC Product & Experience Blueprint

## Vision
Create a digital home for Disney Vacation Club members, resale buyers, and prospective guests that makes vacation planning feel enchanted, effortless, and elevated. The product bridges Disney park magic with boutique luxury booking standards.

## Target Audiences
- **Core Members:** Existing DVC owners searching for availability, point charts, and perks.
- **Prospective Owners:** Guests researching resale contracts or rental points who need trust-building content.
- **Travel Companions:** Family planners coordinating itineraries, dining, and experiences across age groups.

## Experience Tenets
1. **Enchanted:** Delight through micro-animations, storytelling copy, and whimsical gradients inspired by park atmospherics.
2. **Effortless:** Direct navigation, anticipatory search, and clear step-by-step flows remove friction.
3. **Elevated:** Premium art direction, luxurious typography, and data visualizations that feel on par with hospitality leaders like Amex Travel or Airbnb Luxe.

## Core Journeys
- **Discover Resorts:** Browse interactive resort cards, compare amenities, and see points charts and seasonal availability.
- **Plan Stays:** Use guided trip builder, calendar availability, and points calculator to assemble itineraries.
- **Manage Membership:** Track use years, bank/borrow status, member-exclusive offers, and add-on purchases.
- **Learn & Join:** Educational hub for newcomers covering membership tiers, financing, FAQs, and community stories.

## Information Architecture
- **Landing (Home):** Hero, value proposition, featured resorts, trip planner teaser, testimonials, CTA to explore or join waitlist.
- **Resorts Explorer:** Filterable grid + map, detail pages with immersive imagery, rooms, dining, transportation, and points breakdown.
- **Trip Builder:** Multi-step wizard (dates, party size, priorities) culminating in recommended itineraries and point usage.
- **Membership Hub:** Personalized dashboard with KPIs, timeline, and quick actions (bank points, book, invite family).
- **Stories & Guides:** Content marketing with editorial layouts, short-form tips, and video embeds.
- **Support Center:** Concierge chat, FAQs, booking policies, accessibility resources.

## Key Screens (MVP)
1. **Marketing Landing Page** (phase 1 focus).
2. **Resort Discovery Page** with magic map, filters.
3. **Trip Builder Wizard** entry screen.
4. **Member Dashboard** hero modules.

## Component System
- **Navigation:** Glassmorphic sticky header, mega menu, floating concierge CTA.
- **Hero Banner:** Gradient sky backdrop, headline, supporting copy, CTA cluster, optional illustration.
- **Booking Search Bar:** Inline form with date picker, guest count, resort filter.
- **Resort Card:** Cinematic photography, tag chips (family-friendly, monorail access), point range badge.
- **Testimonial Carousel:** Rounded cards, avatar badges, sparkle vignette.
- **CTA Tiles:** Split background cards leading to Trip Builder or Membership.
- **Stat Highlights:** Icon + number + label with glowing border.
- **Footer:** Four columns, social icons, legal.
- **Utility Components:** Breadcrumbs, tag pills, gradient buttons, floating chat orb.

## Visual Language
- **Palette:**
  - Primary `#2E8FFF` (Pixie Blue) for CTAs, links, highlight glow.
  - Secondary `#FFC857` (Pixie Gold) for accent buttons, badges.
  - Accents `#C5A8FF` (Fairy Lavender) and `#A7F3D0` (Enchanted Mint) in gradient backgrounds.
  - Surfaces `#F9FAFB` light, `#0B0E1A` deep navy for immersive sections.
  - Text `#1F2937` charcoal body, `#6B7280` muted supporting text.
- **Typography:**
  - Display: `Playfair Display` for hero headlines (serif elegance).
  - Sans-serif: `DM Sans` for UI copy (readable, modern).
  - Mono: keep Geist Mono for code snippets or data.
- **Iconography:** Thin-line icons with subtle inner glow; integrate iOS SF Symbols aesthetic.
- **Imagery:** Cinematic resort photography with soft bokeh overlays; sprinkle sparkle particle svg.
- **Motion:** Ease-out cubic transitions, parallax hero gradient, card hover lift with soft shadow.

## Interaction Principles
- Guided flows with breadcrumbs and progress bars.
- Inclusive navigation with keyboard focus rings, reduced motion alternative.
- Gentle glassmorphism (rgba white 0.12) for overlays; avoid heavy blurs on mobile.

## Accessibility & Content Strategy
- Maintain 4.5:1 contrast for primary text; use gold/blue pairings responsibly.
- Provide alt text narrating story vibes ("sunrise over Bay Lake with monorail").
- Inclusive language ("Members and their guests").
- Offer regional settings (time zones, currency) in near-term roadmap.

## Roadmap Highlights
- Phase 1: Marketing site, resort data ingestion, email capture.
- Phase 2: Auth + member dashboard, points calculator, Trip Builder MVP.
- Phase 3: Concierge chat, itinerary collaboration, integration with DVC APIs.

## Tooling & Workflow
- **Design:** Figma for system, auto-layout components; Framer for motion prototypes.
- **Frontend:** Next.js App Router, Tailwind with CSS variables for brand tokens, Radix for accessible primitives.
- **Collaboration:** Storybook (future), Chromatic visual regression, Vercel preview URLs.
- **Handoff:** Token exports via Style Dictionary feeding Tailwind config.

## Success Metrics
- Time-to-first-booking for existing members.
- Waitlist signups for prospective audience.
- Engagement with Trip Builder (completion rate, average time).
- NPS segmented by user type.

