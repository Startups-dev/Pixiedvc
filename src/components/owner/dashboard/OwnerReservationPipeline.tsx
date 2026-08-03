import Link from "next/link";
import { ArrowRight, ChevronRight, ListChecks } from "lucide-react";

import type { OwnerReservationPipelineItem } from "@/lib/owner/dashboard-view-model";
import OwnerDashboardEmptyState from "./OwnerDashboardEmptyState";

export default function OwnerReservationPipeline({ items }: { items: OwnerReservationPipelineItem[] }) {
  return (
    <section className="rounded-[16px] border border-[#E7E7E4] bg-white p-6 shadow-[0_16px_45px_rgba(15,27,51,0.045)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#ECECE8] pb-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0F1B33]">Reservation pipeline</h2>
        <Link href="/owner/rentals" className="text-[13px] font-semibold text-[#0F1B33] hover:underline">
          View all
        </Link>
      </div>
      {items.length ? (
        <div className="divide-y divide-[#ECECE8]">
          {items.slice(0, 3).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group flex items-center justify-between gap-4 py-5"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#0F1B33]">{item.stageLabel}</p>
                <p className="mt-1 text-[13px] text-[#64748B]">{item.statusLabel}</p>
                {item.nextActionLabel ? <p className="mt-1 text-[12px] text-[#64748B]">{item.nextActionLabel}</p> : null}
              </div>
              <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-[#EFF6FF] px-3 text-[13px] font-semibold text-[#2563EB]">
                <ChevronRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
          <Link href="/owner/rentals" className="flex items-center gap-2 pt-5 text-[14px] font-semibold text-[#0F1B33]">
            View all reservations
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
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
