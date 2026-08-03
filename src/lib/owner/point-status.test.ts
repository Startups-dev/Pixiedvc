import { describe, expect, it } from "vitest";

import {
  generatePointStatusNotifications,
  getEligibleMembershipPoints,
  getPointStatusCondition,
  parseRemindAfter,
  shouldSuppressPointStatusNotification,
  type PointStatusMembership,
} from "@/lib/owner/point-status";

function membership(overrides: Partial<PointStatusMembership> = {}): PointStatusMembership {
  return {
    id: overrides.id ?? "membership-1",
    owner_id: overrides.owner_id ?? "owner-1",
    use_year: overrides.use_year ?? "January",
    use_year_start: overrides.use_year_start ?? "2026-01-01",
    use_year_end: overrides.use_year_end ?? "2026-12-31",
    points_available: overrides.points_available ?? 160,
    points_reserved: overrides.points_reserved ?? 20,
    points_rented: overrides.points_rented ?? 10,
    banked_assumed_at: overrides.banked_assumed_at ?? null,
    banked_points_amount: overrides.banked_points_amount ?? null,
    expired_assumed_at: overrides.expired_assumed_at ?? null,
    points_expiration_date: overrides.points_expiration_date ?? null,
    resort: overrides.resort ?? { name: "Grand Floridian Villas" },
    owner: overrides.owner ?? { user_id: "owner-user-1" },
  };
}

describe("owner point-status confirmation", () => {
  it("derives eligible points server-side from authoritative membership state", () => {
    expect(getEligibleMembershipPoints(membership())).toBe(130);
  });

  it("creates a banking-deadline condition without declaring points banked", () => {
    const condition = getPointStatusCondition(membership(), new Date("2026-08-02T12:00:00.000Z"));

    expect(condition?.type).toBe("point_status_banking_deadline");
    expect(condition?.title).toBe("Review your banking deadline");
    expect(condition?.body).toContain("Please confirm whether they are still available or have been banked.");
    expect(condition?.href).toContain("membershipId=membership-1");
  });

  it("creates an expiring-soon condition before expiration", () => {
    const condition = getPointStatusCondition(
      membership({ use_year_start: "", use_year_end: "2026-09-20" }),
      new Date("2026-08-02T12:00:00.000Z"),
    );

    expect(condition?.type).toBe("point_status_expiring_soon");
    expect(condition?.title).toBe("Points are expiring soon");
  });

  it("asks for owner confirmation after recorded expiration passes", () => {
    const condition = getPointStatusCondition(membership(), new Date("2027-01-02T12:00:00.000Z"));

    expect(condition?.type).toBe("point_status_expired_confirmation_needed");
    expect(condition?.body).toContain("may have expired");
  });

  it("does not notify when no eligible points remain or points are already resolved", () => {
    expect(getPointStatusCondition(membership({ points_available: 30, points_reserved: 20, points_rented: 10 }))).toBeNull();
    expect(getPointStatusCondition(membership({ banked_assumed_at: "2026-08-02T00:00:00.000Z" }))).toBeNull();
    expect(getPointStatusCondition(membership({ expired_assumed_at: "2026-08-02T00:00:00.000Z" }))).toBeNull();
  });

  it("suppresses notifications during still-available and remind-later windows", () => {
    const now = new Date("2026-08-02T12:00:00.000Z");

    expect(
      shouldSuppressPointStatusNotification(
        [{ event_type: "point_status_still_available", note: null, created_at: "2026-07-25T12:00:00.000Z" }],
        now,
      ),
    ).toBe(true);

    expect(parseRemindAfter("source=owner_notification_action; remind_after=2026-08-09T12:00:00.000Z")?.toISOString()).toBe(
      "2026-08-09T12:00:00.000Z",
    );
    expect(
      shouldSuppressPointStatusNotification(
        [{ event_type: "point_status_remind_later", note: "source=owner_notification_action; remind_after=2026-08-09T12:00:00.000Z", created_at: null }],
        now,
      ),
    ).toBe(true);
  });

  it("generates deduped notifications from workflow data", async () => {
    const insertedNotifications: unknown[] = [];
    const client = {
      from(table: string) {
        if (table === "owner_memberships") {
          return {
            select: () => ({
              is: () => ({
                is: async () => ({
                  data: [membership()],
                }),
              }),
            }),
          };
        }
        if (table === "owner_points_events") {
          return {
            select: () => ({
              eq: () => ({
                eq: async () => ({ data: [] }),
              }),
            }),
          };
        }
        if (table === "notifications") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    is: () => ({
                      limit: async () => ({ data: [] }),
                    }),
                  }),
                }),
              }),
            }),
            insert: async (payload: unknown) => {
              insertedNotifications.push(payload);
              return { error: null };
            },
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    };

    const result = await generatePointStatusNotifications({
      client,
      now: new Date("2026-08-02T12:00:00.000Z"),
    });

    expect(result.created).toBe(1);
    expect(insertedNotifications).toEqual([
      expect.objectContaining({
        user_id: "owner-user-1",
        type: "point_status_banking_deadline",
        link: "/owner/notifications?membershipId=membership-1&pointStatus=banking_deadline",
      }),
    ]);
  });
});
