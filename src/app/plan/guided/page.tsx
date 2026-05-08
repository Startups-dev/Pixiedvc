import GuidedPlannerClient from "@/app/plan/guided/GuidedPlannerClient";

export default function GuidedPlannerPage() {
  return (
    <div className="min-h-screen bg-[#10224b] text-ink">
      <main className="relative mx-auto max-w-[72rem] px-6 py-12 sm:py-14">
        <GuidedPlannerClient />
      </main>
    </div>
  );
}
