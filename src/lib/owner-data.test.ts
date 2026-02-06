import { describe, expect, it } from "vitest";

import { getPointsSummary } from "./owner-data";

describe("getPointsSummary", () => {
  it("reduces availability by banked points amount", () => {
    const summary = getPointsSummary([
      {
        id: "1",
        owner_id: "owner",
        resort_id: "resort",
        home_resort: null,
        use_year: "September",
        use_year_start: "2026-09-01",
        use_year_end: "2027-08-31",
        points_owned: 120,
        points_available: 120,
        points_reserved: 0,
        points_rented: 0,
        points_expiration_date: null,
        banked_points_amount: 25,
        banked_assumed_at: null,
        expired_assumed_at: null,
        purchase_channel: null,
        acquired_at: null,
        resort: null,
      },
    ]);

    expect(summary.available).toBe(95);
  });
});
