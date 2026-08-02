import type { PayoutLedgerRow } from "@/lib/owner-data";
import {
  isExcludedOwnerPayoutStatus,
  isPendingOwnerPayoutStatus,
  isReleasedOwnerPayoutStatus,
} from "@/lib/owner/status-labels";

export type OwnerMoneySummaryValue = {
  cents: number;
  rowCount: number;
  partial: boolean;
  unavailable: boolean;
  warnings: string[];
};

export type OwnerFinancialSummary = {
  totalEarned: OwnerMoneySummaryValue;
  pendingPayout: OwnerMoneySummaryValue;
};

function emptyValue(): OwnerMoneySummaryValue {
  return {
    cents: 0,
    rowCount: 0,
    partial: false,
    unavailable: false,
    warnings: [],
  };
}

function isValidAmount(amount: unknown): amount is number {
  return typeof amount === "number" && Number.isInteger(amount) && amount >= 0;
}

export function summarizeOwnerPayoutLedger(payouts: PayoutLedgerRow[]): OwnerFinancialSummary {
  const totalEarned = emptyValue();
  const pendingPayout = emptyValue();
  const seen = new Set<string>();

  for (const payout of payouts) {
    if (seen.has(payout.id)) {
      totalEarned.partial = true;
      pendingPayout.partial = true;
      totalEarned.warnings.push(`Duplicate payout row ignored: ${payout.id}`);
      pendingPayout.warnings.push(`Duplicate payout row ignored: ${payout.id}`);
      continue;
    }
    seen.add(payout.id);

    if (!isValidAmount(payout.amount_cents)) {
      totalEarned.partial = true;
      pendingPayout.partial = true;
      totalEarned.warnings.push(`Payout row has an unavailable amount: ${payout.id}`);
      pendingPayout.warnings.push(`Payout row has an unavailable amount: ${payout.id}`);
      continue;
    }

    if (isReleasedOwnerPayoutStatus(payout.status)) {
      totalEarned.cents += payout.amount_cents;
      totalEarned.rowCount += 1;
      continue;
    }

    if (isPendingOwnerPayoutStatus(payout.status)) {
      pendingPayout.cents += payout.amount_cents;
      pendingPayout.rowCount += 1;
      continue;
    }

    if (isExcludedOwnerPayoutStatus(payout.status)) {
      continue;
    }

    totalEarned.partial = true;
    pendingPayout.partial = true;
    totalEarned.warnings.push(`Payout row has an unknown status: ${payout.status ?? "missing"}`);
    pendingPayout.warnings.push(`Payout row has an unknown status: ${payout.status ?? "missing"}`);
  }

  return { totalEarned, pendingPayout };
}
