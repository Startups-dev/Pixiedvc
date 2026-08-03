import type { LucideIcon } from "lucide-react";

import type { OwnerMetricValue } from "@/lib/owner/dashboard-view-model";

type OwnerMetricCardProps = {
  label: string;
  metric: OwnerMetricValue;
  icon: LucideIcon;
  tone: "green" | "gold" | "blue" | "purple";
};

const toneClasses = {
  green: "bg-[#DCFCE7] text-[#16A34A]",
  gold: "bg-[#FEF3C7] text-[#B7791F]",
  blue: "bg-[#DBEAFE] text-[#2563EB]",
  purple: "bg-[#F3E8FF] text-[#7E22CE]",
} as const;

export default function OwnerMetricCard({ label, metric, icon: Icon, tone }: OwnerMetricCardProps) {
  const isUnavailable = metric.state === "unavailable";
  return (
    <article
      className="rounded-[16px] border border-[#E7E7E4] bg-white px-6 py-6 shadow-[0_16px_45px_rgba(15,27,51,0.045)]"
      aria-label={`${label}: ${metric.displayValue}`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#334155]">{label}</p>
          <p className={`mt-3 text-[28px] font-semibold leading-none tracking-[-0.025em] ${isUnavailable ? "text-[#7A8495]" : "text-[#0F1B33]"}`}>
            {metric.displayValue}
          </p>
          <p className="mt-4 text-[13px] leading-5 text-[#64748B]">{metric.helper}</p>
        </div>
      </div>
      {metric.warning ? (
        <p className="mt-3 text-xs leading-5 text-[#9A6B18]">{metric.warning}</p>
      ) : null}
    </article>
  );
}
