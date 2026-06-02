import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import AdminEmailsClient from "@/app/admin/emails/AdminEmailsClient";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type OutboundEmailRow = {
  id: string;
  template_key: string;
  recipient_email: string;
  recipient_user_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  subject: string;
  status: "pending" | "sent" | "failed";
  provider: string;
  provider_message_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  sent_at: string | null;
  failed_at: string | null;
  retry_count: number;
  last_retry_at: string | null;
};

export default async function AdminEmailsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser("/admin/emails");
  const resolvedSearchParams = (await searchParams) ?? {};
  const statusParam = Array.isArray(resolvedSearchParams.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams.status;
  const templateParam = Array.isArray(resolvedSearchParams.template)
    ? resolvedSearchParams.template[0]
    : resolvedSearchParams.template;
  const recipientParam = Array.isArray(resolvedSearchParams.recipient)
    ? resolvedSearchParams.recipient[0]
    : resolvedSearchParams.recipient;
  const initialStatusFilter =
    statusParam === "sent" || statusParam === "failed" || statusParam === "pending" ? statusParam : "all";
  const initialTemplateFilter = templateParam?.trim() || "all";
  const initialSearch = recipientParam?.trim() || "";

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
              Outbound Email Logs
            </h1>
            <p className="text-sm text-[#b4b4b4]">Inspect delivery results, template usage, and email metadata.</p>
          </header>

          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  const { data, error } = await adminClient
    .from("outbound_emails")
    .select(
      "id, template_key, recipient_email, recipient_user_id, related_entity_type, related_entity_id, subject, status, provider, provider_message_id, error_message, metadata, created_at, sent_at, failed_at, retry_count, last_retry_at",
    )
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
              Outbound Email Logs
            </h1>
          </header>

          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
            <p className="text-sm text-[#ff6b6b]">Unable to load outbound email logs right now.</p>
            <p className="mt-2 text-xs text-[#8e8ea0]">{error.message}</p>
          </Card>
        </div>
      </div>
    );
  }

  const rows = (data ?? []) as OutboundEmailRow[];

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
              Outbound Email Logs
            </h1>
            <p className="text-sm text-[#b4b4b4]">Inspect delivery status, template usage, recipients, and provider details.</p>
            <Link href="/admin/emails/welcome-sequence" className="inline-flex text-sm font-medium text-[#9bb0c9] hover:text-[#ececec]">
              Preview and test-send welcome sequence emails →
            </Link>
          </div>
        </header>

        <AdminEmailsClient
          rows={rows}
          initialStatusFilter={initialStatusFilter}
          initialTemplateFilter={initialTemplateFilter}
          initialSearch={initialSearch}
        />
      </div>
    </div>
  );
}
