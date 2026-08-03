import Link from "next/link";
import { ArrowRight, WalletCards } from "lucide-react";

import type { OwnerPayoutSummary } from "@/lib/owner/dashboard-view-model";
import OwnerDashboardEmptyState from "./OwnerDashboardEmptyState";

export default function OwnerRecentPayouts({ payouts }: { payouts: OwnerPayoutSummary[] }) {
  return (
    <section className="rounded-[16px] border border-[#E7E7E4] bg-white p-6 shadow-[0_16px_45px_rgba(15,27,51,0.045)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#ECECE8] pb-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0F1B33]">Recent payouts</h2>
        <Link href="/owner/payouts" className="text-[13px] font-semibold text-[#0F1B33] hover:underline">
          View all
        </Link>
      </div>
      {payouts.length ? (
        <div className="divide-y divide-[#ECECE8]">
          {payouts.slice(0, 3).map((payout) => (
            <div key={payout.id} className="flex items-start justify-between gap-4 py-5">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[#0F1B33]">{payout.reservationLabel}</p>
                <p className="mt-1 text-[13px] text-[#64748B]">{payout.effectiveDateLabel}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[14px] font-semibold text-[#16A34A]">{payout.amountLabel}</p>
                <p className="mt-1 text-[12px] text-[#16A34A]">{payout.statusLabel}</p>
              </div>
            </div>
          ))}
          <Link href="/owner/payouts" className="flex items-center gap-2 pt-5 text-[14px] font-semibold text-[#0F1B33]">
            View all payouts
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
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
