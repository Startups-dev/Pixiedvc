import { Castle, CalendarCheck2, Clock3, DollarSign } from "lucide-react";

import type { OwnerDashboardViewModel } from "@/lib/owner/dashboard-view-model";
import OwnerMetricCard from "./OwnerMetricCard";

export default function OwnerMetricGrid({ metrics }: { metrics: OwnerDashboardViewModel["metrics"] }) {
  return (
    <section aria-label="Owner dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <OwnerMetricCard label="Total earned" metric={metrics.totalEarned} icon={DollarSign} tone="green" />
      <OwnerMetricCard label="Pending payout" metric={metrics.pendingPayout} icon={Clock3} tone="gold" />
      <OwnerMetricCard label="Active reservations" metric={metrics.activeReservations} icon={CalendarCheck2} tone="blue" />
      <OwnerMetricCard label="Confirmed stays" metric={metrics.confirmedStays} icon={Castle} tone="purple" />
    </section>
  );
}
