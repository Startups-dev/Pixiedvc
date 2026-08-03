import type { OwnerDashboardViewModel } from "@/lib/owner/dashboard-view-model";

export default function OwnerDashboardHeader({ owner }: { owner: OwnerDashboardViewModel["owner"] }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <header className="flex flex-col gap-3">
      <div className="max-w-3xl">
        <h1 className="text-[32px] font-semibold tracking-[-0.035em] text-[#0F1B33] md:text-[36px]">
          {greeting}, {owner.displayName} <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-[#64748B]">
          Here&apos;s what&apos;s happening with your DVC ownership today.
        </p>
      </div>
    </header>
  );
}
