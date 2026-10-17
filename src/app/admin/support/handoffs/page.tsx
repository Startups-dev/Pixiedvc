import { redirect } from "next/navigation";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";

export default async function LegacySupportHandoffsPage() {
  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) redirect("/login?redirect=%2Fadmin%2Finbox&admin=1");
  if (!eligibility.isAdmin && !eligibility.isSupportAgent) redirect("/");
  redirect("/admin/inbox");
}
