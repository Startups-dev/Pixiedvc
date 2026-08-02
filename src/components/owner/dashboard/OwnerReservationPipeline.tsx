import Link from "next/link";
import { ListChecks } from "lucide-react";

import type { OwnerReservationPipelineItem } from "@/lib/owner/dashboard-view-model";
import OwnerDashboardEmptyState from "./OwnerDashboardEmptyState";

export default function OwnerReservationPipeline({ items }: { items: OwnerReservationPipelineItem[] }) {
  return (
    <section className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7A8495]">Reservation pipeline</p>
          <h2 className="mt-2 text-xl font-semibold text-[#10224A]">Active workflows</h2>
        </div>
        <Link href="/owner/rentals" className="text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
          View reservations
        </Link>
      </div>
      {items.length ? (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-[14px] border border-[#ECECE8] bg-white p-4 transition hover:border-[#D9C690]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#10224A]">{item.label}</p>
                  <p className="mt-1 text-sm text-[#667085]">{item.resortLabel}</p>
                  <p className="mt-1 text-xs text-[#7A8495]">{item.dateLabel}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-semibold text-[#10224A]">{item.stageLabel}</p>
                  <p className="mt-1 text-xs text-[#667085]">{item.statusLabel}</p>
                  {item.nextActionLabel ? (
                    <p className="mt-2 text-xs font-semibold text-[#8B6B2E]">{item.nextActionLabel}</p>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <OwnerDashboardEmptyState
          icon={<ListChecks aria-hidden="true" className="h-4 w-4" />}
          title="No active reservations."
          body="New owner matches and confirmed reservation workflows will appear here when they are active."
        />
      )}
    </section>
  );
}
