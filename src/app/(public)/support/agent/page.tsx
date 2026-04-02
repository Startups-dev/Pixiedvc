import SupportAgentDashboard from "@/components/support/SupportAgentDashboard";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SupportAgentPage() {
  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) {
    redirect(`/login?redirect=${encodeURIComponent("/support/agent")}`);
  }
  if (!eligibility.isAdmin && !eligibility.isSupportAgent) {
    redirect("/");
  }
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <SupportAgentDashboard />
      </div>
    </div>
  );
}
