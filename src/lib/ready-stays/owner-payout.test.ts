import { describe, expect, it, vi } from "vitest";

import { computeReadyStayOwnerPayout, lockReadyStayOwnerPayout } from "./owner-payout";

const owner = {
  founding_owner_bonus_cents_per_point: 200,
  founding_owner_bonus_started_at: "2026-10-15T12:00:00.000Z",
  founding_owner_bonus_expires_at: "2028-10-15T12:00:00.000Z",
};

describe("Ready Stay founding owner payout", () => {
  it("adds $2 above the selected rate without a cap even at a low margin", () => {
    expect(computeReadyStayOwnerPayout({ points: 300, standardRateCents: 2300, owner, soldAt: new Date("2027-01-01") }))
      .toEqual({ standardRateCents: 2300, bonusCents: 200, rateCents: 2500, totalCents: 750000 });
  });

  it("uses the two-year start-inclusive, end-exclusive benefit window", () => {
    const payoutAt = (soldAt: string) => computeReadyStayOwnerPayout({ points: 10, standardRateCents: 2300, owner, soldAt: new Date(soldAt) });
    expect(payoutAt("2026-10-15T11:59:59.999Z").bonusCents).toBe(0);
    expect(payoutAt("2026-10-15T12:00:00.000Z").bonusCents).toBe(200);
    expect(payoutAt("2028-10-15T11:59:59.999Z").bonusCents).toBe(200);
    expect(payoutAt("2028-10-15T12:00:00.000Z").bonusCents).toBe(0);
  });

  it("locks the rental once and returns the stored amount on replay", async () => {
    let storedAmount: number | null = null;
    const update = vi.fn((payload: { rental_amount_cents: number }) => ({
      eq: () => ({ is: () => ({ select: () => ({ maybeSingle: async () => {
        storedAmount = payload.rental_amount_cents;
        return { data: { id: "rental-1" }, error: null };
      } }) }) }),
    }));
    const adminClient = { from: (table: string) => {
      if (table === "ready_stays") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
        id: "stay-1", owner_id: "user-1", rental_id: "rental-1", points: 300,
        owner_price_per_point_cents: 2300, guest_price_per_point_cents: 2400,
        booking_request_id: "booking-1", sold_booking_request_id: null,
      }, error: null }) }) }) };
      if (table === "owners") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: owner, error: null }) }) }) };
      if (table === "rentals") return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
          id: "rental-1", match_id: null, rental_amount_cents: storedAmount,
        }, error: null }) }) }),
        update,
      };
      if (table === "pricing_promotions") return { select: () => ({ eq: () => ({ order: async () => ({ data: [{
        id: "promo-1", name: "Founders Launch", is_active: true, starts_at: null, ends_at: null,
        owner_max_bonus_per_point_cents: 0, guest_max_reward_per_point_cents: 0,
        min_spread_per_point_cents: 500, created_at: "2026-10-15T00:00:00.000Z",
      }], error: null }) }) }) };
      throw new Error(`unexpected table ${table}`);
    } };
    const params = { adminClient: adminClient as never, readyStayId: "stay-1", bookingId: "booking-1", soldAt: new Date("2027-01-01") };
    expect(await lockReadyStayOwnerPayout(params)).toBe(750000);
    expect(await lockReadyStayOwnerPayout(params)).toBe(750000);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      owner_base_rate_per_point_cents: 2300, owner_rate_per_point_cents: 2500,
      owner_total_cents: 750000, rental_amount_cents: 750000,
    }));
  });
});
