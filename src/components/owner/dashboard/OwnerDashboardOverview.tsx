import type { OwnerDashboardViewModel } from "@/lib/owner/dashboard-view-model";
import OwnerDashboardHeader from "./OwnerDashboardHeader";
import OwnerMetricGrid from "./OwnerMetricGrid";
import OwnerNeedsAttention from "./OwnerNeedsAttention";
import OwnerRecentActivity from "./OwnerRecentActivity";
import OwnerRecentPayouts from "./OwnerRecentPayouts";
import OwnerReservationPipeline from "./OwnerReservationPipeline";

export default function OwnerDashboardOverview({ viewModel }: { viewModel: OwnerDashboardViewModel }) {
  return (
    <div className="space-y-8">
      <OwnerDashboardHeader owner={viewModel.owner} />
      {viewModel.dataStatus.partial ? (
        <div className="rounded-[18px] border border-[#E8D6A8] bg-white px-5 py-4 text-sm leading-6 text-[#7A5A18]">
          Some dashboard data is partial. Available values are still shown, and unavailable rows are not guessed.
        </div>
      ) : null}
      <OwnerMetricGrid metrics={viewModel.metrics} />
      <OwnerNeedsAttention items={viewModel.attentionItems} />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <OwnerRecentPayouts payouts={viewModel.recentPayouts} />
        <OwnerReservationPipeline items={viewModel.reservationPipeline} />
      </div>
      <OwnerRecentActivity items={viewModel.recentActivity} />
    </div>
  );
}
