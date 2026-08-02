import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import type { OwnerAttentionItem } from "@/lib/owner/dashboard-view-model";

function urgencyLabel(urgency: OwnerAttentionItem["urgency"]) {
  if (urgency === "high") return "High priority";
  if (urgency === "medium") return "Review soon";
  return "Low priority";
}

export default function OwnerNeedsAttention({ items }: { items: OwnerAttentionItem[] }) {
  return (
    <section className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7A8495]">Needs attention</p>
          <h2 className="mt-2 text-xl font-semibold text-[#10224A]">
            {items.length ? "Items waiting on you" : "You're all caught up"}
          </h2>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#ECE7DA] text-[#B99545]">
          {items.length ? <AlertCircle aria-hidden="true" className="h-4 w-4" /> : <CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
        </div>
      </div>
      {items.length ? (
        <div className="mt-5 divide-y divide-[#ECECE8]">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#10224A]">{item.title}</h3>
                  <span className="rounded-full border border-[#ECE7DA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6B2E]">
                    {urgencyLabel(item.urgency)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[#667085]">{item.description}</p>
              </div>
              <Link href={item.href} className="text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
                {item.actionLabel}
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 max-w-xl text-sm leading-6 text-[#667085]">
          No owner actions are waiting right now. New matches, transfers, and payout notices will appear here when they need review.
        </p>
      )}
    </section>
  );
}
