import { redirect } from "next/navigation";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";
import AdminInbox from "./AdminInbox";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) redirect("/login?redirect=%2Fadmin%2Finbox&admin=1");
  if (!eligibility.isAdmin && !eligibility.isSupportAgent) redirect("/");
  const { conversation } = await searchParams;
  return <AdminInbox initialConversationId={conversation ?? null} />;
}
