import OwnerStatusBadge from "@/components/owner/shell/OwnerStatusBadge";
import type { OwnerDashboardViewModel } from "@/lib/owner/dashboard-view-model";

export default function OwnerDashboardHeader({ owner }: { owner: OwnerDashboardViewModel["owner"] }) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B99545]">Owner workspace</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#10224A] md:text-5xl">
          Owner Earnings
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#667085]">
          Track your reservations, earnings, payouts, and actions that need attention.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-[#E7E7E4] bg-white px-4 py-2 text-xs font-semibold text-[#10224A]">
          {owner.displayName}
        </span>
        <OwnerStatusBadge />
      </div>
    </header>
  );
}
