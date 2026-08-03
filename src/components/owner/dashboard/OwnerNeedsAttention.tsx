import Link from "next/link";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronRight, FileText } from "lucide-react";

import type { OwnerAttentionItem } from "@/lib/owner/dashboard-view-model";

function urgencyLabel(urgency: OwnerAttentionItem["urgency"]) {
  if (urgency === "high") return "Review soon";
  if (urgency === "medium") return "Review soon";
  return "Later";
}

function iconForSource(sourceType: OwnerAttentionItem["sourceType"]) {
  if (sourceType === "notification") return CalendarDays;
  if (sourceType === "rental") return FileText;
  return AlertCircle;
}

function toneForSource(sourceType: OwnerAttentionItem["sourceType"]) {
  if (sourceType === "notification") return "bg-[#FEF3C7] text-[#B7791F]";
  if (sourceType === "rental") return "bg-[#DBEAFE] text-[#2563EB]";
  if (sourceType === "ready_stay") return "bg-[#FEE2E2] text-[#DC2626]";
  return "bg-[#FEE2E2] text-[#DC2626]";
}

export default function OwnerNeedsAttention({ items, compact = false }: { items: OwnerAttentionItem[]; compact?: boolean }) {
  return (
    <section className="rounded-[16px] border border-[#E7E7E4] bg-white p-6 shadow-[0_16px_45px_rgba(15,27,51,0.045)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#ECECE8] pb-5">
        <div className="flex items-center gap-3">
          <AlertCircle aria-hidden="true" className="h-5 w-5 text-[#B7791F]" strokeWidth={1.8} />
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0F1B33]">Needs your attention</h2>
        </div>
        {items.length ? (
          <Link href="/owner/notifications" className="text-[13px] font-semibold text-[#0F1B33] hover:underline">
            View all
          </Link>
        ) : null}
      </div>
      {items.length ? (
        <div className="divide-y divide-[#ECECE8]">
          {items.slice(0, compact ? 3 : 5).map((item) => {
            const Icon = iconForSource(item.sourceType);
            return (
              <div key={item.id} className="flex items-center gap-4 py-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${toneForSource(item.sourceType)}`}>
                  <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[14px] font-semibold text-[#0F1B33]">{item.title}</h3>
                  <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#DC2626]">
                    {urgencyLabel(item.urgency)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#64748B]">{item.description}</p>
              </div>
              <Link href={item.href} className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#0F1B33]">
                Review
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-[12px] bg-[#FAFAF8] px-4 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-[#16A34A]" />
            <p className="text-sm text-[#0F1B33]">Nice work! You&apos;re all caught up.</p>
          </div>
        </div>
      )}
    </section>
  );
}
