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

type AutomationRunRow = {
  id: string;
  automation_key: string;
  status: "running" | "completed" | "completed_with_errors" | "failed";
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  candidates: number;
  sent: number;
  skipped: number;
  errors: number;
  last_error: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type AutomationConfig = {
  key: string;
  name: string;
  purpose: string;
  templateKeys: string[];
};

const AUTOMATIONS: AutomationConfig[] = [
  {
    key: "abandoned_booking_request_recovery",
    name: "Abandoned booking request recovery",
    purpose: "Recovers incomplete guest booking requests before they go cold.",
    templateKeys: ["abandoned_guest_booking_request"],
  },
  {
    key: "owner_match_reminders",
    name: "Owner match reminders",
    purpose: "Reminds owners when guest requests are waiting for a match response.",
    templateKeys: ["owner_match_waiting_reminder"],
  },
  {
    key: "unsigned_agreement_reminders",
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

function formatDuration(value: number | null) {
  if (!value || value < 0) return "—";
  if (value < 1000) return `${value}ms`;
  if (value < 60_000) return `${(value / 1000).toFixed(1)}s`;
  return `${(value / 60_000).toFixed(1)}m`;
}

function buildEmailLogHref(templateKeys: string[]) {
  const first = templateKeys[0];
  return first ? `/admin/emails?template=${encodeURIComponent(first)}` : "/admin/emails";
}

function runStatusTone(status: "completed" | "completed_with_errors" | "failed" | "idle") {
  if (status === "completed") return "border-emerald-500/30 bg-emerald-500/12 text-emerald-300";
  if (status === "completed_with_errors") return "border-amber-500/30 bg-amber-500/12 text-amber-200";
  if (status === "failed") return "border-rose-500/30 bg-rose-500/12 text-rose-300";
  return "border-[#4a4a4a] bg-[#252525] text-[#b4b4b4]";
}

function runStatusLabel(status: "completed" | "completed_with_errors" | "failed" | "idle") {
  if (status === "completed") return "Healthy";
  if (status === "completed_with_errors") return "Attention needed";
  if (status === "failed") return "Failed";
  return "No recent runs";
}

export default async function AdminAutomationPage() {
  await requireAdminUser("/admin/automation");

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
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
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  const automationKeys = AUTOMATIONS.map((item) => item.key);
  const templateKeys = AUTOMATIONS.flatMap((item) => item.templateKeys);
  const since24hIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: runData, error: runError }, { data: emailData, error: emailError }] = await Promise.all([
    adminClient
      .from("automation_runs")
      .select("id, automation_key, status, started_at, completed_at, duration_ms, candidates, sent, skipped, errors, last_error, metadata, created_at")
      .in("automation_key", automationKeys)
      .order("started_at", { ascending: false })
      .limit(100),
    adminClient
      .from("outbound_emails")
      .select("id, template_key, recipient_email, subject, status, provider, error_message, created_at, sent_at, failed_at, metadata")
      .in("template_key", templateKeys)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (runError || emailError) {
    const message = runError?.message ?? emailError?.message ?? "Unknown error";
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
            </div>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
            <p className="text-sm text-[#ff6b6b]">Unable to load automation health data right now.</p>
            <p className="mt-2 text-xs text-[#8e8ea0]">{message}</p>
          </Card>
        </div>
      </div>
    );
  }

  const runs = (runData ?? []) as AutomationRunRow[];
  const rows = (emailData ?? []) as OutboundEmailRow[];
  const recentEmailRows = rows.filter((row) => row.created_at >= since24hIso);

  const totalSent24h = recentEmailRows.filter((row) => row.status === "sent").length;
  const totalFailed24h = recentEmailRows.filter((row) => row.status === "failed").length;

  const latestRunMap = new Map<string, AutomationRunRow>();
  for (const run of runs) {
    if (!latestRunMap.has(run.automation_key)) {
      latestRunMap.set(run.automation_key, run);
    }
  }

  const automationCards = AUTOMATIONS.map((automation) => {
    const latestRun = latestRunMap.get(automation.key) ?? null;
    const automationRows = rows.filter((row) => automation.templateKeys.includes(row.template_key));
    const sent24h = automationRows.filter((row) => row.status === "sent" && row.created_at >= since24hIso).length;
    const failed24h = automationRows.filter((row) => row.status === "failed" && row.created_at >= since24hIso).length;
    const lastSent = automationRows.find((row) => row.status === "sent" && row.sent_at)?.sent_at ?? null;
    const latestRunAgeMs = latestRun ? Date.now() - new Date(latestRun.started_at).getTime() : Number.POSITIVE_INFINITY;

    const status: "completed" | "completed_with_errors" | "failed" | "idle" =
      !latestRun || latestRunAgeMs > 24 * 60 * 60 * 1000 ? "idle" : latestRun.status;

    return {
      ...automation,
      latestRun,
      status,
      sent24h,
      failed24h,
      lastSent,
    };
  });

  const automationsNeedingAttention = automationCards.filter(
    (item) => item.status === "failed" || item.status === "completed_with_errors",
  ).length;

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-7xl space-y-10 px-6 py-12 text-[#ececec]">
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
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${runStatusTone(
                    automation.status,
                  )}`}
                >
                  {runStatusLabel(automation.status)}
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e8ea0]">Last Job Run</p>
                  <p className="mt-2 text-sm text-[#ececec]">{formatDateTime(automation.latestRun?.started_at ?? null)}</p>
                </div>
                <div className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e8ea0]">Last Runtime</p>
                  <p className="mt-2 text-sm text-[#ececec]">{formatDuration(automation.latestRun?.duration_ms ?? null)}</p>
                </div>
                <div className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e8ea0]">Candidates</p>
                  <p className="mt-2 text-lg font-semibold text-[#ececec]">{automation.latestRun?.candidates ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e8ea0]">Sent</p>
                  <p className="mt-2 text-lg font-semibold text-[#ececec]">{automation.latestRun?.sent ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e8ea0]">Skipped</p>
                  <p className="mt-2 text-lg font-semibold text-[#ececec]">{automation.latestRun?.skipped ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8e8ea0]">Errors</p>
                  <p className="mt-2 text-lg font-semibold text-[#ececec]">{automation.latestRun?.errors ?? 0}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#8e8ea0]">Template Keys</p>
                  <div className="mt-2 space-y-1 text-sm text-[#d7dae0]">
                    {automation.templateKeys.map((key) => (
                      <p key={key} className="break-all">
                        {key}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#8e8ea0]">Last Email Sent</p>
                    <p className="mt-2 text-sm text-[#ececec]">{formatDateTime(automation.lastSent)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#8e8ea0]">Email Stats · 24h</p>
                    <p className="mt-2 text-sm text-[#ececec]">
                      {automation.sent24h} sent · {automation.failed24h} failed
                    </p>
                  </div>
                </div>
                {automation.latestRun?.last_error ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#8e8ea0]">Last Error</p>
                    <p className="mt-2 text-sm text-[#ffb4b4]">{automation.latestRun.last_error}</p>
                  </div>
                ) : null}
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
          <div>
            <h2 className="text-xl font-semibold text-[#ececec]">Recent Automation Runs</h2>
            <p className="mt-1 text-sm text-[#b4b4b4]">Latest scheduled automation executions, including partial-error runs.</p>
          </div>

          {runs.length === 0 ? (
            <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-8 text-sm text-[#b4b4b4]">
              No automation runs found.
            </Card>
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-[#3a3a3a] bg-[#2a2a2a]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-[#ececec]">
                  <thead className="border-b border-[#3a3a3a] bg-[#252525] text-[11px] uppercase tracking-[0.22em] text-[#8e8ea0]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Automation</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Started</th>
                      <th className="px-5 py-4 font-semibold">Duration</th>
                      <th className="px-5 py-4 font-semibold">Candidates</th>
                      <th className="px-5 py-4 font-semibold">Sent</th>
                      <th className="px-5 py-4 font-semibold">Skipped</th>
                      <th className="px-5 py-4 font-semibold">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => {
                      const automation = AUTOMATIONS.find((item) => item.key === run.automation_key);
                      return (
                        <tr key={run.id} className="border-b border-[#333333] last:border-b-0">
                          <td className="px-5 py-4 align-top">
                            <p className="font-medium text-[#ececec]">{automation?.name ?? run.automation_key}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8e8ea0]">{run.automation_key}</p>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${runStatusTone(
                                run.status,
                              )}`}
                            >
                              {run.status.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="px-5 py-4 align-top text-[#d7dae0]">{formatDateTime(run.started_at)}</td>
                          <td className="px-5 py-4 align-top text-[#d7dae0]">{formatDuration(run.duration_ms)}</td>
                          <td className="px-5 py-4 align-top text-[#ececec]">{run.candidates}</td>
                          <td className="px-5 py-4 align-top text-[#ececec]">{run.sent}</td>
                          <td className="px-5 py-4 align-top text-[#ececec]">{run.skipped}</td>
                          <td className="px-5 py-4 align-top">
                            <p className="text-[#ececec]">{run.errors}</p>
                            {run.last_error ? <p className="mt-1 text-xs text-[#ffb4b4]">{run.last_error}</p> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#ececec]">Recent Email Activity</h2>
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
                      <th className="px-5 py-4 font-semibold">Template</th>
                      <th className="px-5 py-4 font-semibold">Recipient</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Created</th>
                      <th className="px-5 py-4 font-semibold">Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 25).map((row) => (
                      <tr key={row.id} className="border-b border-[#333333] last:border-b-0">
                        <td className="px-5 py-4 align-top text-[#ececec]">{row.template_key}</td>
                        <td className="px-5 py-4 align-top text-[#d7dae0]">{row.recipient_email}</td>
                        <td className="px-5 py-4 align-top text-[#d7dae0]">{row.status}</td>
                        <td className="px-5 py-4 align-top text-[#d7dae0]">{formatDateTime(row.created_at)}</td>
                        <td className="px-5 py-4 align-top text-[#d7dae0]">{row.subject}</td>
                      </tr>
                    ))}
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
