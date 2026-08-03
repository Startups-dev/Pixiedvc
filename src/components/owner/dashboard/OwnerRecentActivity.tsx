import Link from "next/link";
import { Bell, ChevronRight, FileText } from "lucide-react";

import type { OwnerActivityItem } from "@/lib/owner/dashboard-view-model";
import OwnerDashboardEmptyState from "./OwnerDashboardEmptyState";

export default function OwnerRecentActivity({ items }: { items: OwnerActivityItem[] }) {
  return (
    <section className="rounded-[16px] border border-[#E7E7E4] bg-white p-6 shadow-[0_16px_45px_rgba(15,27,51,0.045)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#ECECE8] pb-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0F1B33]">Recent activity</h2>
        <Link href="/owner/notifications" className="text-[13px] font-semibold text-[#0F1B33] hover:underline">
          View all activity
        </Link>
      </div>
      {items.length ? (
        <div className="divide-y divide-[#ECECE8]">
          {items.slice(0, 3).map((item) => {
            const Icon = item.read ? FileText : Bell;
            return (
              <Link key={item.id} href={item.href} className="group flex items-center justify-between gap-4 py-5">
                <div className="flex min-w-0 items-center gap-4">
                  <span className={item.read ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B7791F]"}>
                    <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#0F1B33]">{item.title}</p>
                    <p className="mt-1 text-[13px] text-[#64748B]">{item.read ? "Owner update" : "Unread notification"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="hidden text-[13px] text-[#64748B] sm:inline">{item.timestampLabel}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F8FAFC] text-[#0F1B33]">
                    <ChevronRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <OwnerDashboardEmptyState
          icon={<Bell aria-hidden="true" className="h-4 w-4" />}
          title="No recent activity."
          body="Owner notifications and payout updates will appear here without creating new records during dashboard rendering."
        />
      )}
    </section>
  );
}
