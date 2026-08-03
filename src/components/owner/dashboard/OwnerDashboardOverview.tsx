import type { OwnerDashboardViewModel } from "@/lib/owner/dashboard-view-model";
import OwnerDashboardHeader from "./OwnerDashboardHeader";
import OwnerMetricGrid from "./OwnerMetricGrid";
import OwnerNeedsAttention from "./OwnerNeedsAttention";
import OwnerRecentActivity from "./OwnerRecentActivity";
import OwnerRecentPayouts from "./OwnerRecentPayouts";
import OwnerReservationPipeline from "./OwnerReservationPipeline";

export default function OwnerDashboardOverview({ viewModel }: { viewModel: OwnerDashboardViewModel }) {
  return (
    <div className="space-y-6">
      <OwnerDashboardHeader owner={viewModel.owner} />
      {viewModel.dataStatus.partial ? (
        <div className="rounded-[16px] border border-[#F6E2A8] bg-white px-5 py-4 text-sm leading-6 text-[#7A5A18]">
          Some dashboard data is partial. Available values are still shown, and unavailable rows are not guessed.
        </div>
      ) : null}
      <OwnerMetricGrid metrics={viewModel.metrics} />
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr_0.9fr]">
        <OwnerNeedsAttention items={viewModel.attentionItems} compact />
        <OwnerRecentPayouts payouts={viewModel.recentPayouts} />
        <OwnerReservationPipeline items={viewModel.reservationPipeline} />
      </div>
      <OwnerRecentActivity items={viewModel.recentActivity} />
    </div>
  );
}
