import Link from "next/link";
import { WalletCards } from "lucide-react";

import type { OwnerPayoutSummary } from "@/lib/owner/dashboard-view-model";
import OwnerDashboardEmptyState from "./OwnerDashboardEmptyState";

export default function OwnerRecentPayouts({ payouts }: { payouts: OwnerPayoutSummary[] }) {
  return (
    <section className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7A8495]">Recent payouts</p>
          <h2 className="mt-2 text-xl font-semibold text-[#10224A]">Payout ledger</h2>
        </div>
        <Link href="/owner/payouts" className="text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
          View all
        </Link>
      </div>
      {payouts.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#ECECE8] text-[11px] uppercase tracking-[0.18em] text-[#7A8495]">
              <tr>
                <th className="py-3 pr-4 font-semibold">Stay</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="py-3 pl-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EC]">
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className="py-4 pr-4 font-medium text-[#10224A]">{payout.reservationLabel}</td>
                  <td className="px-4 py-4 font-semibold text-[#10224A]">{payout.amountLabel}</td>
                  <td className="px-4 py-4 text-[#667085]">{payout.stageLabel}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-[#ECE7DA] px-3 py-1 text-xs font-semibold text-[#8B6B2E]">
                      {payout.statusLabel}
                    </span>
                  </td>
                  <td className="py-4 pl-4 text-[#667085]">{payout.effectiveDateLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <OwnerDashboardEmptyState
          icon={<WalletCards aria-hidden="true" className="h-4 w-4" />}
          title="No payouts have been released yet."
          body="Released and eligible payout activity will appear here once a reservation reaches its payout milestone."
        />
      )}
    </section>
  );
}
