import Link from "next/link";

import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type PartnerConversationRow = {
  id: string;
  created_at: string | null;
  guest_name: string | null;
  guest_email: string | null;
  topic: string | null;
  intake_message: string | null;
  context: Record<string, unknown> | null;
  support_handoffs:
    | {
        status: string | null;
        assigned_agent_user_id: string | null;
        created_at: string | null;
      }[]
    | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function labelPartnershipType(topic: string | null, context: Record<string, unknown> | null) {
  const fromContext = typeof context?.partnership_type === "string" ? context.partnership_type : null;
  const raw = fromContext ?? topic?.replace("partner_application:", "") ?? "unknown";
  switch (raw) {
    case "advisor":
      return "Advisor";
    case "affiliate":
      return "Affiliate";
    case "service":
      return "Service";
    default:
      return raw;
  }
}

export const dynamic = "force-dynamic";

export default async function AdminPartnerApplicationsPage() {
  await requireAdminUser("/admin/partners/applications");
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return (
      <main className="min-h-screen bg-[#212121] text-[#ececec]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="rounded-2xl border border-rose-500/30 bg-rose-900/20 p-4 text-sm text-rose-200">
            Admin client is not configured. Set <code>SUPABASE_SERVICE_ROLE_KEY</code> to access partner applications.
          </p>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("support_conversations")
    .select(
      "id, created_at, guest_name, guest_email, topic, intake_message, context, support_handoffs(status, assigned_agent_user_id, created_at)",
    )
    .ilike("topic", "partner_application:%")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = ((data ?? []) as PartnerConversationRow[]).filter((row) => row.topic?.startsWith("partner_application:"));

  return (
    <main className="min-h-screen bg-[#212121] text-[#ececec]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
        <header className="space-y-2">
          <a href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            Admin
          </a>
          <h1 className="font-display text-3xl" style={{ color: "#64748b" }}>
            Partner applications
          </h1>
          <p className="text-sm text-[#b4b4b4]">
            Inbound applications from the /partners/apply form.
          </p>
          <div className="pt-2">
            <Link
              href="/admin"
              className="inline-flex rounded-full border border-[#3a3a3a] bg-[#212121] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b4b4b4] hover:bg-[#171717] hover:text-[#ececec]"
            >
              Back to Admin
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-900/20 p-4 text-sm text-rose-200">
            Failed to load partner applications: {error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#2a2a2a] p-8 text-sm text-[#8e8ea0]">
            No partner applications yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f] shadow-sm">
            <table className="min-w-full divide-y divide-[#3a3a3a] text-sm">
              <thead className="bg-[#212121] text-left text-xs font-semibold uppercase tracking-wide text-[#8e8ea0]">
                <tr>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3a3a3a]">
                {rows.map((row) => {
                  const handoff = row.support_handoffs?.[0];
                  return (
                    <tr key={row.id} className="align-top text-[#b4b4b4]">
                      <td className="px-4 py-3 text-xs text-[#8e8ea0]">
                        {row.created_at ? dateFormatter.format(new Date(row.created_at)) : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#ececec]">{labelPartnershipType(row.topic, row.context)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#ececec]">{row.guest_name ?? "Unknown"}</div>
                        <div className="text-xs text-[#8e8ea0]">{row.guest_email ?? "No email"}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="inline-flex rounded-full border border-[#3a3a3a] bg-[#212121] px-2.5 py-1 uppercase tracking-wide text-[#b4b4b4]">
                          {handoff?.status ?? "handoff"}
                        </span>
                      </td>
                      <td className="max-w-xl whitespace-pre-wrap px-4 py-3 text-xs leading-5 text-[#b4b4b4]">
                        {row.intake_message ?? "No details provided"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
