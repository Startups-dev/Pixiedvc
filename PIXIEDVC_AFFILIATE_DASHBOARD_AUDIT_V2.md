# PixieDVC Affiliate Dashboard Audit V2

Audit date: 2026-07-18
Scope: current affiliate-facing portal, directly related public referral/application flows, admin affiliate operations, attribution/conversion/payout backend, and reusable analytics infrastructure.
Source baseline: this document expands `PIXIEDVC_AFFILIATE_DASHBOARD_AUDIT.md`. It preserves the V1 findings and extends them into a build-ready engineering/product blueprint.

No code was modified for this audit.

## Executive Summary

The current affiliate dashboard is an MVP portal, not yet a full affiliate operating system. It gives affiliates:

- access to the portal after login;
- a canonical referral link;
- quick links to Resources and Guides;
- payout email management;
- simple payout summary cards;
- recent payout activity;
- payout history.

The backend is significantly more advanced than the affiliate-facing UI. The system already has canonical infrastructure for:

- referral redirects through `/go/{slug}`;
- backwards-compatible `/r/{slug}` redirects;
- affiliate click capture;
- first-party visitor sessions and pageviews;
- booking request attribution;
- conversion creation after eligible booking confirmation;
- payout run and payout item audit ledger;
- admin affiliate analytics;
- admin conversion review;
- admin payout review/mark-paid/adjustment/void flows.

The largest product gap is that affiliates cannot see the most important performance signals already captured by the backend: clicks, visitors, booking requests, conversions, booking value, commission earned, attribution sources, and commission lifecycle.

The redesign should reuse most backend infrastructure and rebuild the affiliate-facing information architecture.

## Current Affiliate System Map

```text
Public Partner Program
  /partners/affiliate-program
    └─ POST /api/affiliate/apply
    └─ POST /api/affiliate/account

Affiliate Auth
  /affiliate/login
    └─ Supabase signInWithPassword
    └─ POST /api/affiliate/password-reset

Affiliate Portal
  /affiliate/dashboard
  /affiliate/resources
  /affiliate/guides
  /affiliate/agreement
  /affiliate/apply -> /partners/affiliate-program#affiliate-application

Referral Runtime
  /go/[slug] -> destination with ?ref={slug}
  /r/[slug] -> 308 /go/[slug]
  AffiliateTracker -> POST /api/affiliates/track
  ReferralCapture -> browser referral cookie

Backend Attribution Chain
  affiliates
  affiliate_clicks
  visitor_sessions
  visitor_pageviews
  booking_requests attribution fields
  affiliate_leads legacy fallback
  affiliate_conversions
  affiliate_payout_runs
  affiliate_payout_items

Admin Operations
  /admin/affiliates
  /admin/affiliates/applications
  /admin/affiliates/payouts
  /admin/affiliates/[affiliateId]/analytics
  /admin/analytics?tab=affiliates
```

## 1. Screen Inventory

Screenshot paths below are recommended capture locations for a redesign packet. Screenshots were not generated during this code-only audit.

### 1.1 `/affiliate/dashboard`

Route: `/affiliate/dashboard`
Screenshot location: `/private/tmp/affiliate-dashboard-v2/dashboard.png`
Purpose: main affiliate portal home.

Components:

- server page `src/app/affiliate/dashboard/page.tsx`
- `AffiliatePortalHeader` via shared internal header usage where applicable
- design-system `Card`
- design-system `Button`
- `CopyReferralLinkButton`
- `AffiliatePayoutEmailForm`
- affiliate theme classes from `src/lib/affiliate-theme.ts`

User actions:

- copy referral link;
- open Resources;
- open Guides;
- share direct calculator link;
- update payout email;
- read payout history.

Data displayed:

- affiliate display name;
- affiliate status;
- affiliate tier;
- referral URL;
- pending owed;
- last paid amount/date;
- average payout;
- recent payout activity;
- payout email;
- commission rate/status/tier;
- payout history rows.

Data source:

- `auth.users` through Supabase auth;
- `profiles.role`;
- `affiliates`;
- `affiliate_applications` through self-heal helper;
- `affiliate_payout_items`;
- `affiliate_payout_runs`.

Loading state:

- none inside the page; server-rendered.

Empty state:

- no earnings: getting-started card with referral link copy and Guides CTA;
- no payout history: “No payouts yet.”;
- no affiliate record: “Profile not found” fallback card.

Error state:

- unauthenticated redirect to `/affiliate/login?redirect=/affiliate/dashboard`;
- non-affiliate redirect to `/affiliate/login?...&error=role`;
- hard-blocked affiliate redirect to login role error;
- missing affiliate fallback card;
- payout email form shows generic error.

Mobile behavior:

- content cards stack;
- top action buttons wrap;
- payout history table uses horizontal overflow;
- portal navigation is hidden on mobile in `AffiliatePortalHeader` with no equivalent mobile nav.

Accessibility notes:

- referral copy button has text but no live announcement;
- payout form status messages are visible but not announced via `aria-live`;
- table is semantic;
- several portal theme text colors are low-contrast (`text-slate-500`/`text-slate-600` on dark surfaces elsewhere);
- missing `id="payout-history"` despite header link.

Known issues:

- Dashboard is payout-oriented and does not show clicks, visitors, booking requests, conversions, traffic sources, campaign performance, reservation activity, or commission lifecycle.
- `AffiliatePortalHeader` links to `/affiliate/dashboard#payout-history`, but the payout history section has no matching id.
- Dashboard custom access logic differs from `requireAffiliateUser()` used by Resources/Guides.
- Average payout uses the latest 24 payout items, not lifetime average.

Recommendation: 🟡 Improve / partially rebuild. Keep referral link and payout primitives; rebuild dashboard data model and navigation.

### 1.2 `/affiliate/resources`

Route: `/affiliate/resources`
Screenshot location: `/private/tmp/affiliate-dashboard-v2/resources.png`
Purpose: affiliate toolkit for scripts, share links, campaign tags, and tracking rules.

Components:

- server page `src/app/affiliate/resources/page.tsx`
- client component `AffiliateResourcesClient`
- design-system `Card`
- design-system `Button`
- affiliate theme classes.

User actions:

- copy canonical referral link;
- open dashboard;
- switch script tabs;
- copy scripts;
- toggle auto-append referral link to scripts;
- copy quick links;
- enter campaign tag;
- generate advanced tracked link to public PixieDVC pages;
- use mobile section selector;
- read tracking rules.

Data displayed:

- affiliate display name;
- affiliate tier;
- commission rate;
- canonical referral URL;
- positioning copy;
- script library;
- quick public links;
- advanced generated link;
- tracking rules.

Data source:

- server `requireAffiliateUser()`;
- `getAffiliateForUser()`;
- `affiliates`;
- `getReferralBaseUrl()`;
- hardcoded client arrays: `SCRIPTS`, `TRACKING_RULES`, `TAB_LABELS`.

Loading state:

- none; mostly static after server gate.

Empty state:

- missing slug: warning card “Your referral link isn’t configured yet.”

Error state:

- invalid advanced URL: inline validation message;
- missing slug/origin: inline error.

Mobile behavior:

- mobile section selector scrolls to section ids;
- desktop sticky section nav hidden on mobile;
- grids collapse.

Accessibility notes:

- `<select>` has visible label;
- details/summary are keyboard-accessible;
- clipboard status is visual only;
- dark page has repeated low-contrast `text-slate-500` headings.

Known issues:

- Script copy says “6–8% of PixieDVC net rental revenue,” while public landing page and admin models now use service-revenue language. This is a product/legal consistency issue.
- Advanced link builder allows localhost origins in non-production only; that is useful but should be explicitly documented.
- Resources overlaps heavily with Guides.

Recommendation: 🟡 Improve. Keep link builder concepts, merge with Guides into Marketing Tools in redesign.

### 1.3 `/affiliate/guides`

Route: `/affiliate/guides`
Screenshot location: `/private/tmp/affiliate-dashboard-v2/guides.png`
Purpose: education, compliant messaging, ready-to-copy content, link examples, and FAQ.

Components:

- server page `src/app/affiliate/guides/page.tsx`
- client component `AffiliateGuidesClient`
- design-system `Card`
- affiliate theme classes.

User actions:

- return to dashboard;
- edit displayed affiliate slug locally;
- copy Home/Calculator/Plan links;
- copy pitch blocks;
- copy website/email/Instagram snippets;
- download static SVG banners;
- read FAQ.

Data displayed:

- affiliate slug;
- generated `/go/{slug}` links;
- messaging blocks;
- talking points;
- decision links;
- CTA suggestions;
- snippets;
- downloadable asset links;
- payout guidance;
- “what not to promise” guardrails;
- affiliate FAQ.

Data source:

- server `requireAffiliateUser()`;
- `getAffiliateForUser()`;
- `affiliates.slug`;
- hardcoded arrays in `AffiliateGuidesClient`.

Loading state:

- `Suspense fallback={null}` around client component; no visible skeleton.

Empty state:

- empty slug field can still render non-tracked links.

Error state:

- clipboard copy error message only.

Mobile behavior:

- single-column stacking;
- no internal nav.

Accessibility notes:

- copy buttons are text-based;
- lack of live copy announcement;
- editable slug field can confuse screen-reader/user expectations because it looks like a real setting but only changes local generated links.

Known issues:

- The page lets affiliates type arbitrary slugs, producing links that may not belong to them.
- Several headings explicitly style `text-slate-500` on dark background.
- FAQ says qualified bookings are “confirmed requests (status: confirmed),” while the canonical conversion engine now uses stricter eligibility rules.
- “Set payout email in the affiliate dashboard” is not linked to a working anchor.

Recommendation: 🟡 Improve / merge. Good source material, but should become content-managed Marketing Tools + Help.

### 1.4 `/affiliate/login`

Route: `/affiliate/login`
Screenshot location: `/private/tmp/affiliate-dashboard-v2/login.png`
Purpose: affiliate-only email/password login, reset, password update, and confirmation-state handling.

Components:

- page shell `src/app/affiliate/login/page.tsx`
- client component `AffiliateLoginClient`
- design-system `Card`
- Supabase browser client.

User actions:

- login with email/password;
- show/hide password;
- request password reset;
- set new password;
- follow “Apply here” link.

Data displayed:

- mode-specific headline/body/button;
- confirmed message;
- role/session errors;
- reset neutral message.

Data source:

- URL search params;
- Supabase auth client;
- `/api/affiliate/password-reset`.

Loading state:

- button text changes: “Signing in…”, “Sending…”, “Saving…”.

Empty state:

- blank form.

Error state:

- invalid credentials: “Invalid email or password.”
- role error: “We couldn’t open the affiliate portal for this account...”
- session error;
- reset/update errors.

Mobile behavior:

- centered card with fluid width.

Accessibility notes:

- password toggles have `aria-label`;
- form labels present;
- status messages should use `aria-live`;
- successful login hard navigates with `window.location.assign("/affiliate/dashboard")`.

Known issues:

- `redirectTo` is sanitized, but successful password login ignores it and always navigates to `/affiliate/dashboard`.
- allowed redirect set includes `/affiliate`, but no `/affiliate/page.tsx` exists.
- copy still says “approved affiliate profile” while product decision allows application-created active affiliates.

Recommendation: 🟡 Improve. Auth mechanics are safe enough; messaging and redirect consistency need cleanup.

### 1.5 `/affiliate/agreement`

Route: `/affiliate/agreement`
Screenshot location: `/private/tmp/affiliate-dashboard-v2/agreement.png`
Purpose: static affiliate agreement text.

Components:

- `src/app/affiliate/agreement/page.tsx`
- affiliate theme classes.

User actions:

- read agreement only.

Data displayed:

- participation rules;
- suspension/termination language;
- commission eligibility;
- policy update statement;
- independent contractor/tax obligations;
- Ontario law statement.

Data source:

- hardcoded page copy.

Loading state:

- none.

Empty state:

- none.

Error state:

- none.

Mobile behavior:

- centered document with responsive width.

Accessibility notes:

- document is readable but has no legal navigation, version, effective date, or download.

Known issues:

- not authenticated;
- no acceptance tracking;
- no versioning;
- no back link.

Recommendation: 🔴 Replace with versioned legal center before serious program scale.

### 1.6 `/affiliate/apply`

Route: `/affiliate/apply`
Screenshot location: not applicable; redirect route.
Purpose: redirect legacy/direct affiliate application path to public partner program application section.

Implementation:

- `src/app/affiliate/apply/page.tsx`
- redirects to `/partners/affiliate-program#affiliate-application`.

Recommendation: 🟢 Keep as compatibility redirect.

### 1.7 `/affiliate`

Route: `/affiliate`
Screenshot location: `/private/tmp/affiliate-dashboard-v2/affiliate-index-missing.png`
Purpose: no page currently exists.

Observed behavior:

- layout exists under `/affiliate/layout.tsx`;
- login redirect whitelist allows `/affiliate`;
- no `src/app/affiliate/page.tsx` was found.

Recommendation: 🟡 Improve. Add an index redirect to `/affiliate/dashboard` or remove `/affiliate` from allowed redirect targets.

### 1.8 `/partners/affiliate-program`

Route: `/partners/affiliate-program`
Screenshot location: `/private/tmp/affiliate-dashboard-v2/public-partner-program.png`
Purpose: public acquisition/application page.

Dashboard relevance:

- application submission source;
- account creation source;
- first step of affiliate lifecycle;
- current public copy sets expectations for service-revenue commissions and dashboard access.

Components/data:

- public page `src/app/(public)/partners/affiliate-program/page.tsx`;
- `POST /api/affiliate/apply`;
- `POST /api/affiliate/account`;
- Supabase sign-up flow in page logic.

Recommendation: 🟢 Keep as acquisition surface; ensure copy remains aligned with backend commission model and portal capabilities.

### 1.9 `/go/[slug]`

Route: `/go/{slug}`
Screenshot location: not applicable; redirect route.
Purpose: canonical public affiliate link.

Implementation:

- `src/app/go/[slug]/route.ts`;
- resolves affiliate through RPC `resolve_affiliate`;
- redirects to configured app base URL with `?ref={slug}`;
- accepts `?to=/path` for target path.

Data source:

- `affiliates.slug`;
- `affiliates.referral_code`;
- `getAppBaseUrl()`;
- production fallback `https://pixiedvc.com`.

Recommendation: 🟢 Keep. This is the correct canonical link surface.

### 1.10 `/r/[slug]`

Route: `/r/{slug}`
Screenshot location: not applicable; redirect route.
Purpose: backwards compatibility for old affiliate links.

Implementation:

- `src/app/r/[slug]/route.ts`;
- 308 redirects to `/go/{slug}` preserving query.

Recommendation: 🟢 Keep indefinitely or until external link audit proves safe removal.

### 1.11 Admin affiliate screens

These are not affiliate-facing, but they are mandatory dependencies for dashboard data.

Routes:

- `/admin/affiliates`;
- `/admin/affiliates/applications`;
- `/admin/affiliates/payouts`;
- `/admin/affiliates/[affiliateId]/analytics`;
- `/admin/analytics?tab=affiliates`;
- `/admin/analytics?tab=revenue`.

Purpose:

- create/update affiliates;
- review applications;
- review conversions;
- create payout runs;
- mark payout items paid;
- void/adjust payout items;
- inspect affiliate analytics.

Recommendation: 🟢 Keep backend/admin flows as operational source of truth; expose safe subsets to affiliate dashboard.

## 2. UI Inventory

### Dashboard hierarchy

```text
Affiliate Dashboard
  Hero
    Label: Affiliate Dashboard
    Welcome headline
    Status chip
    Tier chip
    Referral Link Card
      URL
      Copy Button
      helper copy
    Quick Actions
      Resources
      Guides
      Share Your Link -> /calculator?ref={slug}

  KPI Cards
    Pending owed
    Last paid
    Average payout

  Conditional Getting Started
    No earnings message

  Main Grid
    Earnings activity
      empty getting-started card OR recent payout list
    Side column
      Payout email form
      Commission tier card

  Payout History
    Period
    Bookings
    Amount
    Status
    Paid
```

### Resources hierarchy

```text
Affiliate Toolkit
  Desktop side nav
    Overview
    Scripts
    Share Links
    Tracking

  Mobile section selector

  Overview
    Headline
    Affiliate name/tier/rate
    Copy Referral Link
    Open Dashboard
    Missing referral warning
    How to Position PixieDVC

  Script Library
    Script tabs
      1–2 Sentence
      Instagram
      TikTok (15s)
      Email / Blog
      Talking Points
    Script cards
      Auto-append checkbox
      Copy Script

  Share Links
    Main Referral Link
    Quick links
      Homepage
      Calculator
      How It Works
    Campaign tag
    Advanced tracked link generator

  Tracking Rules
    Referral Window
    Attribution
    Commission
    Payouts
```

### Guides hierarchy

```text
Affiliate Guides
  Back to dashboard
  Header
  Your affiliate link
    Editable slug input
    Home link
    Calculator link
    Plan flow link

  Three education cards
    What PixieDVC is
    What affiliates should say
    How referral links work

  What to say
    1–2 sentence pitch
    Short paragraph
    Long-form email/blog
    Talking points

  Where to send guests
    Price / quick estimate
    Help me plan / first timer
    Is this legit?

  Copy & Assets
    Button text ideas
    Website snippet
    Email snippet
    Instagram caption
    Downloadable SVG banners

  How you get paid
  What not to promise
  Affiliate FAQ
```

### Login hierarchy

```text
Affiliate Login
  Card
    Label
    Mode headline
    Mode body
    Email input when login/reset
    Password input when login/update
    Confirm password when update
    Submit button
    Forgot password
    Set password
    Status/error messages
    Apply here
```

### Agreement hierarchy

```text
Affiliate Agreement
  Label
  Heading
  Agreement text card
```

### Shared portal shell

```text
Affiliate Layout
  page shell class
  global affiliate link color override

Affiliate Portal Header
  Pixie logo
  Affiliate Portal label
  Desktop nav
    Dashboard
    Resources
    Guides
    Payouts
  Back to PixieDVC
  UserMenu or Login
```

## 3. Component Inventory

| Component | Purpose | Where Used | Props | Dependencies | Reusable? | Quality | Recommendation |
|---|---|---|---|---|---|---|---|
| `AffiliatePortalHeader` | Top portal nav | affiliate portal shell/header contexts | `userLabel`, `isAdmin`, `isAuthenticated` | `UserMenu`, `PixieLogo`, `Link` | Yes | Medium | 🟡 Improve mobile nav and broken payout anchor |
| `AffiliateDashboardPage` | Main dashboard server page | `/affiliate/dashboard` | none | Supabase server, affiliate helpers, payout helpers | No; page only | Medium | 🟡 Improve architecture; split widgets |
| `AffiliateResourcesClient` | Toolkit UI | `/affiliate/resources` | `affiliate`, `baseUrl` | clipboard, URL builder, theme, Card/Button | Partly | Medium | 🟡 Improve; extract link builder/script library |
| `AffiliateGuidesClient` | Guides UI | `/affiliate/guides` | `initialAffiliateSlug` | clipboard, URL builder, theme, Card | Partly | Medium | 🟡 Improve; remove editable slug or clarify |
| `AffiliateLoginClient` | Login/reset/update UI | `/affiliate/login` | none | Supabase browser client, router, app-url | Yes for affiliate auth only | Medium | 🟡 Improve messaging/live regions |
| `AffiliatePayoutEmailForm` | Update payout destination email | dashboard | `initialEmail` | `POST /api/affiliate/payout-email` | Yes | Medium | 🟡 Move to Settings; add validation/verification |
| `CopyReferralLinkButton` | Clipboard copy | dashboard | `referralLink`, `className`, `label` | browser clipboard | Yes | Medium | 🟡 Add disabled/error/aria-live |
| `AffiliateTracker` | Capture affiliate clicks from `?ref=` | global public client tree if mounted | none | analytics identity, `/api/affiliates/track` | Yes | High | 🟢 Keep |
| `ReferralCapture` | Browser referral cookie capture | global public client tree if mounted | none | `src/lib/referral.ts` | Legacy/compat | Medium | 🟡 Consolidate with affiliate cookies model |
| design-system `Card` | Card container | dashboard/resources/guides/admin | `surface`, `className` | `@pixiedvc/design-system` | Yes | High | 🟢 Keep |
| design-system `Button` | Button/link wrapper | dashboard/resources | `asChild`, `variant`, classes | design system | Yes | High | 🟢 Keep |
| native `<details>` accordions | FAQ/tracking rules | resources/guides | none | browser | Yes | Medium | 🟡 Style/focus consistently |
| native `<table>` | payout history/admin analytics | dashboard/admin | none | HTML | Yes | Medium | 🟡 Add responsive cards for mobile |
| native `<select>` | mobile resources nav | resources | `value`, options | browser | Yes | Medium | 🟢 Keep |
| native forms/inputs | payout email/login/resources/guides | many | value handlers | browser | Yes | Medium | 🟡 Normalize theme contrast |
| status chips | status visual labels | dashboard/admin | class function | local utility `statusChip` | Extractable | Medium | 🟡 Centralize status styling |
| `AdminAffiliatesClient` | Admin affiliate CRUD UI | `/admin/affiliates` | affiliate rows | admin API | No affiliate-facing | Medium | 🟡 Keep admin-only |
| `AdminAffiliateConversionsClient` | Admin conversion review | `/admin/affiliates` | conversion rows | admin conversion API | Admin-only | Medium | 🟢 Keep |
| `AdminAffiliatePayoutsClient` | Admin payout audit UI | `/admin/affiliates/payouts` | affiliates, runs, items | admin payout API | Admin-only | Medium | 🟢 Keep |
| Admin analytics tables/cards | Admin metrics UI | `/admin/analytics`, detail page | analytics rows | affiliate analytics helper | Potentially reusable | High | 🟢 Reuse safe data model |

Missing components for next dashboard:

- affiliate sidebar/mobile nav;
- date range picker;
- metric card with trends;
- conversion funnel;
- traffic source table;
- campaign table;
- booking request activity list;
- commission lifecycle row;
- payout detail drawer;
- QR/link builder;
- notification center;
- settings forms;
- support/contact card;
- skeleton/loading primitives;
- empty state primitive;
- error boundary/card primitive.

## 4. Widget Inventory

### Referral Link Widget

Purpose: primary affiliate sharing asset.
Displayed data: canonical referral URL.
Database fields: `affiliates.slug`.
Calculation: `buildAffiliateReferralUrl(getReferralBaseUrl(), affiliate.slug)` -> `{base}/go/{slug}`.
Refresh behavior: page reload.
Permissions: authenticated admin or non-blocked affiliate.
Loading state: none.
Empty state: profile-not-found or missing slug in resources.
Error state: copy failure is silent in dashboard.
Mobile behavior: wraps and breaks URL.
Known issues: Dashboard “Share Your Link” action links to `/calculator?ref={slug}` instead of canonical `/go/{slug}?to=/calculator`.
Opportunity: show link status, last click, copy count, QR code, campaign variants.
Recommendation: 🟢 Keep and expand.

### Pending Owed Widget

Purpose: show unpaid pending/scheduled payout item total.
Displayed data: dollar amount.
Database fields: `affiliate_payout_items.amount_usd`, `status`, `affiliate_id`.
Calculation: sum `amount_usd` where status in `["pending", "scheduled"]`.
Refresh behavior: page reload.
Permissions: affiliate-owned rows.
Loading state: none.
Empty state: `$0.00`.
Error state: none; query failure would silently look empty.
Mobile behavior: card stacks.
Known issues: conflates commission earned, approved commission, and scheduled payout.
Opportunity: split into “Commission earned”, “Approved awaiting payout”, “Pending payout item”, “Paid”.
Recommendation: 🟡 Improve.

### Last Paid Widget

Purpose: show latest paid payout item.
Displayed data: amount and paid date.
Database fields: `affiliate_payout_items.amount_usd`, `paid_at`, `created_at`, `status`.
Calculation: first paid row ordered by `paid_at desc`, then `created_at desc`.
Refresh behavior: page reload.
Empty state: `$0.00`, “No payouts yet.”
Known issues: no payment method/reference; no payout run context.
Recommendation: 🟡 Improve.

### Average Payout Widget

Purpose: show average payout item amount.
Displayed data: average and count.
Database fields: latest 24 `affiliate_payout_items.amount_usd`.
Calculation: sum returned amounts / returned count.
Known issues: not lifetime unless affiliate has <=24 rows; includes pending/void/adjusted rows depending query result; label is ambiguous.
Recommendation: 🔴 Replace with defined metrics.

### Earnings Activity Widget

Purpose: recent earnings/payout activity feed.
Displayed data: amount, date, booking count, status.
Database fields: `affiliate_payout_items`, nested `affiliate_payout_runs`.
Calculation: `payouts.slice(0, 6).reverse()`.
Known issues: called “earnings” but source is payout items; reversing the latest rows shows oldest of six first.
Opportunity: true activity feed combining click/request/conversion/payout events.
Recommendation: 🟡 Improve.

### Payout Email Widget

Purpose: collect manual payout destination email.
Displayed data: current payout email.
Database fields: `affiliates.payout_email`.
Calculation: none.
Refresh behavior: local POST, no page reload.
Permissions: route checks authenticated user and affiliate by `auth_user_id`.
Loading state: “Saving…”.
Empty state: blank input.
Error state: generic “Unable to update payout email.”
Known issues: cannot update if affiliate is only email-linked but has null `auth_user_id`; does not use email fallback.
Opportunity: dedicated Settings page; verification; provider-specific payout profile.
Recommendation: 🟡 Improve.

### Commission Tier Widget

Purpose: show rate, status, tier, and tier messaging.
Displayed data: `commissionRate`, `status`, `tier`.
Database fields: `affiliates.commission_rate`, `status`, `tier`.
Calculation: `commissionRate * 100`.
Known issues: tier copy references Basic 6%, Verified/Elite legacy benefits; public landing page uses Partner/Verified Partner/Ambassador 10/12.5/15 model.
Opportunity: canonical tier policy and progress model.
Recommendation: 🔴 Replace after product policy finalization.

### Payout History Widget

Purpose: show recent payout records.
Displayed data: period, booking count, amount, status, paid date.
Database fields: `affiliate_payout_items`, nested `affiliate_payout_runs`.
Calculation: period from run dates, fallback created date.
Refresh behavior: page reload.
Empty state: “No payouts yet.”
Known issues: no filters/export/detail; no `id` for header anchor; limited to 24 rows; no adjustment/void reason; no payment reference shown.
Recommendation: 🟡 Improve as separate Payouts screen.

### Script Library Widget

Purpose: provide copy snippets for affiliates.
Displayed data: hardcoded scripts.
Database fields: none.
Calculation: optional replacement of `{your link}`.
Known issues: not content-managed/versioned; commission language stale.
Recommendation: 🟡 Improve.

### Share Links Widget

Purpose: generate tracked links.
Displayed data: canonical link, quick links, advanced link output.
Database fields: `affiliates.slug`.
Calculation: `buildAffiliateReferralUrl(origin, slug, targetPath)` plus `utm_campaign`.
Known issues: only campaign is supported in UI; no saved links or per-link analytics.
Recommendation: 🟢 Keep and expand.

### Tracking Rules Widget

Purpose: explain referral rules.
Displayed data: static rules.
Database fields: none.
Known issues: copy says 90-day first-touch; should be tied to actual policy config/agreement.
Recommendation: 🟡 Improve.

### Guides Link Builder Widget

Purpose: generate Home/Calculator/Plan links.
Displayed data: locally editable slug and generated URLs.
Known issues: editable slug can create arbitrary affiliate links; not a real setting.
Recommendation: 🔴 Replace with authenticated slug only.

### Downloadable Assets Widget

Purpose: expose static SVG assets.
Displayed data: three links under `/affiliate-kit`.
Known issues: no previews; no tracking; no asset metadata; no categories.
Recommendation: 🟡 Improve.

### Missing Widgets

Critical missing widgets:

- Clicks;
- unique visitors;
- pageviews;
- attributed booking requests;
- confirmed conversions;
- approved commissions;
- paid conversions;
- conversion funnel;
- traffic source breakdown;
- UTM campaign performance;
- top landing pages;
- booking/reservation activity;
- commission lifecycle;
- payout run details;
- notification feed;
- onboarding checklist.

## 5. Data Flow Mapping

### Dashboard access

```text
/affiliate/dashboard
  -> createSupabaseServerClient()
  -> auth.getUser()
  -> profiles.select("role").eq("id", user.id)
  -> getAffiliateForUser(user.id, user.email)
      -> affiliates by auth_user_id
      -> affiliates by email
      -> admin fallback by auth_user_id/email
  -> ensureAffiliateForApplicationUser(user.id, user.email, affiliate)
      -> affiliate_applications by auth_user_id/email
      -> link application auth_user_id when possible
      -> link existing affiliate auth_user_id when possible
      -> activate pending_review to active
      -> insert affiliate from valid application if missing
  -> block hard statuses
  -> render dashboard
```

### Referral Link

```text
Dashboard Page
  -> affiliate.slug
  -> getReferralBaseUrl()
      -> NEXT_PUBLIC_APP_URL
      -> NEXT_PUBLIC_SITE_URL
      -> production fallback https://pixiedvc.com
  -> buildAffiliateReferralUrl(base, slug)
  -> /go/{slug}
  -> displayed URL
```

### Pending Owed

```text
Dashboard Page
  -> getAffiliatePayoutSummary(affiliate.id)
  -> Supabase
  -> affiliate_payout_items
  -> filter affiliate_id = affiliate.id
  -> status in ["pending", "scheduled"]
  -> SUM(amount_usd) in application code
  -> Pending owed card
```

### Last Paid

```text
Dashboard Page
  -> getAffiliatePayoutSummary(affiliate.id)
  -> affiliate_payout_items
  -> filter affiliate_id
  -> status = "paid"
  -> order paid_at desc, created_at desc
  -> limit 1
  -> Last paid card
```

### Average Payout

```text
Dashboard Page
  -> getAffiliatePayoutHistory(affiliate.id)
  -> affiliate_payout_items
  -> latest 24 rows
  -> reduce SUM(amount_usd) / payout row count
  -> Average payout card
```

### Earnings Activity

```text
Dashboard Page
  -> getAffiliatePayoutHistory(affiliate.id)
  -> affiliate_payout_items + affiliate_payout_runs
  -> slice(0, 6).reverse()
  -> amount/date/booking_count/status list
```

### Payout History

```text
Dashboard Page
  -> getAffiliatePayoutHistory(affiliate.id)
  -> affiliate_payout_items
      select id,status,amount_usd,booking_count,payout_reference,paid_at,created_at
      nested payout_run(id,status,period_start,period_end,paid_at,created_at)
  -> table rows
```

### Payout Email Update

```text
PayoutEmailForm
  -> POST /api/affiliate/payout-email { payout_email }
  -> createSupabaseServerClient()
  -> auth.getUser()
  -> affiliates.select("id").eq("auth_user_id", user.id)
  -> update affiliates.payout_email
  -> local success/error message
```

### Resource Script Copy

```text
AffiliateResourcesClient
  -> SCRIPTS[activeTab]
  -> optional replace "{your link}" with canonicalReferralLink
  -> navigator.clipboard.writeText()
  -> local copied state
```

### Advanced Link Generation

```text
AffiliateResourcesClient
  -> user enters public PixieDVC URL
  -> validate origin
  -> reject /admin, /owner, /affiliate, /api, /auth
  -> optional utm_campaign
  -> buildAffiliateReferralUrl(origin, slug, targetPath)
  -> display/copy generated URL
```

### Affiliate Click Capture

```text
Visitor lands with ?ref={slug}
  -> AffiliateTracker
  -> getOrCreateAnalyticsIdentity()
  -> sessionStorage px_aff_click_{ref} or crypto.randomUUID()
  -> POST /api/affiliates/track
  -> recordAffiliateClickAttribution()
      -> resolve_affiliate RPC
      -> ensureAnalyticsSession()
      -> affiliate_clicks upsert by click_id
      -> set httpOnly cookies px_aff, px_aff_click, px_aff_visitor, px_aff_session
```

### Booking Attribution

```text
Booking creation path
  -> attachBookingAttribution(bookingRequestId, { source })
  -> readAffiliateCookies()
  -> resolve_affiliate RPC
  -> affiliate_clicks lookup by click_id
  -> booking_requests select attribution fields
  -> update missing affiliate_id, affiliate_click_id, visitor_session ids, referral code, UTM fields
  -> ensureAffiliateLead() legacy row
```

### Conversion Creation

```text
Booking confirmation/payment path
  -> ensureAffiliateConversionForBooking({ bookingRequestId, source, rentalId? })
  -> booking_requests attribution/payment/confirmation fields
  -> affiliate_leads fallback
  -> affiliates status/rate
  -> standard or Ready Stay eligibility rules
  -> booking amount source:
      guest_total_cents_final
      guest_total_cents
      est_cash
  -> calculateCommission()
  -> affiliate_conversions insert status=pending
  -> idempotent by booking_request_id unique constraint
```

### Admin Payout Run

```text
Admin /admin/affiliates/payouts
  -> POST /api/admin/affiliates/payouts
  -> approved affiliate_conversions without payout_run_id
  -> create affiliate_payout_runs
  -> create affiliate_payout_items one per conversion
  -> snapshot booking amount, commission rate, commission amount
  -> link conversions.payout_run_id
```

## 6. API Inventory

| Endpoint | Purpose | Auth | Input | Output | Database | Consumers | Performance | Security | Reuse |
|---|---|---|---|---|---|---|---|---|---|
| `POST /api/affiliate/apply` | Submit partner application | Public + service role | name/email/website/social/promotion/traffic/agreed | `{ ok,status,message }` or error | `affiliate_applications` | public partner page | single lookup + insert | raw DB errors exposed; no rate limit visible | 🟡 Improve |
| `POST /api/affiliate/account` | Verify/link application before account creation | Public-ish + service role + optional user | email | application state/link info | `affiliate_applications` | partner page account step | bounded lookups | raw errors possible | 🟡 Improve |
| `POST /api/affiliate/password-reset` | Send neutral reset email only for active affiliates | Public neutral | email, redirectTo | neutral message | `affiliates`, Supabase auth | login reset | one lookup | good enumeration resistance; no rate limit visible | 🟢 Keep |
| `POST /api/affiliate/payout-email` | Update affiliate payout email | Authenticated affiliate | payout_email | `{ ok: true }` | `affiliates` | dashboard | one lookup + update | only auth_user_id lookup; raw errors | 🟡 Improve |
| `POST /api/affiliates/track` | Record affiliate click and set cookies | Public | ref, click_id, visitor ids, path, UTM | ok boolean | `affiliates`, `affiliate_clicks`, `visitor_sessions` | `AffiliateTracker` | one RPC + session upsert + click upsert | public endpoint; no visible rate limit | 🟢 Keep |
| `GET /go/[slug]` | Canonical affiliate redirect | Public | slug, optional `to` | redirect | RPC `resolve_affiliate` | external affiliate links | one RPC | validates `to` starts with `/`; same-origin redirect | 🟢 Keep |
| `GET /r/[slug]` | Legacy redirect | Public | slug | 308 redirect to `/go` | none | old links | cheap | safe | 🟢 Keep |
| `POST/PATCH /api/admin/affiliates` | Admin affiliate CRUD | Admin | affiliate fields | saved affiliate | `affiliates` | admin affiliate page | bounded | admin only | 🟢 Keep |
| `GET/PATCH /api/admin/affiliates/applications` | Application review | Admin | status/review data | updated rows | `affiliate_applications`, `affiliates` | admin applications | bounded | admin only | 🟢 Keep |
| `GET/PATCH /api/admin/affiliates/conversions` | Conversion review/void | Admin | conversion id/status/notes | updated conversion | `affiliate_conversions` | admin affiliates page | bounded | admin only | 🟢 Keep |
| `GET/POST/PATCH /api/admin/affiliates/payouts` | Payout run/item audit | Admin | period/action/payment/void/adjust payload | run/item result | `affiliate_payout_runs`, `affiliate_payout_items`, `affiliate_conversions` | admin payouts page | more complex but bounded | admin only | 🟢 Keep |
| `POST /api/admin/payouts` | Legacy affiliate payout disabled | Admin | legacy payload | 410 Gone | none write | old admin flow | cheap | prevents legacy writes | 🟢 Keep disabled |
| `POST /api/admin/affiliate-conversion-test` | Temporary conversion test tool | Admin + exact request + phrase | action/request/phrase | simulation/reset result | booking/conversion test data | admin request detail | narrow | explicitly temporary; exact request gated | 🔴 Remove after test |

## 7. Database Inventory

### `affiliates`

Purpose: affiliate identity/profile/config.

Relationships:

- `auth_user_id` to `auth.users`;
- referenced by `affiliate_clicks`, `affiliate_leads`, `affiliate_conversions`, `affiliate_payout_items`, `booking_requests.affiliate_id`.

Fields actually used:

- `id`;
- `auth_user_id`;
- `display_name`;
- `email`;
- `payout_email`;
- `slug`;
- `referral_code`;
- `commission_rate`;
- `status`;
- `tier`;
- `review_notes`;
- `website`;
- `social_links`;
- `traffic_estimate`;
- `promotion_description`;
- `suspend_reason`;
- timestamps in admin pages.

Fields not used in affiliate-facing dashboard:

- `website`;
- `social_links`;
- `traffic_estimate`;
- `promotion_description`;
- `review_notes`;
- `suspend_reason`;
- `reviewed_at`.

Indexes/RLS:

- index on click/conversion/payout relationship tables;
- RLS enabled in migrations;
- affiliates can view own profile;
- admins can manage.

Performance concerns:

- email lookup should have unique/lowercase strategy; current code assumes normalized lowercase.

Future suitability:

- strong base table; needs canonical tier/status policy and settings expansion.

Reuse rating: 85%.

### `affiliate_applications`

Purpose: application inbox and onboarding source.

Relationships:

- may link to `auth.users` through `auth_user_id`;
- used to create/link `affiliates`.

Fields used:

- `id`;
- `status`;
- `auth_user_id`;
- `display_name`;
- `email`;
- `website`;
- `social_links`;
- `traffic_estimate`;
- `promotion_description`;
- `admin_notes`;
- `terms_accepted_at`;
- `created_at`.

Fields not visible to affiliate:

- admin review fields;
- accepted/approved/rejected audit fields.

Indexes/RLS:

- `affiliate_applications_status_idx`;
- `affiliate_applications_email_idx`;
- RLS admin policy.

Future suitability:

- good onboarding source; add applicant-facing status only if needed.

Reuse rating: 75%.

### `affiliate_clicks`

Purpose: click-level attribution.

Relationships:

- `affiliate_id` to affiliates;
- `visitor_session_row_id` to visitor sessions;
- `click_id` referenced by booking attribution.

Fields used:

- `id`;
- `affiliate_id`;
- `click_id`;
- `clicked_at`;
- `landing_path`;
- `referrer`;
- `user_agent`;
- `visitor_session_row_id`;
- `visitor_session_id`;
- `visitor_id`;
- `utm_source`;
- `utm_medium`;
- `utm_campaign`;
- `utm_term`;
- `utm_content`.

Indexes/RLS:

- affiliate/date index;
- click id index;
- visitor/session/utm indexes from Phase 1;
- RLS allows public insert and affiliate own read.

Future suitability:

- strong source for affiliate analytics.

Reuse rating: 90%.

### `visitor_sessions`

Purpose: anonymous first-party session analytics.

Relationships:

- linked by `affiliate_clicks.visitor_session_row_id`;
- linked to pageviews/events.

Fields used in affiliate analytics:

- `id`;
- `visitor_id`;
- `session_id`;
- `started_at`;
- `landing_page_path`;
- `referrer`;
- `utm_source`.

Future suitability:

- strong session backbone; needs location enrichment if desired.

Reuse rating: 85%.

### `visitor_pageviews`

Purpose: pageview analytics.

Fields used:

- `session_row_id`;
- `visitor_id`;
- `session_id`;
- `page_path`;
- `created_at`.

Future suitability:

- useful for landing-page and flow analytics.

Reuse rating: 80%.

### `booking_requests`

Purpose: booking/reservation request record and attribution carrier.

Affiliate fields used:

- `affiliate_id`;
- `affiliate_click_id`;
- `visitor_session_row_id`;
- `visitor_session_id`;
- `visitor_id`;
- `attribution_source`;
- `referral_code`;
- `referral_set_at`;
- `referral_landing`;
- `referral_utm_source`;
- `referral_utm_medium`;
- `referral_utm_campaign`;
- `referral_utm_term`;
- `referral_utm_content`.

Conversion fields used:

- `guest_total_cents_final`;
- `guest_total_cents`;
- `est_cash`;
- `deposit_due`;
- `deposit_paid`;
- `status`;
- `payment_status`;
- `owner_transfer_confirmed_at`;
- `disney_confirmation_number`.

Indexes:

- affiliate/date;
- affiliate id;
- affiliate click;
- visitor ids;
- attribution source.

Future suitability:

- central record for affiliate-visible reservation activity.

Reuse rating: 90%.

### `affiliate_leads`

Purpose: legacy/fallback booking lead attribution.

Fields used:

- `id`;
- `affiliate_id`;
- `click_id`;
- `booking_request_id`;
- `lead_status`;
- `attribution_type`.

Future suitability:

- legacy compatibility; not ideal as primary dashboard source.

Reuse rating: 40%.

### `affiliate_conversions`

Purpose: canonical commission event after eligible booking.

Fields used:

- `id`;
- `affiliate_id`;
- `lead_id`;
- `booking_request_id`;
- `status`;
- `booking_amount_usd`;
- `commission_rate`;
- `commission_amount_usd`;
- `confirmed_at`;
- `payout_id`;
- `payout_run_id`;
- `conversion_source`;
- `rental_id`;
- `confirmed_event`;
- `eligibility_confirmed_at`;
- `booking_amount_source`;
- review/void audit fields.

Indexes:

- unique `booking_request_id` from original schema;
- booking request index;
- status/created;
- affiliate/status/confirmed;
- rental index;
- reviewed_at.

Future suitability:

- excellent canonical conversion source.

Reuse rating: 92%.

### `affiliate_payout_runs`

Purpose: payout batch/audit run.

Fields used:

- `id`;
- `period_start`;
- `period_end`;
- `status`;
- `notes`;
- `created_at`;
- `paid_at`;
- `created_by`;
- `reviewed_by`;
- `reviewed_at`;
- `paid_by`;
- `payment_method`;
- `payment_reference`;
- `payment_notes`;
- `voided_by`;
- `voided_at`;
- `void_reason`;
- `updated_at`.

Future suitability:

- strong admin ledger; affiliate UI should expose safe subset.

Reuse rating: 90%.

### `affiliate_payout_items`

Purpose: payout line item ledger and affiliate-facing payout source.

Fields used:

- `id`;
- `payout_run_id`;
- `affiliate_id`;
- `conversion_id`;
- `booking_request_id`;
- `booking_amount_usd`;
- `commission_rate`;
- `commission_amount_usd`;
- `original_amount_usd`;
- `amount_usd`;
- `booking_count`;
- `booking_request_ids`;
- `status`;
- `paid_at`;
- `paid_by`;
- `payment_method`;
- `payment_reference`;
- `payment_notes`;
- `payout_reference`;
- `voided_by`;
- `voided_at`;
- `void_reason`;
- `adjusted_by`;
- `adjusted_at`;
- `adjustment_reason`;
- `created_at`.

Dashboard currently displays only:

- `status`;
- `amount_usd`;
- `booking_count`;
- `payout_reference` not rendered;
- `paid_at`;
- `created_at`;
- nested run period.

Future suitability:

- canonical payout-history source; needs affiliate-safe presentation model.

Reuse rating: 90%.

### `affiliate_payouts`

Purpose: legacy payout table.

Current status:

- preserved for history;
- legacy POST disabled with 410;
- not used by affiliate dashboard V2 target.

Reuse rating: 10% for new dashboard; read-only archive only.

## 8. Feature Inventory

| Feature | Description | Current Maturity | Dependencies | Limitations | Future | Reuse |
|---|---|---:|---|---|---|---|
| Affiliate password login | Dedicated affiliate email/password login | Medium | Supabase auth | copy/status drift | Keep and polish | 🟢 Keep |
| Password reset | Approved/active affiliate reset flow | Medium | Supabase auth, affiliates | no rate-limit UI | Keep | 🟢 Keep |
| Dashboard access/self-heal | Creates/activates affiliate from application | Medium | affiliates, applications, admin client | hidden complexity, divergent guards | Centralize | 🟡 Extend |
| Referral URL generation | `/go/{slug}` canonical links | High | affiliate-referrals | dashboard direct calculator exception | Standardize | 🟢 Keep |
| Referral redirect | `/go`, `/r` | High | resolve_affiliate RPC | no server-side click row at redirect time | Keep | 🟢 Keep |
| Click capture | client tracker posts click/session/UTM | High | tracker, analytics identity | depends on client execution | Keep | 🟢 Keep |
| Visitor/session analytics | first-party sessions/pageviews | High | analytics tables | no affiliate UI | Expose safe subset | 🟡 Extend |
| Booking attribution | booking requests carry affiliate chain | High | booking-attribution helper | not visible to affiliate | Expose safe subset | 🟢 Keep |
| Conversion engine | idempotent pending conversions | High | conversion helper | not visible to affiliate | Expose lifecycle | 🟢 Keep |
| Payout audit ledger | manual run/item ledger | High | payout APIs | affiliate UI only shows summary | Expose safe detail | 🟢 Keep |
| Payout email | manual payout destination | Medium | payout-email API | no verification/provider profile | Move settings | 🟡 Extend |
| Script library | affiliate copy snippets | Low/Medium | hardcoded arrays | stale commission language, no CMS | Content-manage | 🟡 Extend |
| Link builder | tracked quick/advanced links | Medium | URL builder | no saved campaigns/full UTM | Expand | 🟡 Extend |
| Guides | education/guardrails | Medium | hardcoded content | overlaps resources | Merge | 🟡 Extend |
| Agreement | static legal copy | Low | none | no acceptance/version | Rebuild | 🔴 Replace |
| Admin affiliate management | CRUD/conversion review | Medium/High | admin APIs | utilitarian UI | Keep | 🟢 Keep |
| Admin analytics | global/detail affiliate metrics | High | affiliate-analytics | admin-only | Reuse backend | 🟢 Keep |

## 9. Backend Reusability Audit

| Subsystem | Reuse % | Modernization Effort | Recommendation |
|---|---:|---:|---|
| Referral Tracking | 90% | Low | Keep `/go`, `/r`, cookies, tracker; standardize UI links |
| Click Attribution | 90% | Low | Reuse `affiliate_clicks` + visitor session link |
| Reservations | 75% | Medium | Reuse `booking_requests` attribution; build affiliate-safe query layer |
| Commissions | 85% | Medium | Reuse `affiliate_conversions`; resolve public tier/calc language mismatch |
| Payouts | 90% | Medium | Reuse payout runs/items; build affiliate-safe detail/history views |
| Analytics | 85% | Medium | Reuse admin helper patterns; create affiliate-scoped helper/API |
| Notifications | 15% | High | No affiliate-specific notification model found |
| Resources | 45% | Medium | Reuse copy/assets/link builder; content-manage and merge Guides |
| Guides | 45% | Medium | Reuse compliance copy; merge into Marketing Tools/Help |
| Authentication | 75% | Low/Medium | Keep affiliate login; centralize guards and copy |
| Settings | 25% | Medium | Payout email exists; profile/security/payment settings missing |
| Applications | 75% | Medium | Reuse application/account/self-heal; expose clearer applicant lifecycle if needed |

## 10. Missing Features

### Critical

- Affiliate-facing performance metrics: clicks, visitors, booking requests, conversions.
- Date range filtering.
- Affiliate-scoped conversion funnel.
- Reservation/booking activity list.
- Commission lifecycle: pending, approved, voided, scheduled, paid.
- Payout detail/history with adjustment/void status.
- Mobile portal navigation.
- Centralized affiliate authorization helper.
- Fixed payout history anchor or dedicated payouts route.
- Copy/commission policy consistency across landing page, resources, guides, dashboard.

### High

- Traffic source and UTM campaign reporting.
- Top landing pages.
- Saved campaign links.
- QR code generation.
- Link health/last-click confirmation.
- Settings page for payout email/profile/security.
- Notification feed.
- Help/support route.
- Agreement acceptance/version tracking.
- Affiliate-safe analytics helper.
- Payout export.

### Medium

- Marketing asset library with previews.
- Content-managed scripts/guides.
- Search/filter in resources.
- Onboarding checklist.
- Tier progress and requirements.
- CSV export for analytics.
- Affiliate referral activity timeline.
- Support/dispute flow for missing attribution.

### Low

- Leaderboard/rank display.
- Social platform presets beyond campaign tag.
- Download history.
- Webhook/email alerts.
- Custom branded landing pages.

## 11. UX Issues

Confusing workflows:

- Dashboard shows payouts but not performance.
- Resources and Guides overlap.
- Editable slug in Guides looks like a setting but is local only.
- “Share Your Link” uses `/calculator?ref=` while canonical links use `/go`.
- Payout email is a settings task embedded in dashboard.

Duplicate pages:

- Resources and Guides both contain scripts, links, payout/tracking education, and affiliate rules.

Broken flows:

- `/affiliate/dashboard#payout-history` target missing.
- `/affiliate` is a whitelisted redirect but no page exists.

Inconsistent terminology:

- Affiliate vs Partner;
- service revenue vs net rental revenue;
- 6–8% vs 10–15%;
- pending owed vs earnings vs payouts;
- qualified booking definition differs between guides and conversion engine.

Navigation problems:

- No sidebar.
- No mobile affiliate nav.
- Payouts is only an anchor, not a route.
- No Performance, Reservations, Commissions, Settings, Help.

Information hierarchy:

- Referral link is clear.
- Money metrics are present but shallow.
- Performance and reservation stages are absent.
- Tier card explains status but not what affiliates should do next.

Accessibility:

- status/copy messages should use `aria-live`;
- color contrast issues in portal theme;
- mobile nav absence creates discoverability problem;
- tables need mobile alternative;
- legal agreement lacks structure/version metadata.

Mobile UX:

- dashboard table overflow;
- no mobile portal nav;
- Resources mobile selector is a positive pattern worth reusing.

## 12. Technical Debt

Dead/incomplete code:

- `/affiliate` missing page.
- payout history anchor missing.
- unused `cookieStore` variable in `POST /api/affiliate/payout-email`.

Duplicate/fragmented logic:

- dashboard custom auth/self-heal logic vs `requireAffiliateUser()`;
- Resources and Guides duplicate link/copy concepts;
- `ReferralCapture` legacy browser cookie model coexists with canonical affiliate cookies;
- legacy `affiliate_leads` remains alongside booking request attribution;
- legacy `affiliate_payouts` remains as archive.

Temporary implementations:

- `src/app/api/admin/affiliate-conversion-test/route.ts` is explicitly temporary.
- self-heal server logs are temporary diagnostics.

Mock/static data:

- all scripts/guides/tracking rules/FAQ are hardcoded.
- downloadable asset list hardcoded.

Migration risks:

- older environments may lack `auth_user_id` on applications; code has fallback.
- affiliate status enum history differs from newer statuses used in code (`pending_review`, `verified`, `suspended`, etc.).
- conversion/payout audit migrations must be applied for admin analytics stability.

Hardcoded values:

- commission language;
- 90-day referral rule;
- PayPal/Wise payout text;
- localhost allowances in Resources advanced URL builder;
- production referral destination fallback.

## 13. Security Review

Authentication:

- affiliate dashboard/resources/guides require Supabase auth;
- login uses password auth;
- password reset has neutral response.

Authorization:

- dashboard permits admin or affiliate with valid application/self-heal and non-blocked status;
- Resources/Guides use `requireAffiliateUser()` which requires active affiliate/admin;
- admin pages use `requireAdminUser`.

RLS:

- migrations enable RLS on core affiliate tables;
- affiliates can view own profile/clicks/leads/conversions/payouts where policies exist;
- admin policies allow management.

Sensitive data:

- affiliate dashboard does not expose guest PII.
- admin analytics detail intentionally avoids guest name/email/phone.
- click tracking stores user agent/referrer; not surfaced to affiliates.
- payout email is visible/editable to affiliate.

Permissions concerns:

- payout email update only finds affiliate by `auth_user_id`, not email fallback; email-only linked affiliates may fail.
- dashboard and `requireAffiliateUser()` status logic can drift.

Potential vulnerabilities:

- public application/account endpoints expose raw DB messages in some branches.
- no visible rate limiting on apply/account/password-reset/tracking.
- client click tracking endpoint is public and accepts arbitrary click ids/visitor ids.
- advanced link generator must remain restricted to public same-origin paths.
- service-role fallback must remain server-only.

Recommendations:

- sanitize public API errors;
- add rate limiting;
- centralize affiliate guard;
- add audit logging for payout email changes;
- remove temporary test tool after validation.

## 14. Performance Review

Current portal:

- dashboard queries are bounded;
- payout history limited to 24;
- Resources/Guides mostly static;
- no heavy client dependencies detected in affiliate portal.

Large query risk:

- admin affiliate analytics helper fetches multiple datasets and aggregates in memory. Good for current volume, but affiliate-facing reuse should remain bounded by date range and affiliate id.

Duplicate queries:

- dashboard summary and history both query `affiliate_payout_items`.
- `getAffiliateForUser()` can query by user/email with admin fallback.

N+1:

- affiliate-facing dashboard has no obvious N+1.
- admin analytics should be watched as data grows.

Caching:

- dashboard should remain private/no-store.
- Resources/Guides content could be static/content-managed.
- public assets can be CDN cached.

Bundle/rendering:

- Resources/Guides are client-heavy because arrays and clipboard behavior live in client components.
- Dashboard is mostly server-rendered.

Realtime opportunities:

- none implemented;
- future candidates: click count, new booking request, conversion approved, payout paid.

## 15. Implementation Complexity

| Feature | Reuse | New Backend | New UI | Risk | Estimate |
|---|---:|---:|---:|---|---:|
| Dashboard KPI rebuild | 80% | 20% | High | Medium | 1-2 days |
| Affiliate performance overview | 80% | 20% | High | Medium | 2-3 days |
| Click/visitor chart | 85% | 15% | Medium | Low/Medium | 1-2 days |
| Conversion funnel | 85% | 15% | Medium | Medium | 1-2 days |
| Attributed reservations list | 75% | 25% | High | Medium | 2-3 days |
| Commission lifecycle screen | 80% | 20% | High | Medium | 2-3 days |
| Payout detail screen | 85% | 15% | Medium | Low/Medium | 1-2 days |
| Marketing Tools consolidation | 50% | 10% | High | Medium | 3-5 days |
| Saved campaign links | 35% | 65% | Medium | Medium | 3-5 days |
| QR code generator | 50% | 10% | Medium | Low | 0.5-1 day |
| Settings page | 45% | 30% | Medium | Medium | 2-3 days |
| Mobile portal navigation | 70% | 0% | Medium | Low | 0.5-1 day |
| Agreement acceptance/versioning | 25% | 75% | Medium | Medium/High | 3-5 days |
| Notification center | 15% | 85% | High | High | 1-2 weeks |
| Help/support page | 50% | 20% | Medium | Low | 1-2 days |
| Affiliate-safe analytics helper/API | 75% | 25% | Low | Medium | 1-2 days |
| Export CSV | 70% | 30% | Low/Medium | Low | 1 day |
| Tier progress | 30% | 70% | Medium | High | 1 week |

## 16. Product Recommendations

### KEEP

- `/go/{slug}` canonical referral strategy.
- `/r/{slug}` backwards compatibility.
- AffiliateTracker click/session capture.
- Booking request attribution fields.
- Canonical conversion engine.
- Payout run/item audit ledger.
- Admin affiliate analytics helper.
- Payout email ability.
- Resources link builder concept.
- Compliance guardrails from Guides.

Reason: these are solid primitives with good backend reuse.

### IMPROVE

- Dashboard KPI definitions.
- Portal navigation and mobile nav.
- Payout history presentation.
- Resources/Guides copy and contrast.
- Affiliate auth/access consistency.
- Public API error sanitization.
- Rate limiting.
- Payout email validation and settings placement.

Reason: current implementation works but is not yet product-grade.

### MERGE

- Resources + Guides -> Marketing Tools.
- Tracking Rules + FAQ + Agreement snippets -> Help/Policy center.
- payout email + profile/security -> Settings.

Reason: current separation creates duplicate mental models.

### REMOVE

- editable slug field from Guides.
- stale commission percentage copy.
- temporary admin conversion test tool after pipeline validation.
- broken payout anchor.

Reason: these create confusion or operational risk.

### REBUILD

- affiliate dashboard information architecture;
- Performance screen;
- Reservations screen;
- Commissions screen;
- Payouts screen;
- Agreement acceptance/versioning;
- Notifications.

Reason: these are missing or not sufficient for a next-generation affiliate portal.

## 17. Final Engineering Scorecard

| Area | Score /10 | Rationale |
|---|---:|---|
| Architecture | 7 | backend primitives are strong; UI architecture is page-heavy and fragmented |
| Backend | 8 | attribution, conversion, payout, and admin analytics are reusable |
| Frontend | 5 | functional but not modular enough for next-gen dashboard |
| UX | 5 | usable MVP, but not a true dashboard |
| UI | 5 | consistent dark style, but contrast/navigation/hierarchy issues |
| Scalability | 6 | backend can scale with bounded queries; affiliate UI lacks pagination/filtering |
| Security | 6 | solid auth/RLS baseline; raw errors/rate limits/guard drift need work |
| Performance | 7 | current portal is light; future analytics need careful query design |
| Maintainability | 6 | helpers are useful; duplicated content and mixed legacy/canonical models add cost |
| Developer Experience | 6 | source is understandable; domain terminology needs consolidation |
| Overall | 6 | strong backend foundation; affiliate-facing product needs structured rebuild |

## Redesign-Ready Blueprint

The next-generation affiliate dashboard can be built mechanically from these existing backend sources:

### Dashboard Home

- `affiliates`: identity/status/tier/rate/referral link.
- `affiliate_clicks`: clicks and unique visitors.
- `visitor_sessions`/`visitor_pageviews`: visitor/pageview context.
- `booking_requests`: attributed requests and source breakdown.
- `affiliate_conversions`: confirmed conversions, booking value, commission earned.
- `affiliate_payout_items`: pending/paid payout amounts.

### Performance

- reuse `src/lib/affiliate-analytics.ts` logic but scope by affiliate id;
- date ranges: Today, 7d, 30d, Month, Custom;
- expose clicks, visitors, requests, conversions, rates, booking value, commission.

### Reservations

- source: `booking_requests` filtered by `affiliate_id` or reliable legacy fallback;
- show safe fields only: request id, dates, resort, room, status, attribution source, conversion status.

### Commissions

- source: `affiliate_conversions`;
- show lifecycle: pending review, approved, void, paid;
- include booking amount, rate, commission amount, status dates.

### Payouts

- source: `affiliate_payout_items` + `affiliate_payout_runs`;
- show amount, period, status, paid date, safe payment reference where appropriate;
- hide internal notes and admin ids unless explicitly product-approved.

### Marketing Tools

- merge Resources and Guides;
- source today is static arrays/assets;
- future source should be CMS/config table.

### Settings

- `affiliates.payout_email`;
- profile/contact fields if product-approved;
- auth/security should remain Supabase/account level.

## Highest-Value Next Engineering Step

Create an affiliate-scoped analytics service, for example:

```ts
getAffiliateDashboardAnalytics({
  affiliateId,
  startDate,
  endDate,
})
```

It should reuse the same canonical chain as admin analytics but return only affiliate-owned, PII-safe fields. This one backend layer would power:

- dashboard KPI cards;
- performance charts;
- reservation list;
- commission lifecycle;
- payout summary;
- source/campaign tables.

That service should be built before any visual redesign so the UI can be deterministic.
