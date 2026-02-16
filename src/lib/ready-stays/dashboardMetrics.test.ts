import { describe, expect, it, vi } from "vitest";

import {
  computeReadyStayDashboardMetrics,
  type ReadyStayDashboardMetricsRow,
} from "@/lib/ready-stays/dashboardMetrics";

describe("computeReadyStayDashboardMetrics", () => {
  it("applies UTC year boundary rules for sold metrics", () => {
    const rows: ReadyStayDashboardMetricsRow[] = [
      {
        status: "sold",
        sold_at: "2025-12-31T23:59:59.999Z",
        listed_at: "2025-12-30T00:00:00.000Z",
        created_at: "2025-12-20T00:00:00.000Z",
        owner_price_per_point_cents: 2000,
        points: 100,
      },
      {
        status: "sold",
        sold_at: "2026-01-01T00:00:00.000Z",
        listed_at: "2025-12-31T00:00:00.000Z",
        created_at: "2025-12-30T00:00:00.000Z",
        owner_price_per_point_cents: 2200,
        points: 50,
      },
      {
        status: "sold",
        sold_at: "2027-01-01T00:00:00.000Z",
        listed_at: "2026-12-31T00:00:00.000Z",
        created_at: "2026-12-25T00:00:00.000Z",
        owner_price_per_point_cents: 2500,
        points: 40,
      },
    ];

    const result = computeReadyStayDashboardMetrics(rows, new Date("2026-06-15T00:00:00.000Z"));
    expect(result.soldThisYear).toBe(1);
    expect(result.totalRevenueCents).toBe(110000);
  });

  it("excludes sold rows with sold_at null from sold and avg metrics", () => {
    const rows: ReadyStayDashboardMetricsRow[] = [
      {
        status: "sold",
        sold_at: null,
        listed_at: "2026-03-01T00:00:00.000Z",
        created_at: "2026-02-28T00:00:00.000Z",
        owner_price_per_point_cents: 2000,
        points: 100,
      },
    ];

    const result = computeReadyStayDashboardMetrics(rows, new Date("2026-06-15T00:00:00.000Z"));
    expect(result.soldThisYear).toBe(0);
    expect(result.totalRevenueCents).toBe(0);
    expect(result.avgTimeToSellDays).toBeNull();
  });

  it("uses listed_at fallback to created_at for avg time to sell", () => {
    const rows: ReadyStayDashboardMetricsRow[] = [
      {
        status: "sold",
        sold_at: "2026-04-12T00:00:00.000Z",
        listed_at: null,
        created_at: "2026-04-10T00:00:00.000Z",
        owner_price_per_point_cents: 2000,
        points: 60,
      },
      {
        status: "sold",
        sold_at: "2026-04-15T12:00:00.000Z",
        listed_at: "2026-04-14T00:00:00.000Z",
        created_at: "2026-04-10T00:00:00.000Z",
        owner_price_per_point_cents: 2200,
        points: 40,
      },
    ];

    const result = computeReadyStayDashboardMetrics(rows, new Date("2026-06-15T00:00:00.000Z"));
    expect(result.soldThisYear).toBe(2);
    expect(result.avgTimeToSellDays).toBe(2);
  });

  it("excludes negative durations from avg calculation", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rows: ReadyStayDashboardMetricsRow[] = [
      {
        status: "sold",
        sold_at: "2026-05-01T00:00:00.000Z",
        listed_at: "2026-05-03T00:00:00.000Z",
        created_at: "2026-05-01T00:00:00.000Z",
        owner_price_per_point_cents: 2000,
        points: 80,
      },
      {
        status: "sold",
        sold_at: "2026-05-05T00:00:00.000Z",
        listed_at: "2026-05-03T00:00:00.000Z",
        created_at: "2026-05-01T00:00:00.000Z",
        owner_price_per_point_cents: 2000,
        points: 80,
      },
    ];

    const result = computeReadyStayDashboardMetrics(rows, new Date("2026-06-15T00:00:00.000Z"));
    expect(result.avgTimeToSellDays).toBe(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it("returns empty-state defaults when there are no eligible sold rows", () => {
    const rows: ReadyStayDashboardMetricsRow[] = [
      {
        status: "active",
        created_at: "2026-06-10T00:00:00.000Z",
        owner_price_per_point_cents: 2000,
        points: 50,
      },
      {
        status: "sold",
        sold_at: null,
        created_at: "2026-05-10T00:00:00.000Z",
        owner_price_per_point_cents: 2200,
        points: 45,
      },
    ];

    const result = computeReadyStayDashboardMetrics(rows, new Date("2026-06-15T00:00:00.000Z"));
    expect(result.soldThisYear).toBe(0);
    expect(result.totalRevenueCents).toBe(0);
    expect(result.avgTimeToSellDays).toBeNull();
  });
});
