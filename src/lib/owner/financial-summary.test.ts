import { describe, expect, it } from "vitest";

import type { PayoutLedgerRow } from "@/lib/owner-data";
import { summarizeOwnerPayoutLedger } from "@/lib/owner/financial-summary";

function payout(overrides: Partial<PayoutLedgerRow>): PayoutLedgerRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    rental_id: overrides.rental_id ?? "rental-1",
    owner_user_id: overrides.owner_user_id ?? "owner-user",
    stage: overrides.stage ?? 70,
    amount_cents: overrides.amount_cents ?? 0,
    status: overrides.status ?? "pending",
    eligible_at: overrides.eligible_at ?? null,
    released_at: overrides.released_at ?? null,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("summarizeOwnerPayoutLedger", () => {
  it("counts released payout rows toward total earned only", () => {
    const summary = summarizeOwnerPayoutLedger([
      payout({ id: "released-1", status: "released", amount_cents: 12345 }),
      payout({ id: "pending-1", status: "pending", amount_cents: 4000 }),
      payout({ id: "eligible-1", status: "eligible", amount_cents: 6000 }),
    ]);

    expect(summary.totalEarned.cents).toBe(12345);
    expect(summary.totalEarned.rowCount).toBe(1);
    expect(summary.pendingPayout.cents).toBe(10000);
    expect(summary.pendingPayout.rowCount).toBe(2);
  });

  it("excludes failed rows and preserves integer cents exactly", () => {
    const summary = summarizeOwnerPayoutLedger([
      payout({ id: "released-1", status: "released", amount_cents: 10001 }),
      payout({ id: "failed-1", status: "failed", amount_cents: 999999 }),
    ]);

    expect(summary.totalEarned.cents).toBe(10001);
    expect(summary.pendingPayout.cents).toBe(0);
    expect(summary.totalEarned.partial).toBe(false);
  });

  it("does not double-count duplicate ledger IDs", () => {
    const row = payout({ id: "duplicate", status: "released", amount_cents: 5000 });
    const summary = summarizeOwnerPayoutLedger([row, row]);

    expect(summary.totalEarned.cents).toBe(5000);
    expect(summary.totalEarned.partial).toBe(true);
    expect(summary.totalEarned.warnings[0]).toContain("Duplicate payout row ignored");
  });

  it("marks unknown payout statuses as partial instead of guessing", () => {
    const summary = summarizeOwnerPayoutLedger([
      payout({ id: "unknown", status: "scheduled", amount_cents: 5000 }),
    ]);

    expect(summary.totalEarned.cents).toBe(0);
    expect(summary.pendingPayout.cents).toBe(0);
    expect(summary.totalEarned.partial).toBe(true);
    expect(summary.pendingPayout.partial).toBe(true);
  });
});
