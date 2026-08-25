import { describe, expect, it } from "vitest";

import type { NotificationRow, OwnerMembership } from "@/lib/owner-data";
import {
  buildOwnerMembershipListItems,
  buildOwnerNotificationListItems,
  buildOwnerReadyStayListItems,
  buildOwnerRewardSummary,
  filterOwnerReadyStayItems,
} from "@/lib/owner/secondary-subpages";

function membership(overrides: Partial<OwnerMembership>): OwnerMembership {
  return {
    id: overrides.id ?? "membership-1",
    owner_id: "owner-1",
    resort_id: "resort-1",
    home_resort: overrides.home_resort ?? null,
    resort: overrides.resort ?? { name: "Beach Club Villas", slug: "beach-club-villas", calculator_code: "BCV" },
    use_year: overrides.use_year ?? "February",
    use_year_start: overrides.use_year_start ?? "2026-02-01",
    use_year_end: overrides.use_year_end ?? "2027-01-31",
    points_owned: overrides.points_owned ?? 200,
    points_available: overrides.points_available ?? 120,
    points_reserved: overrides.points_reserved ?? 50,
    points_rented: overrides.points_rented ?? 30,
    points_expiration_date: overrides.points_expiration_date ?? "2027-01-31",
    purchase_channel: overrides.purchase_channel ?? null,
    acquired_at: overrides.acquired_at ?? null,
    matching_mode: overrides.matching_mode ?? "premium_only",
    allow_standard_rate_fallback: overrides.allow_standard_rate_fallback ?? false,
    premium_only_listed_at: overrides.premium_only_listed_at ?? null,
    last_fallback_prompted_at: overrides.last_fallback_prompted_at ?? null,
    fallback_remind_at: overrides.fallback_remind_at ?? null,
  };
}

function notification(overrides: Partial<NotificationRow>): NotificationRow {
  return {
    id: overrides.id ?? "notification-1",
    type: overrides.type ?? "owner",
    title: overrides.title ?? "Payout released",
    body: overrides.body ?? null,
    link: overrides.link ?? "/owner/payouts",
    read_at: overrides.read_at ?? null,
    created_at: overrides.created_at ?? "2026-08-02T00:00:00.000Z",
  };
}

describe("owner secondary subpage view models", () => {
  it("maps Ready Stay statuses without exposing raw enums", () => {
    const items = buildOwnerReadyStayListItems([
      {
        id: "stay-active",
        status: "active",
        verification_status: "approved",
        check_in: "2026-10-10",
        check_out: "2026-10-17",
        room_type: "Deluxe Studio",
        points: 120,
        owner_price_per_point_cents: 2000,
        reservation_proof_uploaded_at: "2026-08-01T00:00:00.000Z",
        is_visible_publicly: true,
        slug: "beach-club-october",
        title: "Beach Club Villas Ready Stay",
        image_url: "https://hannadvc.test/storage/v1/object/public/resorts/beach-club-villa/BCV1.png",
        updated_at: "2026-08-02T00:00:00.000Z",
        resorts: { name: "Beach Club Villas" },
      },
      {
        id: "stay-review",
        status: "draft",
        verification_status: "proof_uploaded",
        check_in: null,
        check_out: null,
        room_type: null,
        points: null,
        owner_price_per_point_cents: null,
        updated_at: null,
        resorts: null,
      },
    ]);

    expect(items[0].statusLabel).toBe("Active");
    expect(items[0].displayStatusLabel).toBe("LIVE");
    expect(items[0].displayStatusDescription).toBe("Visible to guests");
    expect(items[0].publicHref).toBe("/ready-stays/stay-active");
    expect(items[0].estimatedOwnerPayoutLabel).toBe("$2,400");
    expect(items[1].statusLabel).toBe("Submitted for review");
    expect(items[1].displayStatusLabel).toBe("IN REVIEW");
    expect(items[0].imageUrl).toContain("/storage/v1/object/public/resorts/");
    expect(items.map((item) => item.statusLabel)).not.toContain("proof_uploaded");
    expect(filterOwnerReadyStayItems(items, "active")).toHaveLength(1);
    expect(filterOwnerReadyStayItems(items, "action_required")).toHaveLength(1);
  });

  it("maps memberships using existing point semantics", () => {
    const items = buildOwnerMembershipListItems([
      membership({ points_owned: 300, points_available: 175, matching_mode: "premium_then_standard" }),
    ]);

    expect(items[0].resortLabel).toBe("Beach Club Villas");
    expect(items[0].totalPointsLabel).toBe("300 pts");
    expect(items[0].availablePointsLabel).toBe("175 pts");
    expect(items[0].matchingModeLabel).toBe("Try Premium then Standard");
  });

  it("maps rewards without treating bonus as released earnings", () => {
    const summary = buildOwnerRewardSummary({
      enrolled: true,
      enrollmentEnabled: true,
      lifetimePoints: 650,
      tier: "tier2",
      bonusCents: 100,
    });

    expect(summary.statusLabel).toBe("Enrolled");
    expect(summary.lifetimePointsLabel).toBe("650 pts");
    expect(summary.bonusLabel).toBe("+$1.00/pt");
  });

  it("redacts notification contact data and blocks non-owner links", () => {
    const items = buildOwnerNotificationListItems([
      notification({
        title: "Contact guest@example.com",
        body: "Call 555-111-2222 for details",
        link: "https://example.com/private",
      }),
    ]);

    expect(items[0].title).toBe("Contact [email removed]");
    expect(items[0].body).toBe("Call [phone removed] for details");
    expect(items[0].href).toBeNull();
    expect(items[0]).not.toHaveProperty("type");
  });

  it("maps point-status notifications to safe owner actions without exposing raw types", () => {
    const items = buildOwnerNotificationListItems([
      notification({
        type: "point_status_banking_deadline",
        title: "Review your banking deadline",
        body: "Please confirm whether points are still available or banked.",
        link: "/owner/notifications?membershipId=membership-1&pointStatus=banking_deadline",
      }),
      notification({
        id: "notification-2",
        type: "point_status_expired_confirmation_needed",
        title: "Confirm the status of expired points",
        link: "/owner/notifications?membershipId=membership-2&pointStatus=expired_confirmation",
      }),
    ]);

    expect(items[0].pointStatusAction).toEqual({
      membershipId: "membership-1",
      actions: ["mark_banked", "still_available", "remind_later"],
      contextLabel: "Banking deadline review",
    });
    expect(items[1].pointStatusAction?.actions).toEqual(["mark_expired", "still_available", "remind_later"]);
    expect(items[0]).not.toHaveProperty("type");
  });
});
