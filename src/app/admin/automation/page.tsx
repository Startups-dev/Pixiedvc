import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OutboundEmailRow = {
  id: string;
  template_key: string;
  recipient_email: string;
  subject: string;
  status: "pending" | "sent" | "failed";
  provider: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  failed_at: string | null;
  metadata: Record<string, unknown> | null;
};

type AutomationConfig = {
  key: string;
  name: string;
  purpose: string;
  templateKeys: string[];
};

const AUTOMATIONS: AutomationConfig[] = [
  {
    key: "abandoned-booking",
    name: "Abandoned booking request recovery",
    purpose: "Recovers incomplete guest booking requests before they go cold.",
    templateKeys: ["abandoned_guest_booking_request"],
  },
  {
    key: "owner-match-reminders",
    name: "Owner match reminders",
    purpose: "Reminds owners when guest requests are waiting for a match response.",
    templateKeys: ["owner_match_waiting_reminder"],
  },
  {
    key: "unsigned-agreements",
    name: "Unsigned agreement reminders",
    purpose: "Nudges owners or guests to complete sent agreements before bookings stall.",
    templateKeys: ["contract_owner_agreement_reminder", "contract_guest_agreement_reminder"],
  },
];

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusTone(status: "Healthy" | "Attention needed" | "No recent activity") {
  if (status === "Healthy") return "border-emerald-500/30 bg-emerald-500/12 text-emerald-300";
  if (status === "Attention needed") return "border-rose-500/30 bg-rose-500/12 text-rose-300";
  return "border border-amber-500/30 bg-amber-500/12 text-amber-200";
}

function buildEmailLogHref(templateKeys: string[]) {
  const first = templateKeys[0];
  return first ? `/admin/emails?template=${encodeURIComponent(first)}` : "/admin/emails";
}

export default async function AdminAutomationPage() {
  await requireAdminUser("/admin/automation");

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-2">
            <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to admin
            </Link>
            <h1 className="text-3xl font-semibold" style={{ color: "#64748b" }}>
              Automation Health
            </h1>
            <p className="text-sm text-[#b4b4b4]">Monitor scheduled email automations and recovery flows.</p>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  const templateKeys = AUTOMATIONS.flatMap((item) => item.templateKeys);
  const since24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await adminClient
    .from("outbound_emails")
    .select("id, template_key, recipient_email, subject, status, provider, error_message, created_at, sent_at, failed_at, metadata")
    .in("template_key", templateKeys)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-2">
            <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to admin
            </Link>
            <h1 className="text-3xl font-semibold" style={{ color: "#64748b" }}>
              Automation Health
            </h1>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
            <p className="text-sm text-[#ff6b6b]">Unable to load automation email logs right now.</p>
            <p className="mt-2 text-xs text-[#8e8ea0]">{error.message}</p>
          </Card>
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as OutboundEmailRow[];
  const recentRows = rows.filter((row) => row.created_at >= since24hIso);
  const totalSent24h = recentRows.filter((row) => row.status === "sent").length;
  const totalFailed24h = recentRows.filter((row) => row.status === "failed").length;

  const automationCards = AUTOMATIONS.map((automation) => {
    const automationRows = rows.filter((row) => automation.templateKeys.includes(row.template_key));
    const lastSent = automationRows.find((row) => row.status === "sent" && row.sent_at)?.sent_at ?? null;
    const sent24h = automationRows.filter((row) => row.status === "sent" && row.created_at >= since24hIso).length;
    const failed24h = automationRows.filter((row) => row.status === "failed" && row.created_at >= since24hIso).length;
    const recentAny = automationRows.some((row) => row.created_at >= since24hIso);
    const status: "Healthy" | "Attention needed" | "No recent activity" =
      failed24h > 0 ? "Attention needed" : sent24h > 0 ? "Healthy" : recentAny ? "No recent activity" : "No recent activity";

    return {
      ...automation,
      lastSent,
      sent24h,
      failed24h,
      status,
    };
  });

  const automationsNeedingAttention = automationCards.filter((item) => item.status === "Attention needed").length;

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
        <header className="space-y-3">
          <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to admin
          </Link>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
            <h1 className="text-3xl font-semibold" style={{ color: "#64748b" }}>
              Automation Health
            </h1>
            <p className="text-sm text-[#b4b4b4]">Monitor scheduled email automations and recovery flows.</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8e8ea0]">Automation Emails Sent · 24h</p>
            <p className="mt-3 text-3xl font-semibold text-[#ececec]">{totalSent24h}</p>
          </Card>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8e8ea0]">Failed Emails · 24h</p>
            <p className="mt-3 text-3xl font-semibold text-[#ececec]">{totalFailed24h}</p>
          </Card>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8e8ea0]">Automations Needing Attention</p>
            <p className="mt-3 text-3xl font-semibold text-[#ececec]">{automationsNeedingAttention}</p>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {automationCards.map((automation) => (
            <Card key={automation.key} surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#8e8ea0]">Automation</p>
                  <h2 className="text-xl font-semibold text-[#ececec]">{automation.name}</h2>
                  <p className="text-sm leading-6 text-[#b4b4b4]">{automation.purpose}</p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusTone(automation.status)}`}>
                  {automation.status}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#8e8ea0]">Template Keys</p>
                  <div className="mt-2 space-y-1 text-sm text-[#d7dae0]">
                    {automation.templateKeys.map((key) => (
                      <p key={key} className="break-all">{key}</p>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#8e8ea0]">Last Email Sent</p>
                    <p className="mt-2 text-sm text-[#ececec]">{formatDateTime(automation.lastSent)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e8ea0]">Sent · 24h</p>
                      <p className="mt-2 text-lg font-semibold text-[#ececec]">{automation.sent24h}</p>
                    </div>
                    <div className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e8ea0]">Failed · 24h</p>
                      <p className="mt-2 text-lg font-semibold text-[#ececec]">{automation.failed24h}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={buildEmailLogHref(automation.templateKeys)}
                  className="rounded-full bg-[#163566] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#21457f]"
                >
                  View Email Logs
                </Link>
              </div>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#ececec]">Recent Activity</h2>
              <p className="mt-1 text-sm text-[#b4b4b4]">Latest outbound email events for scheduled recovery automations.</p>
            </div>
            <Link
              href="/admin/emails"
              className="text-xs uppercase tracking-[0.24em] text-[#8e8ea0] transition hover:text-[#ececec]"
            >
              Open all email logs
            </Link>
          </div>

          {rows.length === 0 ? (
            <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-8 text-sm text-[#b4b4b4]">
              No outbound emails found.
            </Card>
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-[#3a3a3a] bg-[#2a2a2a]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-[#ececec]">
                  <thead className="border-b border-[#3a3a3a] bg-[#252525] text-[11px] uppercase tracking-[0.22em] text-[#8e8ea0]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Automation</th>
                      <th className="px-5 py-4 font-semibold">Template</th>
                      <th className="px-5 py-4 font-semibold">Recipient</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Created</th>
                      <th className="px-5 py-4 font-semibold">Sent</th>
                      <th className="px-5 py-4 font-semibold">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 12).map((row) => {
                      const automation = AUTOMATIONS.find((item) => item.templateKeys.includes(row.template_key));
                      const badgeClass =
                        row.status === "sent"
                          ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
                          : row.status === "failed"
                            ? "border-rose-500/30 bg-rose-500/12 text-rose-300"
                            : "border-amber-500/30 bg-amber-500/12 text-amber-200";

                      return (
                        <tr key={row.id} className="border-b border-[#323232] align-top last:border-b-0 hover:bg-white/[0.02]">
                          <td className="px-5 py-4 text-[#ececec]">{automation?.name ?? "Automation"}</td>
                          <td className="px-5 py-4 text-[#bfc4cf]">{row.template_key}</td>
                          <td className="px-5 py-4 text-[#d7dae0]">{row.recipient_email}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] border ${badgeClass}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[#b4b4b4]">{formatDateTime(row.created_at)}</td>
                          <td className="px-5 py-4 text-[#b4b4b4]">{formatDateTime(row.sent_at)}</td>
                          <td className="px-5 py-4 text-[#b4b4b4]">{row.error_message ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
