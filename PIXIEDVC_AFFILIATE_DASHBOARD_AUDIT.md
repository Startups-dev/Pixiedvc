# PixieDVC Affiliate Dashboard Audit

Audit date: 2026-07-17  
Scope: current affiliate-facing dashboard and related affiliate portal routes exactly as implemented in the repository.  
Constraint: no code changes, redesigns, or feature implementation were performed.

## Executive Summary

The current PixieDVC Affiliate Dashboard is a functional but early-stage affiliate portal. It gives approved affiliates a protected dashboard, referral link, payout email management, basic earnings summary, payout history, resource scripts, guided copy, share links, and compliance-oriented messaging.

The product is not yet a complete affiliate operating dashboard. Most performance analytics, referral activity, reservation details, commission transparency, export workflows, notifications, settings, help, and marketing tooling either exist only in admin-side infrastructure or do not exist in affiliate-facing UI.

The biggest product gap is that backend affiliate infrastructure has outgrown the affiliate-facing portal. The system now tracks clicks, visitors, booking attribution, conversions, payout runs, payout items, and admin analytics, but affiliates only see payout summaries and self-service copy resources.

Screenshot note: this audit was performed by repository inspection. The current environment did not include an authenticated affiliate browser session for reliable screenshot capture. Screenshot fields below identify the exact route/screen to capture during authenticated visual QA.

## Routes Audited

| Route | Status | Purpose | Rating |
|---|---:|---|---:|
| `/affiliate/dashboard` | Implemented | Main affiliate portal dashboard | 5/10 |
| `/affiliate/resources` | Implemented | Affiliate toolkit, scripts, tracked links | 7/10 |
| `/affiliate/guides` | Implemented | Affiliate messaging guide, copy, FAQs, assets | 7/10 |
| `/affiliate/login` | Implemented | Affiliate auth, reset, password update | 6/10 |
| `/affiliate/agreement` | Implemented | Static affiliate agreement | 5/10 |
| `/affiliate/apply` | Redirect | Redirects to public affiliate application section | 4/10 |
| `/affiliate` | No page found | Layout exists, but no index route was found | 2/10 |

Related but not dashboard pages:

| Route | Relationship |
|---|---|
| `/go/[slug]` | Affiliate referral redirect to public page with `?ref=` |
| `/r/[slug]` | Legacy/short redirect into `/go/[slug]` |
| `/partners/affiliate-program` | Public acquisition/application page |
| `/partners/become-a-partner` | Public partner acquisition page |
| `/admin/affiliates/*` | Admin-side affiliate management, analytics, applications, payouts |

## Screen Audit

### `/affiliate/dashboard`

Purpose: main affiliate home dashboard for authenticated affiliates.

Screenshot: capture `Affiliate Dashboard` authenticated state, including hero/referral section, stat cards, earnings activity, payout settings, commission tier, and payout history.

Current functionality:

- Requires Supabase authenticated user.
- Redirects unauthenticated users to `/affiliate/login?redirect=/affiliate/dashboard`.
- Looks up profile role from `profiles`.
- Allows admin role to access.
- Loads affiliate profile by `auth_user_id`, then email fallback.
- Attempts affiliate self-healing from approved/pending applications.
- Blocks suspended/rejected/declined/denied/pending-review accounts.
- Displays referral link using `/go/{slug}`.
- Copies referral link.
- Links to Resources, Guides, and `/calculator?ref={slug}`.
- Shows pending owed, last paid, average payout.
- Shows recent earnings records.
- Shows payout email form.
- Shows commission rate, status, tier, and tier messaging.
- Shows payout history table from payout items.

Current UI:

- Dark affiliate shell.
- Centered `max-w-6xl` content.
- Large hero-style card with referral link.
- Three stat cards.
- Two-column content area for activity/settings on desktop.
- Payout history table.
- Uses rounded dark cards with gold primary CTA and teal links.

Components used:

- `AffiliatePortalHeader`
- `Card` and `Button` from `@pixiedvc/design-system`
- `PayoutEmailForm`
- `CopyReferralLinkButton`
- Affiliate theme classes from `src/lib/affiliate-theme.ts`

Backend/API calls:

- Server component queries Supabase directly.
- `getAffiliateForUser`
- `ensureAffiliateForApplicationUser`
- `getAffiliatePayoutSummary`
- `getAffiliatePayoutHistory`
- `POST /api/affiliate/payout-email` from payout email form.

Database tables:

- `profiles`
- `affiliates`
- `affiliate_applications`
- `affiliate_payout_items`
- `affiliate_payout_runs`

Current limitations:

- No click counts.
- No unique visitor count.
- No booking request/reservation list.
- No conversion funnel.
- No campaign performance.
- No date-range selector.
- No charts.
- No sorting or filtering.
- No export.
- No commission detail per booking beyond payout rows.
- No notification center.
- No standalone Settings page.
- No standalone Help page.
- No visible last refresh timestamp.
- No realtime updates.

Bugs found:

- `AffiliatePortalHeader` links to `/affiliate/dashboard#payout-history`, but the payout history section does not define `id="payout-history"`. The nav anchor will not scroll to the intended section.
- The dashboard route uses custom access logic while `/affiliate/resources` and `/affiliate/guides` use `requireAffiliateUser`, creating a product/access consistency risk.
- Header top navigation is hidden on small screens and no mobile portal navigation replacement was found.
- `const cookieStore = await cookies();` in `POST /api/affiliate/payout-email` is unused.
- Some visible text is operationally vague: “Scheduled unpaid commissions” and “Average payout” do not explain payout eligibility, timing, or source period.

UX observations:

- Strongest current element is the referral link card.
- The page feels like a payout summary, not a performance dashboard.
- Users cannot tell how many referrals/clicks/leads they generated.
- The “Share Your Link” action goes to `/calculator?ref=slug`, while generated toolkit links prefer `/go/slug`; this creates conceptual inconsistency.
- Payout history table may overflow on mobile.
- Tier/status messaging is useful but not actionable.
- Empty state is practical but minimal.

Missing features:

- Performance overview.
- Referral traffic analytics.
- Reservation attribution.
- Conversion status.
- Commission calculation explanation.
- Campaign/source breakdown.
- Export/download.
- Notification center.
- Tax/payment profile completeness.
- Support/help escalation.
- Settings page.
- Search/filter/sort.

Overall rating: 5/10.

### `/affiliate/resources`

Purpose: self-service affiliate toolkit for positioning, scripts, share links, custom tracking links, and tracking rules.

Screenshot: capture `Affiliate Toolkit` page with desktop side section nav and mobile section selector.

Current functionality:

- Requires approved affiliate user through `requireAffiliateUser`.
- Redirects to dashboard if no affiliate profile.
- Displays affiliate display name, tier, and commission rate.
- Copies main referral link.
- Provides script library with tabs:
  - 1-2 Sentence
  - Instagram
  - TikTok (15s)
  - Email / Blog
  - Talking Points
- Allows auto-appending referral link to script copy.
- Provides quick tracked links for Homepage, Calculator, and How It Works.
- Supports campaign tag via `utm_campaign`.
- Supports advanced link generation to approved public PixieDVC URLs.
- Blocks admin/owner/affiliate/api/auth paths in advanced link generator.
- Documents referral window, attribution, commission, and payout rules.

Current UI:

- Desktop internal left-side section nav.
- Mobile section `<select>`.
- Dark cards with copy buttons.
- Tab buttons for scripts.
- `<details>` for advanced tracked link generation and tracking rules.

Components used:

- `AffiliateResourcesClient`
- `Card`, `Button`
- Affiliate theme classes.

Backend/API calls:

- Server page calls `requireAffiliateUser`.
- Server page calls `getAffiliateForUser`.
- No client API call except clipboard.

Database tables:

- `profiles`
- `affiliates`

Current limitations:

- Copy/scripts are hardcoded.
- No CMS/content versioning.
- No asset previews.
- No QR code generator.
- No social platform-specific link builder beyond text variants.
- No campaign analytics feedback after generating campaign links.
- Only `utm_campaign` is supported in advanced UI; other UTM fields are not exposed.
- No validation that generated campaign tags match analytics reporting conventions.

Bugs found:

- Several headings use `text-slate-500` on a dark background, which may be low contrast.
- Copy promises “6-8%” commission generally; individual user rate is shown elsewhere but scripts are static.

UX observations:

- This is one of the stronger current affiliate screens.
- Side section nav is useful on desktop.
- The screen is long but organized.
- Advanced link generation is valuable but hidden.
- Tracking rules are concise and helpful.

Missing features:

- QR codes.
- Downloadable media preview grid.
- Platform templates by channel size/audience.
- Saved campaign links.
- Campaign performance feedback.
- UTM source/medium/content controls.
- Link history.
- Copy compliance checklist.

Overall rating: 7/10.

### `/affiliate/guides`

Purpose: affiliate education and copy guidance page.

Screenshot: capture `Affiliate Guides` page with link block, “What to say,” copy/assets, payout instructions, and FAQ.

Current functionality:

- Requires approved affiliate user through `requireAffiliateUser`.
- Redirects to dashboard if no affiliate profile.
- Shows editable affiliate slug field initialized from affiliate profile.
- Builds copyable Home, Calculator, and Plan flow referral links.
- Provides three positioning cards:
  - What PixieDVC is
  - What affiliates should say
  - How referral links work
- Provides pitch copy blocks.
- Provides talking points.
- Provides destination guidance links.
- Provides CTA suggestions.
- Provides website snippet, email snippet, Instagram caption.
- Links downloadable SVG banners from `/affiliate-kit`.
- Provides “How you get paid,” “What not to promise,” and Affiliate FAQ.

Current UI:

- Long single-column educational page.
- Responsive grids.
- Dark cards.
- Copy buttons.
- No internal side nav.

Components used:

- `AffiliateGuidesClient`
- `Card`
- Affiliate theme classes.

Backend/API calls:

- Server page calls `requireAffiliateUser`.
- Server page calls `getAffiliateForUser`.
- Client uses clipboard only.

Database tables:

- `profiles`
- `affiliates`

Current limitations:

- Copy content is hardcoded.
- Editable slug field can create links for arbitrary entered slugs; useful for testing but confusing for authenticated affiliates.
- No content categorization by audience.
- No version control for approved messaging.
- No reporting of which assets were downloaded/copied.
- No direct help/contact path inside the guide.

Bugs found:

- Several text elements use `text-slate-500` on dark cards.
- “Set payout email in the affiliate dashboard” is correct but not linked directly to the payout email section.

UX observations:

- Helpful as a training page.
- Duplicates some Resources concepts.
- The difference between Resources and Guides is not crisp.
- Good compliance guardrails: no availability guarantee, no final pricing guarantee, Disney non-affiliation FAQ.

Missing features:

- Search within guides.
- Downloadable PDF/brand guide.
- Asset preview.
- Copy approval/version badge.
- Campaign examples.
- Link to support/help.
- “New affiliate checklist.”

Overall rating: 7/10.

### `/affiliate/login`

Purpose: affiliate authentication, password reset, and password update flow.

Screenshot: capture login, reset, and update modes.

Current functionality:

- Reads `mode=login|reset|update`.
- Sanitizes redirects to `/affiliate`, `/affiliate/dashboard`, `/affiliate/guides`, `/affiliate/resources`.
- Handles Supabase hash access token sessions.
- Handles `code` or `token_hash/type` callback relay to `/auth/callback`.
- Signs in with password.
- Sends reset request to `POST /api/affiliate/password-reset`.
- Updates password via Supabase client.
- Shows role/session/confirmed messages.
- Links to `/affiliate/apply`.

Current UI:

- Centered dark card.
- Email/password inputs.
- Password visibility buttons.
- Full-width gold submit button.
- Forgot password / set password links.

Components used:

- `AffiliateLoginClient`
- `Card`
- Supabase browser client.

Backend/API calls:

- Supabase auth client.
- `POST /api/affiliate/password-reset`.
- `/auth/callback` relay.

Database tables:

- Indirectly `auth.users`.
- `affiliates` in password reset API for approval check.

Current limitations:

- No magic-link login.
- No MFA.
- No visible password requirements.
- No affiliate status explanation except generic role error.
- No detailed application-state recovery.
- No rate-limit UI feedback for repeated login attempts.

Bugs found:

- Successful password login always assigns `window.location.assign("/affiliate/dashboard")`, ignoring sanitized `redirectTo`.
- `/affiliate` is allowed as redirect but no `/affiliate/page.tsx` was found.
- “Forgot password?” and “Set password” both point to reset mode; that may be intentional, but it creates duplicate actions with the same destination.

UX observations:

- Login is clear and restrained.
- Error messages avoid account enumeration.
- The path between application approval and first password setup could be clearer.

Missing features:

- First-time activation flow.
- Explicit “check your email” guidance by state.
- Password requirements.
- MFA/security settings.
- Account lockout messaging.

Overall rating: 6/10.

### `/affiliate/agreement`

Purpose: static affiliate agreement page.

Screenshot: capture full agreement page.

Current functionality:

- Displays a short affiliate agreement.
- Does not require auth.
- Does not capture acceptance.
- Does not show effective date/version.
- Does not link back to portal or application.

Current UI:

- Simple centered document.
- Dark card styling from affiliate theme.

Components used:

- Affiliate theme classes.

Backend/API calls:

- None.

Database tables:

- None.

Current limitations:

- Not a full legal agreement experience.
- No versioning.
- No acceptance tracking.
- No PDF/download.
- No route-level auth distinction.

Bugs found:

- No obvious way back to dashboard or application.

UX observations:

- Readable but incomplete for a production affiliate legal center.

Missing features:

- Effective date.
- Version history.
- Acceptance record.
- Downloadable copy.
- Contact/legal escalation.

Overall rating: 5/10.

### `/affiliate/apply`

Purpose: redirect legacy/direct affiliate application route to public affiliate program page.

Screenshot: not applicable beyond redirect behavior.

Current functionality:

- Redirects to `/partners/affiliate-program#affiliate-application`.

Current UI:

- None.

Components used:

- None.

Backend/API calls:

- None.

Database tables:

- None.

Current limitations:

- No affiliate-specific application page under `/affiliate`.
- No tracking of redirect source.

Bugs found:

- None.

UX observations:

- The redirect is simple and likely useful.

Missing features:

- Application status lookup.
- Returning applicant pathway.

Overall rating: 4/10.

## Sidebar Audit

There is no affiliate dashboard sidebar today. The global affiliate portal header exposes a top navigation with Dashboard, Resources, Guides, and Payouts. On small screens, this nav is hidden and no equivalent mobile portal nav was found.

| Requested Item | Current Destination | Existing Functionality | Missing Functionality | Quality | Recommendation |
|---|---|---|---|---:|---|
| Home | Closest: `/affiliate/dashboard` | Main dashboard exists | No `/affiliate` home route; no sidebar item labelled Home | 5/10 | Make Dashboard/Home destination explicit in redesign |
| Performance | None | Admin analytics exist elsewhere | Affiliate-facing clicks, visitors, campaign performance, conversion funnel | 1/10 | Build as first-class analytics screen |
| Reservations | None | Booking attribution exists in backend/admin | Affiliate-visible attributed booking/reservation list | 1/10 | Build reservation activity screen |
| Commissions | Partial on dashboard/payout rows | Commission rate and payout items visible | Per-booking commission lifecycle, pending/approved/void reasons | 3/10 | Separate from payouts |
| Payouts | `/affiliate/dashboard#payout-history` | Payout table exists | Anchor target missing; no payout detail, filters, export, payment profile history | 4/10 | Create dedicated payout screen |
| Marketing Tools | Partial: `/affiliate/resources` and `/affiliate/guides` | Scripts, links, banners | QR codes, asset previews, saved campaigns, link history | 6/10 | Consolidate resources/guides into marketing tools |
| Resources | `/affiliate/resources` | Good toolkit | Search, categories, asset tracking | 7/10 | Keep and expand |
| Settings | Partial on dashboard | Payout email only | Profile, password, payment preferences, notifications, security | 2/10 | Build dedicated settings |
| Help | None | FAQ inside guides; contact links elsewhere | Affiliate support center, ticket/contact path, escalation | 2/10 | Add help/support route |

## Home Dashboard Widget Audit

### Welcome / Hero Section

Purpose: orient affiliate and surface referral link.

Current functionality: displays affiliate name, status, tier, referral link, copy button, and actions.

Data source: `affiliates`.

Backend endpoint: server-rendered via `getAffiliateForUser`.

Database tables: `affiliates`, `profiles`, `affiliate_applications` for self-heal.

Calculations: referral URL built from environment/site URL and slug.

Refresh behavior: full page refresh.

Loading state: none; server render only.

Empty state: profile-not-found fallback.

Error state: mostly redirects or profile-not-found card.

Permissions: authenticated affiliate/admin.

Responsive behavior: wraps actions; header nav hidden on mobile.

Quality rating: 7/10.

Recommendations: keep referral link as primary asset; add clear link health, copy count, last click, and campaign link entry points.

### Total Earnings

Current status: not present as a distinct widget.

Recommendation: add lifetime earned/paid/pending model in redesign.

Quality rating: 1/10.

### Pending Commissions / Pending Owed

Purpose: show unpaid scheduled/pending amount.

Current functionality: sums `affiliate_payout_items.amount_usd` where status is `pending` or `scheduled`.

Data source: `affiliate_payout_items`.

Backend endpoint: server-rendered via `getAffiliatePayoutSummary`.

Database tables: `affiliate_payout_items`.

Calculations: simple sum in application code.

Refresh behavior: full page refresh.

Loading state: none.

Empty state: `$0.00`.

Error state: no explicit error UI.

Permissions: RLS through authenticated affiliate or admin/service fallback elsewhere.

Responsive behavior: card grid.

Quality rating: 5/10.

Recommendations: distinguish pending commission, approved commission, scheduled payout, and paid payout.

### Confirmed Reservations

Current status: not present.

Related backend: booking attribution and conversion infrastructure exists.

Quality rating: 1/10.

Recommendation: create attributed reservation widget.

### Paid This Month

Current status: not present.

Closest current widget: Last Paid.

Quality rating: 2/10.

Recommendation: add date-range-aware paid amount.

### Last Paid

Purpose: show most recent paid payout amount.

Current functionality: latest `affiliate_payout_items` row with status `paid`, ordered by `paid_at` then `created_at`.

Data source: `affiliate_payout_items`.

Backend endpoint: server-rendered via `getAffiliatePayoutSummary`.

Calculations: latest row selection.

Refresh behavior: page reload.

Loading state: none.

Empty state: `$0.00`, “No payouts yet”.

Error state: no explicit error UI.

Permissions: authenticated affiliate/admin.

Responsive behavior: card grid.

Quality rating: 5/10.

Recommendations: show method/reference only where safe, period covered, and payout status history.

### Average Payout

Purpose: average payout record value.

Current functionality: sum of all loaded payout amounts divided by loaded payout count.

Data source: first 24 `affiliate_payout_items`.

Backend endpoint: `getAffiliatePayoutHistory`.

Calculations: client/server page calculation over returned items.

Refresh behavior: page reload.

Loading state: none.

Empty state: `$0.00`.

Error state: none.

Permissions: authenticated affiliate/admin.

Responsive behavior: card grid.

Quality rating: 4/10.

Recommendations: clarify whether average is all payout records, paid payouts only, or recent 24 records.

### Charts

Current status: not present.

Related backend: admin affiliate analytics supports daily trends and breakdowns.

Quality rating: 1/10.

Recommendation: add clicks, booking requests, conversions, commissions trends.

### Recent Reservations

Current status: not present.

Related backend: admin detail analytics returns `recentBookingActivity`, but affiliate dashboard does not use it.

Quality rating: 1/10.

Recommendation: expose safe affiliate-visible attributed bookings.

### Earnings Activity

Purpose: small recent earnings feed.

Current functionality: shows last six payout records reversed from the latest 24.

Data source: `affiliate_payout_items` with nested `affiliate_payout_runs`.

Backend endpoint: `getAffiliatePayoutHistory`.

Database tables: `affiliate_payout_items`, `affiliate_payout_runs`.

Calculations: formats amount/status/date/bookings.

Refresh behavior: page reload.

Loading state: none.

Empty state: getting-started card and referral link button.

Error state: none.

Permissions: authenticated affiliate/admin.

Responsive behavior: stacked cards.

Quality rating: 6/10.

Recommendations: label it “Recent Payout Activity” or add true event feed including click/request/conversion milestones.

### Payout Email

Purpose: collect PayPal/Wise payout destination email.

Current functionality: POST update to affiliate row.

Data source: `affiliates.payout_email`.

Backend endpoint: `POST /api/affiliate/payout-email`.

Database tables: `affiliates`.

Calculations: none.

Refresh behavior: local success/error state; no page reload.

Loading state: button text changes to “Saving…”.

Empty state: blank input.

Error state: generic “Unable to update payout email.”

Permissions: authenticated affiliate; route verifies affiliate by `auth_user_id`.

Responsive behavior: form card.

Quality rating: 6/10.

Recommendations: add verification status, explain PayPal/Wise rules, validate null/empty intentionally, and move to Settings.

### Commission Tier

Purpose: explain current commission rate, status, and tier.

Current functionality: shows rate, status chip, tier, payout schedule copy, tier-specific messaging.

Data source: `affiliates`.

Backend endpoint: server-rendered dashboard.

Calculations: `commissionRate * 100`.

Refresh behavior: page reload.

Loading state: none.

Empty state: no affiliate fallback.

Error state: no dedicated error.

Permissions: authenticated affiliate/admin.

Responsive behavior: form side card.

Quality rating: 6/10.

Recommendations: show what unlocks next tier and define tier benefits without implying unavailable benefits.

### Payout History

Purpose: table of payout records.

Current functionality: lists period, booking count, amount, status, paid date for latest 24 payout items.

Data source: `affiliate_payout_items` plus `affiliate_payout_runs`.

Backend endpoint: `getAffiliatePayoutHistory`.

Calculations: formats period from payout run when available.

Refresh behavior: page reload.

Loading state: none.

Empty state: “No payouts yet.”

Error state: none.

Permissions: authenticated affiliate/admin.

Responsive behavior: table inside overflow container.

Quality rating: 5/10.

Recommendations: add filters, export, payout references, booking drilldowns, and fix missing `#payout-history` anchor.

### Notifications

Current status: not present.

Quality rating: 1/10.

Recommendation: add affiliate-specific notifications for first referral, booking request, conversion approved, payout scheduled, payout paid, policy updates.

### Quick Actions

Purpose: direct affiliate to core actions.

Current functionality: Resources, Guides, Share Your Link.

Data source: affiliate slug.

Quality rating: 5/10.

Recommendations: include create campaign link, download assets, view reservations, contact support, update payout details.

## Feature Inventory

| Feature | Description | How It Works | Dependencies | Limitations | Priority |
|---|---|---|---|---|---|
| Affiliate login | Authenticates approved affiliate | Supabase password auth | Supabase auth, `affiliates` | No MFA, redirect bug | High |
| Password reset | Neutral reset flow for approved affiliates | API checks affiliate status then Supabase reset email | `affiliates`, Supabase auth | Generic status only | High |
| Dashboard access control | Protects dashboard | role/profile + affiliate status checks | `profiles`, `affiliates`, service/admin fallback | Logic differs by page | High |
| Application self-heal | Creates/links affiliate from eligible application | Admin client reads applications and inserts/updates affiliates | `affiliate_applications`, `affiliates` | Hidden behavior, many fallbacks | Medium |
| Referral link display | Shows canonical referral link | `/go/{slug}` from site URL | `affiliates.slug` | No link health/click stats | High |
| Copy referral link | Clipboard copy | Browser clipboard | Client API | No fallback in dashboard button audit unknown | Medium |
| Toolkit scripts | Provides share copy | Hardcoded arrays | Client component | Not content-managed | Medium |
| Tracked links | Builds `/go/{slug}?to=` links | `buildAffiliateReferralUrl` | `affiliate-referrals` | Limited UTM support | High |
| Advanced link builder | Builds tracked public URLs | Client URL validation | Public site URL env | No saved campaigns | Medium |
| Downloadable assets | Links SVG banners | Static assets | `public/affiliate-kit` | No previews/metrics | Medium |
| Tracking rules education | Explains 90-day first-touch tracking | Static copy | None | Not linked to actual analytics | Medium |
| Payout email update | Saves PayPal/Wise email | API update | `affiliates.payout_email` | Minimal validation/status | High |
| Payout summary | Pending/last paid/average | Server Supabase queries | `affiliate_payout_items` | No error/loading states | High |
| Payout history | Table of payout items | Server Supabase query | `affiliate_payout_items`, `affiliate_payout_runs` | No filters/export/drilldown | High |
| Agreement page | Static agreement | Static route | None | No version/acceptance | Medium |
| Click tracking | Captures `?ref=` pages | `AffiliateTracker` posts to API | cookies, analytics session, `affiliate_clicks` | Not visible to affiliate | High |
| Referral redirect | `/go/[slug]` redirects to target with `?ref=` | RPC `resolve_affiliate` | `affiliates`, RPC | Click captured only after landing tracker runs | High |
| Conversion engine | Creates affiliate conversions after eligibility | Server-side conversion service/admin APIs | booking requests, rentals, conversions | Not visible to affiliate | High |
| Admin affiliate analytics | Admin overview/detail analytics | `affiliate-analytics.ts` | clicks, sessions, pageviews, requests, conversions, payouts | Admin-only | Medium |

## Backend Audit

### Affiliate-Facing Routes and APIs

| File | Purpose | Auth | Tables/Services |
|---|---|---|---|
| `src/app/affiliate/dashboard/page.tsx` | Main dashboard server page | Supabase user + affiliate/admin logic | `profiles`, `affiliates`, `affiliate_applications`, `affiliate_payout_items`, `affiliate_payout_runs` |
| `src/app/affiliate/resources/page.tsx` | Toolkit server gate | `requireAffiliateUser` | `profiles`, `affiliates` |
| `src/app/affiliate/guides/page.tsx` | Guides server gate | `requireAffiliateUser` | `profiles`, `affiliates` |
| `src/app/affiliate/login/page.tsx` | Login shell | public | Supabase client in child |
| `src/app/affiliate/agreement/page.tsx` | Static agreement | public | none |
| `src/app/affiliate/apply/page.tsx` | Redirect to application | public | none |
| `src/app/api/affiliate/payout-email/route.ts` | Update payout email | Supabase user + affiliate lookup | `affiliates` |
| `src/app/api/affiliate/password-reset/route.ts` | Send affiliate reset email | public-neutral | `affiliates`, Supabase auth |
| `src/app/api/affiliate/account/route.ts` | Application/account lookup/link support | service role, optional user | `affiliate_applications` |
| `src/app/api/affiliate/apply/route.ts` | Submit application | service role | `affiliate_applications` |
| `src/app/api/affiliates/track/route.ts` | Record click attribution and cookies | public | `affiliate_clicks`, `visitor_sessions` |
| `src/app/go/[slug]/route.ts` | Referral redirect | public RPC | `resolve_affiliate` |

### Admin/Operational Affiliate Backend

| File/Area | Purpose | Dashboard Exposure |
|---|---|---|
| `src/lib/affiliate-analytics.ts` | Admin affiliate analytics and detail reports | Not affiliate-facing |
| `src/lib/affiliate-conversions.ts` | Conversion eligibility and commission creation | Not affiliate-facing |
| `src/app/api/admin/affiliates/*` | Admin affiliate, conversion, payout management | Not affiliate-facing |
| `src/app/admin/affiliates/*` | Admin affiliate UI | Not affiliate-facing |
| `src/lib/booking-attribution.ts` | Attaches referral attribution to booking requests | Indirect only |
| `src/lib/affiliate-attribution.ts` | Records affiliate click and visitor session | Indirect only |

### Server Actions

No affiliate-specific server actions were found for the affiliate dashboard. The portal uses server components and API routes.

### Supabase Queries

Primary direct queries:

- `affiliates.select(...)` by `auth_user_id`.
- `affiliates.select(...)` by `email`.
- `affiliate_applications.select(...)` by `auth_user_id` or `email`.
- `affiliate_applications.update({ auth_user_id })`.
- `affiliates.insert(...)` for self-heal onboarding.
- `affiliates.update({ status: "active" })` for pending-review activation.
- `affiliate_payout_items.select("amount_usd")` for pending owed.
- `affiliate_payout_items.select("amount_usd, paid_at, created_at")` for last paid.
- `affiliate_payout_items.select(...payout_run...)` for payout history.
- `rpc("resolve_affiliate")` for tracking and redirect.

### External APIs

- Supabase Auth.
- Clipboard API in browser.
- No Stripe/PayPal/Wise payout API integration in affiliate dashboard.
- No email vendor integration directly in affiliate dashboard; password reset uses Supabase auth email.

### Realtime, Cron, Background Jobs

- No affiliate-facing realtime subscriptions found.
- No affiliate-facing cron job found.
- Payouts are described as manually processed.
- Admin payout run generation exists as an admin API flow, not a background job.

## Database Audit

### `affiliates`

Purpose: affiliate identity, status, slug, commission rate, payout email, onboarding metadata.

Primary fields:

- `id`
- `auth_user_id`
- `slug`
- `referral_code`
- `display_name`
- `email`
- `status`
- `tier`
- `commission_rate`
- `payout_email`
- `website`
- `social_links`
- `promotion_description`
- `traffic_estimate`
- `review_notes`
- `suspend_reason`
- timestamps

Relationships:

- `auth.users` through `auth_user_id`.
- Referenced by clicks, leads, conversions, payout items.

Current usage:

- Dashboard profile.
- Referral link.
- Access control.
- Payout email updates.
- Commission tier display.

Unused/underused fields in affiliate portal:

- `website`
- `social_links`
- `traffic_estimate`
- `promotion_description`
- `review_notes`
- `suspend_reason`

Potential issues:

- Status enum evolved from `active/paused/closed` to include `pending_review/verified/suspended/rejected`; code accepts `approved` even though enum history does not clearly show it as an enum value.
- Commission tiers and rate semantics are not fully surfaced to affiliates.

### `affiliate_clicks`

Purpose: store referral clicks and attribution metadata.

Primary fields:

- `id`
- `affiliate_id`
- `click_id`
- `clicked_at`
- `landing_path`
- `referrer`
- `user_agent`
- `visitor_session_row_id`
- `visitor_session_id`
- `visitor_id`
- UTM fields

Current usage:

- Written by `/api/affiliates/track`.
- Used by admin analytics.
- Not shown in affiliate portal.

Potential issues:

- `click_id` originally uuid; API normalizes to text and upserts. Verify deployed column type compatibility.
- Clicks are hidden from affiliates, limiting dashboard usefulness.

### `affiliate_leads`

Purpose: legacy/initial affiliate lead records tied to booking requests.

Primary fields:

- `affiliate_id`
- `click_id`
- `booking_request_id`
- `lead_status`
- `attribution_type`

Current usage:

- Legacy attribution path.
- Not shown in dashboard.

Potential issues:

- Newer booking request attribution columns and conversion engine may supersede some lead behavior.

### `affiliate_conversions`

Purpose: conversion records for payable/approved affiliate bookings.

Primary fields:

- `affiliate_id`
- `booking_request_id`
- `status`
- `booking_amount_usd`
- `commission_rate`
- `commission_amount_usd`
- `confirmed_at`
- `payout_run_id`
- review/void audit fields
- source/rental/eligibility fields

Current usage:

- Admin conversion review and payout generation.
- Not shown directly to affiliates.

Potential issues:

- Affiliate cannot see pending/approved/void conversion explanations.
- Commission amount is numeric dollars; dashboard also displays payout item amount, which can diverge after adjustments.

### `affiliate_payout_runs`

Purpose: payout period batches.

Primary fields:

- `period_start`
- `period_end`
- `status`
- `created_by`
- `reviewed_by`
- `paid_by`
- `payment_method`
- `payment_reference`
- `paid_at`
- audit/void fields

Current usage:

- Nested in payout history display.
- Admin payout workflow.

Potential issues:

- Portal only shows period/status through payout items; no payout run detail page.

### `affiliate_payout_items`

Purpose: affiliate-specific payout line items.

Primary fields:

- `payout_run_id`
- `affiliate_id`
- `conversion_id`
- `booking_request_id`
- `booking_request_ids`
- `amount_usd`
- `booking_count`
- `status`
- `paid_at`
- `payout_reference`
- booking/commission/audit/payment fields

Current usage:

- Main dashboard earnings summaries and history.

Potential issues:

- Dashboard does not expose `conversion_id`, `booking_request_id`, `payment_method`, `payment_reference`, adjustments, voids, or reason fields.
- `booking_request_ids` and `booking_request_id` both exist; product model needs clarification in redesign.

### `affiliate_applications`

Purpose: affiliate application inbox and onboarding source.

Primary fields:

- `status`
- applicant identity/contact fields
- `display_name`
- `email`
- `website`
- `social_links`
- `traffic_estimate`
- `promotion_description`
- `admin_notes`
- `auth_user_id`
- accepted/approved/rejected timestamps

Current usage:

- Application submission.
- Dashboard self-heal and account linking.
- Admin application review.

Potential issues:

- Public API insert uses newer simplified fields; historical schema also contains required legacy fields. Confirm migrations/defaults make inserts safe in all environments.

### `booking_requests`

Purpose: guest booking requests; now carries affiliate attribution.

Primary affiliate fields:

- `affiliate_id`
- `affiliate_click_id`
- `visitor_session_row_id`
- `visitor_session_id`
- `visitor_id`
- `attribution_source`
- referral UTM fields

Current usage:

- Affiliate conversion engine and admin analytics.
- Not affiliate-facing.

Potential issues:

- Affiliates cannot self-audit attributed booking requests.

### `visitor_sessions` and Analytics Tables

Purpose: visitor/session analytics link for attribution.

Current usage:

- `affiliate-attribution.ts` links clicks to visitor sessions.
- Admin analytics use sessions and pageviews.

Current dashboard usage:

- None.

## UX Audit

### What Works Well

- Clear affiliate login entry.
- Referral link is prominent.
- Resources page gives useful scripts and tracked links.
- Guides page includes good compliance boundaries.
- Payout email can be updated without leaving dashboard.
- Dark portal treatment differentiates affiliate space.
- Core auth checks exist.

### What Feels Confusing

- Dashboard does not show actual performance despite being called a dashboard.
- Resources and Guides overlap heavily.
- “Payouts” nav anchor appears broken.
- `/affiliate` is allowed by login redirect but no page exists.
- “Share Your Link” uses `/calculator?ref=slug` while toolkit uses `/go/slug`.
- Affiliates cannot see whether their link is working.
- Commission status is not explained across lead/request/conversion/payout lifecycle.

### Information Hierarchy Issues

- Referral link and actions dominate, while revenue/performance context is shallow.
- Payout table appears after a recent activity section that uses the same source.
- Tier/rate is separated from actual commission history.
- Educational resources are spread across two pages with similar content.

### Spacing/UI Issues

- Some dark cards use muted slate text that may be too low contrast.
- Tables are not ideal for mobile.
- Top nav is hidden on mobile.
- Dashboard cards are visually consistent but not strongly prioritized.

### Navigation Issues

- No sidebar.
- No mobile affiliate navigation.
- Missing standalone pages for Performance, Reservations, Commissions, Settings, Help.
- Payouts link target missing.
- No breadcrumb except Guides back link.

### Accessibility Issues

- Potential contrast issues with `text-slate-500`/muted text on dark backgrounds.
- Clipboard success messages may not be announced to screen readers.
- Some iconless/visual button states rely on text only; acceptable but not rich.
- Table accessibility needs browser QA.
- Mobile hidden nav may trap users in deep pages.

### Mobile Issues

- Header nav disappears on mobile.
- Payout history table likely requires horizontal scroll.
- Resources has mobile section selector, which is good.
- Dashboard has no mobile-specific action/nav strategy.

### Performance Concerns

- Dashboard payout history loads latest 24; currently fine.
- Admin analytics service can load large datasets but is not affiliate-facing.
- No caching strategy for affiliate dashboard.
- No pagination on affiliate payout history.
- No incremental loading or skeleton states.

## Missing Features

High-priority missing features:

- Affiliate performance overview.
- Clicks, unique visitors, booking requests, conversions.
- Date range filters.
- Campaign/source breakdown.
- Reservation/booking activity list.
- Commission lifecycle.
- Payout detail page.
- Search/filter/sort/export.
- Mobile portal navigation.
- Settings page.
- Help/support page.
- Notifications.
- QR code generation.
- Saved campaigns.
- Marketing asset previews.
- Link history and link management.
- Tax/payment profile readiness.
- Agreement acceptance/versioning.
- Application status view.
- Affiliate onboarding checklist.
- Conversion dispute/support flow.
- Audit/history of payout adjustments.

Medium-priority missing features:

- Benchmarking/rank/tier progress.
- Custom UTM builder.
- Social platform presets.
- Copy approval/version tracking.
- Webhook/email notifications.
- CSV export.
- Download all assets.
- Last updated timestamps.
- Empty-state education per widget.

## Technical Debt

Duplicated or fragmented logic:

- Dashboard uses custom affiliate gating; Resources/Guides use `requireAffiliateUser`.
- Resources and Guides duplicate positioning/copy/link-generation concepts.
- Referral links sometimes use `/go/{slug}` and sometimes direct `?ref=slug`.
- Legacy `affiliate_payouts` and newer payout run/item model coexist.
- Legacy lead/trigger model and newer conversion engine coexist.

Unused or incomplete pieces:

- `/affiliate` has layout but no index page.
- `/affiliate/dashboard#payout-history` link has no matching id.
- `cookieStore` in payout email route is unused.
- Admin analytics detail can power affiliate dashboard but is not exposed.
- Many application/profile fields are collected but not visible to affiliates.

Hardcoded values:

- Script library, guide copy, tracking rules, FAQ content.
- Commission rule copy says 6-8% generally.
- Localhost URL allowances in resource advanced link builder.
- Manual payout language.

Missing validation:

- Payout email accepts any email-shaped input client-side but server only trims string/null.
- Application API has simplified validation but may not satisfy old required fields in all DB states.
- No campaign tag format validation.

Temporary/manual implementations:

- Payouts are manually processed.
- No production-grade affiliate-facing analytics workflow.
- Application self-heal has several compatibility fallbacks.

## Security Audit

Authentication:

- Affiliate portal requires Supabase user auth for dashboard/resources/guides.
- Login uses Supabase password auth.
- Password reset uses neutral response to prevent account enumeration.

Authorization:

- `requireAffiliateUser` checks admin role or active affiliate record.
- Dashboard custom logic checks role and affiliate status.
- Admin APIs require admin email.

RLS:

- `affiliates`, `affiliate_clicks`, `affiliate_leads`, `affiliate_conversions`, `affiliate_payouts`, `affiliate_payout_runs`, `affiliate_payout_items`, and `affiliate_applications` have RLS enabled in migrations.
- Affiliates can read their own profile/clicks/leads/conversions/payouts where policies exist.
- Admin can manage affiliate objects.

Data exposure:

- Affiliate dashboard exposes payout amounts, status, affiliate tier/rate, payout email.
- Dashboard does not expose booking guest PII.
- Click tracking stores user agent/referrer/UTM/visitor identifiers.

Potential vulnerabilities or risks:

- `POST /api/affiliate/account` returns raw Supabase error messages for some errors.
- `POST /api/affiliate/payout-email` returns raw Supabase error message on update failure.
- Dashboard uses service role fallback through helper for affiliate lookup/self-heal. This is server-only but should be kept tightly audited.
- Inconsistent affiliate access logic may cause status-handling drift.
- Public application API returns raw DB errors.
- Affiliate guide slug input can produce links for arbitrary slugs; not a security issue by itself, but product confusion.
- No visible rate limiting on affiliate application, account lookup, password reset, or tracking endpoints from inspected files.

## Performance Audit

Current affiliate portal performance:

- Dashboard queries are small and bounded.
- Payout history limited to 24 records.
- Resources and Guides are mostly static client-rendered content.
- Clipboard interactions are local.

Potential issues:

- No loading skeletons for server-rendered dashboard during navigation.
- No pagination for payout history.
- Payout summary and history make separate queries to `affiliate_payout_items`.
- Admin analytics backend loads multiple datasets and may not scale without pagination/windowing if reused for affiliates.
- AffiliateTracker fires client-side fetch on every new `ref` per sessionStorage key; acceptable but should be monitored.

Caching opportunities:

- Static guide/resource copy can be cached or content-managed.
- Affiliate dashboard should remain user-specific/no-store.
- Marketing assets can be CDN cached.

Client/server boundaries:

- Sensitive affiliate lookup and payout queries are server-side.
- Clipboard and link generation run client-side.
- No service-role client is exposed to browser.

## Final Scorecard

| Area | Score /10 | Notes |
|---|---:|---|
| UI | 6 | Clean dark styling, but hierarchy and mobile nav need work |
| UX | 5 | Useful basics, but not yet a dashboard-quality workflow |
| Features | 4 | Referral link/resources/payouts only; performance and reservations absent |
| Backend | 7 | Solid attribution/conversion/payout foundation exists |
| Database | 7 | Broad schema exists, but legacy/new models need product consolidation |
| Performance | 6 | Current portal is light; future analytics will need care |
| Security | 6 | Good RLS/auth baseline; raw errors/rate limits/access drift need review |
| Mobile | 4 | Header nav hidden; tables and dashboard need mobile strategy |
| Scalability | 5 | Backend can grow, affiliate UI is not yet scalable |
| Overall | 5 | Functional MVP portal, not redesign-ready as-is without major product expansion |

## KEEP

- Protected affiliate dashboard route.
- Prominent referral link card.
- `/go/{slug}` referral link strategy.
- 90-day first-touch tracking concept.
- Payout email update.
- Basic payout summary and history.
- Resources page script library.
- Advanced public-link generator restrictions.
- Guides page compliance messaging.
- Neutral password reset response.
- RLS policies for affiliate-owned data.
- Admin-side affiliate analytics/conversion/payout infrastructure.

## IMPROVE

- Unify affiliate access control.
- Fix payout history anchor.
- Add mobile navigation.
- Clarify Resources vs Guides.
- Improve contrast in dark portal cards.
- Clarify payout terminology.
- Add loading/error/empty states.
- Improve payout email validation and messaging.
- Normalize referral-link strategy across dashboard/resources/guides.
- Add date ranges and refresh timestamps.
- Add safe error sanitization to affiliate APIs.
- Add rate limiting to public/affiliate-sensitive endpoints.
- Connect existing admin analytics to affiliate-facing summaries.

## REBUILD

- Dashboard information architecture.
- Sidebar/navigation model.
- Performance analytics screen.
- Reservations/booking activity screen.
- Commissions lifecycle screen.
- Payouts detail/history/export workflow.
- Settings area.
- Help/support center.
- Marketing tools as a unified content/link/asset workspace.
- Notification model.
- Application status/onboarding journey.
- Legal agreement acceptance/versioning flow.

## Recommended Redesign Priorities

1. Define the affiliate lifecycle model affiliates should see: click, visitor, booking request, confirmed conversion, approved commission, scheduled payout, paid payout.
2. Build a real dashboard around performance and money, not only referral link plus payout rows.
3. Introduce a durable navigation model with mobile parity.
4. Reuse admin analytics data carefully, but expose only affiliate-owned safe fields.
5. Separate Commissions from Payouts.
6. Consolidate Resources and Guides into Marketing Tools plus Help.
7. Add export/search/filter/date-range primitives early.
8. Resolve legacy/new affiliate payout and conversion terminology before UI redesign.

