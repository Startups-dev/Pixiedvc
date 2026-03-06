import SupportAgentDashboard from "@/components/support/SupportAgentDashboard";

export const dynamic = "force-dynamic";

export default function SupportAgentPage() {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <SupportAgentDashboard />
      </div>
    </div>
  );
}
