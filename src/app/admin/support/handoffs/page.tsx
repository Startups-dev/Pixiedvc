import Link from "next/link";

import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type ConciergeHandoffRow = {
  id: string;
  status: string | null;
  created_at: string | null;
  assigned_agent_user_id: string | null;
  support_conversations:
    | {
        id: string;
        created_at: string | null;
        guest_name: string | null;
        guest_email: string | null;
        intake_message: string | null;
        page_url: string | null;
        topic: string | null;
      }
    | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const dynamic = "force-dynamic";

export default async function AdminConciergeHandoffsPage() {
  const { supabase: sessionClient } = await requireAdminUser("/admin/support/handoffs");
  const supabase = getSupabaseAdminClient() ?? sessionClient;

  const { data, error } = await supabase
    .from("support_handoffs")
    .select(
      "id, status, created_at, assigned_agent_user_id, support_conversations!inner(id, created_at, guest_name, guest_email, intake_message, page_url, topic)",
    )
    .not("support_conversations.topic", "ilike", "partner_application:%")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as ConciergeHandoffRow[];

  return (
    <main className="min-h-screen bg-[#212121] text-[#ececec]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
        <header className="space-y-2">
          <a href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            Admin
          </a>
          <h1 className="font-display text-3xl" style={{ color: "#64748b" }}>
            Concierge requests
          </h1>
          <p className="text-sm text-[#b4b4b4]">
            Human handoff requests submitted from support chat and concierge prompts.
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
            Failed to load concierge requests: {error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#2a2a2a] p-8 text-sm text-[#8e8ea0]">
            No concierge requests yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f] shadow-sm">
            <table className="min-w-full divide-y divide-[#3a3a3a] text-sm">
              <thead className="bg-[#212121] text-left text-xs font-semibold uppercase tracking-wide text-[#8e8ea0]">
                <tr>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Requester</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Source page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3a3a3a]">
                {rows.map((row) => {
                  const conversation = row.support_conversations;
                  return (
                    <tr key={row.id} className="align-top text-[#b4b4b4]">
                      <td className="px-4 py-3 text-xs text-[#8e8ea0]">
                        {row.created_at
                          ? dateFormatter.format(new Date(row.created_at))
                          : conversation?.created_at
                            ? dateFormatter.format(new Date(conversation.created_at))
                            : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#ececec]">
                          {conversation?.guest_name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-[#8e8ea0]">
                          {conversation?.guest_email ?? "No email"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="inline-flex rounded-full border border-[#3a3a3a] bg-[#212121] px-2.5 py-1 uppercase tracking-wide text-[#b4b4b4]">
                          {row.status ?? "open"}
                        </span>
                      </td>
                      <td className="max-w-lg whitespace-pre-wrap px-4 py-3 text-xs leading-5 text-[#b4b4b4]">
                        {conversation?.intake_message?.trim() || "No message provided"}
                      </td>
                      <td className="max-w-xs break-all px-4 py-3 text-xs text-[#8e8ea0]">
                        {conversation?.page_url?.trim() || "—"}
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
