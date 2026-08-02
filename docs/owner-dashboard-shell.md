# HannaDVC Owner Dashboard Shell

## Phase A Status

Phase A creates a shared protected owner application shell. It is presentation and navigation only: existing owner pages, queries, actions, payout calculations, reservation statuses, Ready Stay logic, onboarding, agreements, verification and authentication rules remain unchanged.

## Shell Architecture

Protected `/owner` routes render inside `src/app/owner/layout.tsx`, which wraps page content with `OwnerShell`.

The shell contains:

- persistent desktop sidebar;
- compact top bar;
- mobile navigation drawer;
- main content landmark;
- skip-to-content link;
- account menu;
- notification link;
- support link.

The shell intentionally does not load dashboard metrics, payout values, reservation counts or Ready Stay data. Navigation is not authorization; existing route-level protection remains responsible for access.

## Navigation Structure

Primary navigation:

| Label | Route | Notes |
| --- | --- | --- |
| Overview | `/owner/dashboard` | Default owner landing page. |
| Listings | `/owner/ready-stays` | Uses the existing Ready Stay owner listing page. Membership consolidation is deferred. |
| Reservations | `/owner/rentals` | Existing rentals page. Match routes are highlighted under Reservations but not merged. |
| Earnings | `/owner/dashboard?tab=earnings` | Existing dashboard earnings tab. A dedicated earnings overview route is deferred. |
| Payouts | `/owner/payouts` | Existing payout ledger page. |
| Notifications | `/owner/notifications` | Existing owner notifications page. |

Secondary navigation:

| Label | Route | Notes |
| --- | --- | --- |
| Account | `/owner/memberships` | Current active owner account/preferences page. |
| Resources | `/owner/ready-stays/faq` | Current owner Ready Stay FAQ. |
| Rewards | `/owner/rewards` | Existing active rewards route. |
| Support | `/support` | Existing public support route. |

Calendar and Messages are not shown because no confirmed active owner routes exist for them.

## Desktop Behavior

Desktop owner pages use a dark HannaDVC navy sidebar and warm-white application canvas. The sidebar remains fixed in the left workspace column and communicates the active route with `aria-current="page"`, restrained gold accent color and a subtle inset active indicator.

The top bar is compact and includes the current page title, support link, notifications link and owner account menu.

## Mobile Behavior

Mobile owner pages use the same top bar plus a menu button. The menu opens an accessible drawer instead of shrinking the desktop sidebar into a narrow rail.

The drawer:

- traps focus while open;
- closes with Escape;
- restores focus to the trigger;
- closes after navigation;
- prevents background scrolling while open.

## Public Header, Footer And Support

The public marketing header, footer and floating support widget are suppressed on `/owner` routes. Public, affiliate, Pixie and marketing routes keep their existing behavior.

Support remains available through the owner shell support link and secondary navigation item.

## Accessibility

The shell includes:

- semantic navigation landmarks;
- `aria-current` for active navigation items;
- decorative icon handling;
- visible keyboard focus states;
- skip-to-main-content link;
- mobile drawer focus management;
- Escape-to-close behavior.

Status is not communicated by color alone in the shell. Existing child page content remains unchanged for this phase.

## Security

No authorization logic was moved into navigation. Existing owner middleware, route guards and page-level checks remain unchanged.

The shell does not expose:

- owner IDs;
- guest PII;
- payout account details;
- banking information;
- admin-only statuses;
- private documents.

## Known Limitations

- Some owner pages still enforce access differently. Standardizing route protection remains a later security hardening task.
- Dashboard tabs and standalone pages still duplicate information architecture.
- Matches and rentals are visually grouped as Reservations in the shell but are not merged.
- Memberships and Ready Stays are not merged.
- Earnings links to the existing dashboard earnings tab until a real owner earnings overview route is built.
- Existing page internals still have inconsistent card styling, spacing and page wrappers.

## Next Phase

Phase B can redesign the owner overview dashboard content using existing data only:

- KPI cards;
- recent payout activity;
- reservation pipeline;
- needs-attention panel;
- premium empty states.

Phase B should not change payout calculations or reservation statuses.
