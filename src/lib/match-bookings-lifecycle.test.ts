import { describe, expect, it } from "vitest";

import { runMatchBookings } from "@/lib/match-bookings";

function createQueryResult(data: unknown, error: unknown = null) {
  const result = Promise.resolve({ data, error });
  return Object.assign(result, {
    select: () => result,
    order: () => result,
    limit: () => result,
    in: () => result,
    eq: () => result,
    is: () => result,
    or: () => result,
  });
}

function makeClient(ownerLifecycleStatus: "active" | "suspended" | "deactivated") {
  const booking = {
    id: "booking-1",
    primary_resort_id: "resort-1",
    total_points: 100,
    status: "pending_match",
    check_in: "2026-06-01",
    check_out: "2026-06-05",
    availability_status: "confirmed",
    deposit_due: 99,
    deposit_paid: 99,
    guest_total_cents: 250000,
    guest_rate_per_point_cents: 2500,
    lead_guest_name: "Guest",
    lead_guest_email: "guest@example.com",
    primary_resort: {
      name: "Test Resort",
      calculator_code: "TST",
      is_resale_restricted_resort: false,
    },
    booking_matches: [],
  };

  const membership = {
    id: 101,
    owner_id: "owner-1",
    resort_id: "resort-1",
    home_resort: "TST",
    use_year_start: "2026-01-01",
    use_year_end: "2026-12-31",
    points_owned: 200,
    points_available: 200,
    points_reserved: 0,
    points_rented: 0,
    banked_points_amount: 0,
    banked_assumed_at: null,
    expired_assumed_at: null,
    borrowing_enabled: false,
    max_points_to_borrow: 0,
    matching_mode: "premium_then_standard",
    allow_standard_rate_fallback: true,
    purchase_channel: "direct",
    acquired_at: "2018-01-01",
    owner: {
      id: "owner-1",
      verification: "verified",
      lifecycle_status: ownerLifecycleStatus,
      payout_email: "owner@example.com",
      profiles: {
        id: "user-1",
        email: "owner@example.com",
        display_name: "Owner",
        payout_email: "owner@example.com",
      },
    },
  };

  return {
    from: (table: string) => {
      if (table === "booking_requests") return createQueryResult([booking]);
      if (table === "owner_memberships") return createQueryResult([membership]);
      if (table === "owner_verifications") return createQueryResult([{ owner_id: "owner-1", status: "approved" }]);
      if (table === "owner_rewards_stats") return createQueryResult([]);
      if (table === "booking_matches") return createQueryResult([]);
      return createQueryResult([]);
    },
    rpc: () => createQueryResult("match-1"),
  } as any;
}

describe("owner lifecycle matching safety", () => {
  it("keeps active owners matchable", async () => {
    const result = await runMatchBookings({
      client: makeClient("active"),
      dryRun: true,
      bookingId: "booking-1",
      sendEmails: false,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.evaluatedBookings[0]?.finalDecision).toBe("matched");
    expect(result.evaluatedBookings[0]?.candidatesEvaluated[0]?.points_available).toBe(200);
    expect(result.evaluatedBookings[0]?.candidatesEvaluated[0]?.rejectReasons).toEqual([]);
  });

  it("excludes deactivated owner points from new matching", async () => {
    const result = await runMatchBookings({
      client: makeClient("deactivated"),
      dryRun: true,
      bookingId: "booking-1",
      sendEmails: false,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.matchesCreated).toBe(0);
    expect(result.evaluatedBookings[0]?.finalDecision).toBe("skipped");
    expect(result.evaluatedBookings[0]?.skipReasons).toContain("no_eligible_candidates");
    expect(result.evaluatedBookings[0]?.candidatesEvaluated[0]?.rejectReasons).toContain("owner_inactive");
  });

  it("excludes suspended owner points from new matching", async () => {
    const result = await runMatchBookings({
      client: makeClient("suspended"),
      dryRun: true,
      bookingId: "booking-1",
      sendEmails: false,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.evaluatedBookings[0]?.finalDecision).toBe("skipped");
    expect(result.evaluatedBookings[0]?.candidatesEvaluated[0]?.rejectReasons).toContain("owner_inactive");
  });
});
