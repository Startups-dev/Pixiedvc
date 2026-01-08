import GuidedPlannerClient from "@/app/plan/guided/GuidedPlannerClient";

export default function GuidedPlannerPage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <main className="mx-auto max-w-5xl px-6 py-20">
        <GuidedPlannerClient />
      </main>
    </div>
  );
}
