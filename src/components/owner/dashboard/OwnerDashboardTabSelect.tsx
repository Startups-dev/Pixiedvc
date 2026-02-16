"use client";

import { useRouter } from "next/navigation";

type OwnerDashboardTab = {
  id: string;
  label: string;
};

export default function OwnerDashboardTabSelect({
  tabs,
  activeTab,
}: {
  tabs: OwnerDashboardTab[];
  activeTab: string;
}) {
  const router = useRouter();

  return (
    <select
      value={activeTab}
      onChange={(event) => {
        router.push(`/owner/dashboard?tab=${event.target.value}`);
      }}
      className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
    >
      {tabs.map((tab) => (
        <option key={tab.id} value={tab.id}>
          {tab.label}
        </option>
      ))}
    </select>
  );
}
