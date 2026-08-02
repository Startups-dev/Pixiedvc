import Link from "next/link";
import { Bell } from "lucide-react";

import type { OwnerActivityItem } from "@/lib/owner/dashboard-view-model";
import OwnerDashboardEmptyState from "./OwnerDashboardEmptyState";

export default function OwnerRecentActivity({ items }: { items: OwnerActivityItem[] }) {
  return (
    <section className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7A8495]">Recent activity</p>
          <h2 className="mt-2 text-xl font-semibold text-[#10224A]">Owner notifications</h2>
        </div>
        <Link href="/owner/notifications" className="text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
          View all
        </Link>
      </div>
      {items.length ? (
        <div className="mt-5 divide-y divide-[#ECECE8]">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="block py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#10224A]">{item.title}</p>
                  <p className="mt-1 text-xs text-[#667085]">{item.timestampLabel}</p>
                </div>
                {!item.read ? (
                  <span className="rounded-full border border-[#ECE7DA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6B2E]">
                    New
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
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
