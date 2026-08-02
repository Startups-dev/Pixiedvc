import type { LucideIcon } from "lucide-react";

import type { OwnerMetricValue } from "@/lib/owner/dashboard-view-model";

type OwnerMetricCardProps = {
  label: string;
  metric: OwnerMetricValue;
  icon: LucideIcon;
};

export default function OwnerMetricCard({ label, metric, icon: Icon }: OwnerMetricCardProps) {
  const isUnavailable = metric.state === "unavailable";
  return (
    <article
      className="rounded-[18px] border border-[#E7E7E4] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(16,34,74,0.04)]"
      aria-label={`${label}: ${metric.displayValue}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A8495]">{label}</p>
          <p className={`mt-4 text-3xl font-semibold tracking-tight ${isUnavailable ? "text-[#7A8495]" : "text-[#10224A]"}`}>
            {metric.displayValue}
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ECE7DA] text-[#B99545]">
          <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.7} />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#667085]">{metric.helper}</p>
      {metric.warning ? (
        <p className="mt-2 text-xs leading-5 text-[#9A6B18]">{metric.warning}</p>
      ) : null}
    </article>
  );
}
