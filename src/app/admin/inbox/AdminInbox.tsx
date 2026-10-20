"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AdminSubnav from "@/app/admin/AdminSubnav";
import { INBOX_CUSTOMER_MESSAGE_EVENT } from "@/lib/admin-inbox-alerts";

type InboxView = "needs_reply" | "assigned_to_me" | "waiting_customer" | "closed";
type InboxConversation = {
  id: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_type: string | null;
  audience_label?: string;
  guest_user_id: string | null;
  affiliate_id?: string | null;
  affiliate_application_id?: string | null;
  twilio_conversation_sid?: string | null;
  topic: string | null;
  page_url: string | null;
  inbox_source: string;
  inbox_status: "needs_reply" | "waiting_customer" | "closed";
  unread_for_staff: boolean;
  contact_ack_status: string | null;
  contact_staff_alert_status: string | null;
  created_at: string;
  updated_at: string;
  handoff: { status: string; assigned_agent_user_id: string | null } | null;
  lastMessage: { sender: string; preview: string; at: string } | null;
};
type InboxMessage = {
  id: string;
  sender: string;
  sender_display_name: string | null;
  sender_user_id: string | null;
  content: string;
  visibility: "customer" | "internal";
  delivery_status: string | null;
  created_at: string;
};
type ThreadDetail = {
  conversation: InboxConversation & {
    handoff_mode?: string | null;
    twilio_conversation_sid?: string | null;
    customerLinks: Array<{ label: string; href: string }>;
    affiliateApplication?: {
      id: string;
      status: string;
      display_name: string | null;
      website: string | null;
      traffic_estimate: string | null;
      promotion_description: string | null;
      created_at: string;
    } | null;
  };
  messages: InboxMessage[];
};
type MailConnectionStatus = {
  configured: boolean; connected: boolean; mailbox: string; dataCenter: string;
  connectedAt: string | null; importStartedAt: string | null; lastWebhookAt: string | null;
  lastReconciledAt: string | null; lastError: string | null; failedImportCount: number;
  recentFailures: Array<{ provider: string; event_type: string; error_code: string | null; created_at: string }>;
  resendWebhookConfigured: boolean;
  webhookUrl: string | null;
};

const VIEW_OPTIONS: Array<{ id: InboxView; label: string }> = [
  { id: "needs_reply", label: "Needs reply" },
  { id: "assigned_to_me", label: "Assigned to me" },
  { id: "waiting_customer", label: "Waiting on customer" },
  { id: "closed", label: "Closed" },
];

function dateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function sourceName(source: string) {
  return source === "contact_form" ? "Website contact" : source === "email" ? "Email" : "Support handoff";
}

function audienceName(row: Pick<InboxConversation, "guest_type" | "topic"> & { audience_label?: string }) {
  if ("audience_label" in row && row.audience_label) return row.audience_label;
  const topic = row.topic?.toLowerCase() ?? "";
  if (topic.includes("affiliate") || topic.includes("partner")) return "Affiliate / partner";
  if (topic.includes("owner")) return "Owner";
  if (topic.includes("guest")) return "Guest";
  return row.guest_type === "authenticated" ? "Account holder" : "Visitor";
}

export default function AdminInbox({ initialConversationId = null }: { initialConversationId?: string | null }) {
  const [view, setView] = useState<InboxView>("needs_reply");
  const [rows, setRows] = useState<InboxConversation[]>([]);
  const [counts, setCounts] = useState<Record<InboxView, number>>({ needs_reply: 0, assigned_to_me: 0, waiting_customer: 0, closed: 0 });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<"reply" | "internal_note">("reply");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [emailConnection, setEmailConnection] = useState<MailConnectionStatus | null>(null);
  const [emailConnectionError, setEmailConnectionError] = useState<string | null>(null);
  const [zohoConnectError, setZohoConnectError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);
  const [emailIdempotencyKey, setEmailIdempotencyKey] = useState<string | null>(null);
  const initialConversationOpened = useRef(false);

  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? detail?.conversation ?? null, [rows, selectedId, detail]);

  const loadList = useCallback(async (targetView = view) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/admin/inbox?view=${targetView}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Could not load the Inbox.");
      setRows(payload.conversations ?? []);
      setCounts(payload.counts ?? { needs_reply: 0, assigned_to_me: 0, waiting_customer: 0, closed: 0 });
      setCurrentUserId(payload.currentUserId ?? null);
      if (selectedId && !(payload.conversations ?? []).some((row: InboxConversation) => row.id === selectedId)) {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load the Inbox.");
    } finally {
      setLoading(false);
    }
  }, [view, selectedId]);

  const openConversation = useCallback(async (id: string) => {
    setSelectedId(id);
    setThreadLoading(true);
    setNotice(null);
    try {
      const [detailResponse] = await Promise.all([
        fetch(`/api/admin/inbox/${encodeURIComponent(id)}`, { cache: "no-store" }),
        fetch(`/api/admin/inbox/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_read" }) }),
      ]);
      const payload = await detailResponse.json().catch(() => null);
      if (!detailResponse.ok || !payload?.ok) throw new Error(payload?.error ?? "Could not load this conversation.");
      setDetail(payload);
      setRows((current) => current.map((row) => row.id === id ? { ...row, unread_for_staff: false } : row));
      void loadList();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load this conversation.");
    } finally {
      setThreadLoading(false);
    }
  }, [loadList]);

  useEffect(() => { void loadList(); }, [loadList]);

  useEffect(() => {
    const onCustomerMessage = (event: Event) => {
      const conversationId = (event as CustomEvent<{ conversationId?: string }>).detail?.conversationId;
      if (!conversationId) return;
      void loadList();
      if (conversationId === selectedId) {
        void fetch(`/api/admin/inbox/${encodeURIComponent(conversationId)}`, { cache: "no-store" })
          .then((response) => response.json())
          .then((payload) => { if (payload?.ok) setDetail(payload); })
          .catch(() => undefined);
      }
    };
    window.addEventListener(INBOX_CUSTOMER_MESSAGE_EVENT, onCustomerMessage);
    return () => window.removeEventListener(INBOX_CUSTOMER_MESSAGE_EVENT, onCustomerMessage);
  }, [loadList, selectedId]);

  useEffect(() => {
    if (!initialConversationId || initialConversationOpened.current) return;
    initialConversationOpened.current = true;
    void openConversation(initialConversationId);
  }, [initialConversationId, openConversation]);

  const loadEmailConnection = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/inbox/zoho/status", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Connection health unavailable.");
      setEmailConnection(payload as MailConnectionStatus);
      setEmailConnectionError(null);
    } catch (error) {
      setEmailConnectionError(error instanceof Error ? error.message : "Connection health unavailable.");
    }
  }, []);

  useEffect(() => { void loadEmailConnection(); }, [loadEmailConnection]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("zoho_error");
    if (!error) return;

    const messages: Record<string, string> = {
      ZOHO_OAUTH_NOT_CONFIGURED: "Zoho connection could not start because its server credentials are unavailable. Contact an administrator.",
      ZOHO_TARGET_MAILBOX_NOT_FOUND: "Zoho returned successfully, but the authorized account did not list hello@hannadvc.com as a primary or alias address. Connect with the Zoho account that owns this mailbox.",
      ZOHO_INBOX_FOLDER_NOT_FOUND: "Zoho connected, but its Inbox folder was not returned. Contact an administrator before retrying.",
      ZOHO_OAUTH_TOKEN_EXCHANGE_FAILED: "Zoho authorization could not be completed. Please try connecting again.",
      ZOHO_OAUTH_STATE_INVALID: "The Zoho authorization session expired or could not be verified. Please try connecting again.",
      ZOHO_OAUTH_AUTHORIZATION_FAILED: "Zoho did not complete authorization. Please try connecting again.",
      ZOHO_CONNECTION_SETUP_FAILED: "Zoho could not finish the connection setup. Contact an administrator.",
    };
    setZohoConnectError(messages[error] ?? "Zoho authorization could not be started. Please try again or contact an administrator.");
    params.delete("zoho_error");
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, []);

  async function updateConversation(action: string, status?: string) {
    if (!selectedId) return;
    const response = await fetch(`/api/admin/inbox/${encodeURIComponent(selectedId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(status ? { status } : {}) }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      setNotice(payload?.error ?? "Could not update the conversation.");
      return;
    }
    setNotice("Conversation updated.");
    await loadList();
    await openConversation(selectedId);
  }

  async function submitMessage() {
    const content = draft.trim();
    if (!content || !selectedId || sending) return;
    const requestIdempotencyKey = emailIdempotencyKey ?? crypto.randomUUID();
    setEmailIdempotencyKey(requestIdempotencyKey);
    setSending(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/inbox/${encodeURIComponent(selectedId)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mode, idempotencyKey: requestIdempotencyKey }),
      });
      const payload = await response.json().catch(() => null);
      if ((payload?.messageId && response.status !== 202) || response.ok) setEmailIdempotencyKey(null);
      if (!response.ok || !payload?.ok) {
        if (payload?.messageId) await openConversation(selectedId);
        setNotice(payload?.error === "NO_CUSTOMER_REPLY_CHANNEL"
          ? "No live or email reply channel is available. The message was not sent."
          : payload?.error === "DELIVERY_ALREADY_IN_PROGRESS"
            ? "This reply is already being processed. Check the thread before trying again."
          : payload?.error === "DELIVERY_ALREADY_FAILED"
            ? "This reply already failed and was not resent. Start a new reply to make an intentional retry."
          : payload?.error === "email_provider_rejected" || payload?.error === "email_delivery_failed" || payload?.error === "twilio_delivery_failed"
            ? `Delivery failed (${payload.error}). The saved message is marked failed; the customer has not been told it was sent.`
            : payload?.error ?? "Message could not be sent.");
        return;
      }
      setDraft("");
      setEmailIdempotencyKey(null);
      setNotice(mode === "internal_note" ? "Internal note saved. It was not sent to the customer." : `Reply accepted by ${payload.channel === "twilio" ? "live chat" : "email"}.`);
      await openConversation(selectedId);
      await loadList();
    } catch {
      setEmailIdempotencyKey(requestIdempotencyKey);
      setNotice("The request failed before delivery could be confirmed. Check the thread before retrying.");
    } finally {
      setSending(false);
    }
  }

  async function reconcileEmail() {
    setReconciling(true);
    setReconcileNotice(null);
    try {
      const response = await fetch("/api/admin/inbox/zoho/reconcile", { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Mailbox reconciliation failed.");
      if (payload.skipped === "already_running") {
        setReconcileNotice("A mailbox check is already running. New mail will appear automatically when it finishes.");
        return;
      }
      setReconcileNotice(`Checked ${payload.scanned} recent messages; imported ${payload.imported}, duplicates ${payload.duplicates}.${payload.pageLimitReached ? " The safety cap was reached; run again to continue." : ""}`);
      await Promise.all([loadEmailConnection(), loadList()]);
    } catch (error) {
      setReconcileNotice(error instanceof Error ? error.message : "Mailbox reconciliation failed.");
      await loadEmailConnection();
    } finally {
      setReconciling(false);
    }
  }

  const hasSelection = Boolean(selectedId);
  const detailConversation = detail?.conversation;
  const isLive = Boolean(detailConversation?.twilio_conversation_sid || selected?.twilio_conversation_sid);

  return (
    <main className="min-h-[calc(100vh-24px)] bg-[#17191f] p-3 text-[#ececf1] sm:p-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <AdminSubnav current="inbox" />
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9da5b5]">HannaDVC Admin</p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl" style={{ color: "#bfdbfe" }}>Inbox</h1>
            <p className="mt-1 text-sm text-[#aeb4c1]">Support handoffs and website inquiries in one workspace.</p>
          </div>
        </header>

        <section aria-label="Mailbox connection" className="rounded-xl border border-[#343741] bg-[#20232a] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold" style={{ color: "#bfdbfe" }}>Email connection</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs ${emailConnection?.connected && emailConnection.configured ? "bg-emerald-950/60 text-emerald-200" : "bg-amber-950/50 text-amber-200"}`}>
                  {emailConnectionError ? "Status unavailable" : emailConnection?.connected && emailConnection.configured ? "Zoho connected" : emailConnection?.connected ? "Configuration incomplete" : "Setup required"}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#b8bdc7]">{emailConnection?.mailbox ?? "hello@hannadvc.com"} · Canadian Zoho Mail incoming · Resend remains the reply sender.</p>
              {zohoConnectError ? <p role="alert" className="mt-2 text-sm text-rose-200">{zohoConnectError}</p> : null}
              <p className="mt-1 text-xs text-[#969ba8]">
                {emailConnection?.lastWebhookAt ? `Last email event ${dateTime(emailConnection.lastWebhookAt)}.` : "No Zoho email event received yet."}
                {emailConnection?.lastReconciledAt ? ` Last sync ${dateTime(emailConnection.lastReconciledAt)}.` : ""}
              </p>
              {emailConnectionError || emailConnection?.lastError ? <p role="status" className="mt-1 text-xs text-amber-200">{emailConnectionError ?? `Connection issue: ${emailConnection?.lastError}`}</p> : null}
              {emailConnection?.failedImportCount ? <p className="mt-1 text-xs text-rose-200">{emailConnection.failedImportCount} email event(s) failed. Latest: {emailConnection.recentFailures[0]?.error_code ?? "see event details"}.</p> : null}
              {!emailConnection?.resendWebhookConfigured ? <p className="mt-1 text-xs text-amber-200">Resend Message-ID webhook is not configured; incoming replies to Hanna’s email may not thread reliably.</p> : null}
              {emailConnection?.webhookUrl ? <p className="mt-2 break-all text-xs text-[#d9c980]">Zoho webhook endpoint: <code>{emailConnection.webhookUrl}</code></p> : null}
              {reconcileNotice ? <p role="status" className="mt-1 text-xs text-[#e8d28f]">{reconcileNotice}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {emailConnection?.connected ? <button type="button" onClick={() => void reconcileEmail()} disabled={reconciling} className="rounded-lg border border-[#494d58] px-3 py-2 text-sm hover:bg-[#2c3039] disabled:opacity-50">{reconciling ? "Checking…" : "Check recent mail"}</button> : null}
              {!emailConnection?.connected ? <Link href="/api/admin/inbox/zoho/connect" className="rounded-lg bg-[#d8b65c] px-3 py-2 text-sm font-semibold" style={{ color: "#000000" }}>Connect Zoho Mail</Link> : null}
            </div>
          </div>
        </section>

        <nav aria-label="Inbox views" className="flex gap-2 overflow-x-auto pb-1">
          {VIEW_OPTIONS.map((option) => (
            <button key={option.id} type="button" onClick={() => { setView(option.id); setSelectedId(null); setDetail(null); }}
              className={`shrink-0 rounded-full border px-3 py-2 text-sm ${view === option.id ? "border-[#d8b65c] bg-[#d8b65c]/15 text-[#f3d98a]" : "border-[#3b3e48] text-[#c6cad2] hover:bg-[#252831]"}`}>
              {option.label}<span className="ml-2 rounded-full bg-black/25 px-2 py-0.5 text-xs">{counts[option.id]}</span>
            </button>
          ))}
        </nav>

        {loadError ? <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">{loadError}</div> : null}
        <section className="grid min-h-[68vh] gap-3 lg:grid-cols-[290px_minmax(0,1fr)_275px]">
          <aside className={`${hasSelection ? "hidden lg:block" : "block"} overflow-hidden rounded-2xl border border-[#343741] bg-[#20232a]`} aria-label="Conversation list">
            <div className="border-b border-[#343741] px-4 py-3">
              <h2 className="font-semibold" style={{ color: "#bfdbfe" }}>{VIEW_OPTIONS.find((item) => item.id === view)?.label}</h2>
              <p className="mt-1 text-xs text-[#999fab]">{rows.length} conversations · most recent first</p>
            </div>
            <div className="max-h-[72vh] overflow-y-auto">
              {loading ? <p className="p-4 text-sm text-[#aeb4c1]">Loading…</p> : null}
              {!loading && !rows.length ? <p className="p-5 text-sm text-[#aeb4c1]">Nothing in this view.</p> : null}
              {rows.map((row) => {
                const assignedToMe = row.handoff?.assigned_agent_user_id === currentUserId;
                return <button key={row.id} type="button" onClick={() => void openConversation(row.id)}
                  className={`block w-full border-b border-[#343741] px-4 py-3 text-left hover:bg-[#292d36] ${selectedId === row.id ? "bg-[#2c3039]" : ""}`}>
                  <div className="flex items-start gap-2">
                    {row.unread_for_staff ? <span aria-label="Unread" title="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#e8c560]" /> : <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-white">{row.guest_name || row.guest_email || "Visitor"}</span>
                        <time className="shrink-0 text-[11px] text-[#969ba8]">{dateTime(row.updated_at)}</time>
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded bg-[#363a44] px-1.5 py-0.5 text-[#d5d8df]">{audienceName(row)}</span>
                        <span className="rounded bg-[#363a44] px-1.5 py-0.5 text-[#d5d8df]">{sourceName(row.inbox_source)}</span>
                        {assignedToMe ? <span className="rounded bg-[#263c35] px-1.5 py-0.5 text-[#a6e0c4]">You</span> : row.handoff?.assigned_agent_user_id ? <span className="rounded bg-[#363a44] px-1.5 py-0.5 text-[#d5d8df]">Assigned</span> : null}
                      </span>
                      <span className="mt-2 block truncate text-sm text-[#b8bdc7]">{row.lastMessage?.preview || row.topic || "New conversation"}</span>
                      {row.inbox_source === "contact_form" && (row.contact_ack_status === "failed" || row.contact_staff_alert_status === "failed") ? <span className="mt-1 block text-xs font-medium text-amber-300">Email notification failed</span> : null}
                    </span>
                  </div>
                </button>;
              })}
            </div>
          </aside>

          <section className={`${hasSelection ? "block" : "hidden lg:flex"} min-h-[68vh] flex-col overflow-hidden rounded-2xl border border-[#343741] bg-[#20232a]`} aria-label="Message thread">
            {!hasSelection ? <div className="m-auto hidden text-center lg:block"><p className="text-lg font-medium">Select a conversation</p><p className="mt-1 text-sm text-[#969ba8]">Messages and customer context will appear here.</p></div> : null}
            {hasSelection ? <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#343741] px-4 py-3">
                <div className="flex items-start gap-2">
                  <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }} className="rounded-md px-2 py-1 text-sm text-[#bfc4cf] hover:bg-[#343741] lg:hidden">← Back</button>
                  <div>
                    <h2 className="font-semibold text-white">{selected?.guest_name || selected?.guest_email || "Visitor"}</h2>
                    <p className="mt-1 text-xs text-[#a6abb6]">{selected?.guest_email || "No email address"} · {audienceName(selected ?? { guest_type: "anonymous", topic: null })} · {sourceName(selected?.inbox_source ?? "support_handoff")}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void updateConversation(selected?.handoff?.assigned_agent_user_id === currentUserId ? "unassign" : "assign_to_me")} className="rounded-lg border border-[#494d58] px-3 py-2 text-xs font-medium hover:bg-[#2c3039]">
                    {selected?.handoff?.assigned_agent_user_id === currentUserId ? "Unassign" : selected?.handoff?.assigned_agent_user_id ? "Assigned to staff" : "Assign to me"}
                  </button>
                  <select aria-label="Conversation status" value={selected?.inbox_status ?? "needs_reply"} onChange={(event) => void updateConversation("set_status", event.target.value)} className="rounded-lg border border-[#494d58] bg-[#20232a] px-3 py-2 text-xs text-white">
                    <option value="needs_reply">Needs reply</option><option value="waiting_customer">Waiting on customer</option><option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {selected?.inbox_source === "contact_form" ? <div className="grid gap-1 border-b border-[#343741] bg-[#2b2c2c] px-4 py-2 text-xs sm:grid-cols-2">
                <p className={selected.contact_ack_status === "failed" ? "text-amber-300" : "text-[#b8bdc7]"}>Visitor acknowledgment: {selected.contact_ack_status ?? "not recorded"}</p>
                <p className={selected.contact_staff_alert_status === "failed" ? "text-amber-300" : "text-[#b8bdc7]"}>Staff alert: {selected.contact_staff_alert_status ?? "not recorded"}</p>
              </div> : null}

              <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
                {threadLoading ? <p className="text-sm text-[#aeb4c1]">Loading messages…</p> : null}
                {!threadLoading && !detail?.messages.length ? <p className="text-sm text-[#aeb4c1]">No messages yet.</p> : null}
                {detail?.messages.map((message) => {
                  const internal = message.visibility === "internal";
                  return <article key={message.id} className={`max-w-[850px] rounded-xl border p-3 ${internal ? "border-amber-500/35 bg-amber-950/25" : message.sender === "guest" ? "border-[#3d424e] bg-[#292d36]" : "border-[#3c4150] bg-[#242a37]"}`}>
                    <header className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className={internal ? "font-semibold text-amber-200" : "font-semibold text-[#e1e5ed]"}>{internal ? "Internal note · staff only" : message.sender_display_name || (message.sender === "guest" ? "Customer" : message.sender === "ai" ? "AI support" : message.sender === "agent" ? "HannaDVC staff" : "System")}</span>
                      <time className="text-[#989eaa]">{dateTime(message.created_at)}</time>
                    </header>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#e5e7ec]">{message.content}</p>
                    {!internal && message.sender === "agent" && message.delivery_status ? <p className={`mt-2 text-xs ${message.delivery_status === "sent" ? "text-emerald-300" : message.delivery_status === "failed" ? "text-rose-300" : "text-amber-200"}`}>Delivery: {message.delivery_status}{message.delivery_status === "failed" ? " — not confirmed delivered" : ""}</p> : null}
                  </article>;
                })}
              </div>

              {notice ? <p role="status" className="border-t border-[#343741] px-4 py-2 text-sm text-[#e4d39c]">{notice}</p> : null}
              <div className="border-t border-[#343741] p-3 sm:p-4">
                <div className="mb-2 flex gap-2" role="group" aria-label="Message type">
                  <button type="button" onClick={() => setMode("reply")} className={`rounded-md px-3 py-1.5 text-xs ${mode === "reply" ? "bg-[#d8b65c] font-semibold text-[#1c1c1c]" : "bg-[#30343d] text-[#c8ccd5]"}`}>Customer reply</button>
                  <button type="button" onClick={() => setMode("internal_note")} className={`rounded-md px-3 py-1.5 text-xs ${mode === "internal_note" ? "bg-amber-300 font-semibold text-[#2a2110]" : "bg-[#30343d] text-[#c8ccd5]"}`}>Internal note</button>
                  {mode === "reply" ? <span className="ml-auto self-center text-[11px] text-[#a2a7b2]">{isLive ? "Live chat reply" : selected?.guest_email ? "Email reply" : "No reply channel"}</span> : <span className="ml-auto self-center text-[11px] text-amber-200">Only Inbox staff can see notes</span>}
                </div>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} maxLength={10000} aria-label={mode === "reply" ? "Customer reply" : "Internal note"} placeholder={mode === "reply" ? "Write a reply…" : "Add a private staff note…"} className={`w-full resize-y rounded-xl border bg-[#17191f] p-3 text-sm text-white outline-none focus:ring-2 ${mode === "internal_note" ? "border-amber-500/40 focus:ring-amber-300/30" : "border-[#454a55] focus:ring-[#d8b65c]/30"}`} />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-[#959ba7]">{mode === "reply" ? "A reply is marked sent only after its delivery transport accepts it." : "This text is stored privately and never passed to Twilio or email."}</p>
                  <button type="button" disabled={!draft.trim() || sending || (mode === "reply" && selected?.inbox_status === "closed")} onClick={() => void submitMessage()} className="shrink-0 rounded-lg bg-[#d8b65c] px-4 py-2 text-sm font-semibold text-[#1c1c1c] disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Sending…" : mode === "internal_note" ? "Save note" : "Send reply"}</button>
                </div>
              </div>
            </> : null}
          </section>

          <aside className={`${hasSelection ? "block" : "hidden"} rounded-2xl border border-[#343741] bg-[#20232a] p-4 lg:block`} aria-label="Customer and context">
            {selected ? <>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#d5d9e1]">Customer & context</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="text-xs text-[#969ca9]">Name</dt><dd className="mt-0.5 break-words">{selected.guest_name || "Not provided"}</dd></div>
                <div><dt className="text-xs text-[#969ca9]">Email</dt><dd className="mt-0.5 break-all">{selected.guest_email || "Not provided"}</dd></div>
                <div><dt className="text-xs text-[#969ca9]">Source</dt><dd className="mt-0.5">{sourceName(selected.inbox_source)}</dd></div>
                <div><dt className="text-xs text-[#969ca9]">Audience</dt><dd className="mt-0.5">{audienceName(selected)}</dd></div>
                <div><dt className="text-xs text-[#969ca9]">Last activity</dt><dd className="mt-0.5">{dateTime(selected.updated_at)}</dd></div>
                <div><dt className="text-xs text-[#969ca9]">Assigned staff</dt><dd className="mt-0.5">{selected.handoff?.assigned_agent_user_id === currentUserId ? "You" : selected.handoff?.assigned_agent_user_id ? "Another staff member" : "Unassigned"}</dd></div>
                <div><dt className="text-xs text-[#969ca9]">Page context</dt><dd className="mt-0.5 break-all text-xs text-[#c3c8d2]">{selected.page_url || "Not provided"}</dd></div>
              </dl>
              <div className="mt-5 border-t border-[#343741] pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#aeb4c1]">Verified records</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {detailConversation?.customerLinks?.map((link) => <li key={`${link.label}:${link.href}`}><Link href={link.href} className="text-[#e3c766] underline underline-offset-2 hover:text-[#f4df98]">{link.label} ↗</Link></li>)}
                  {!detailConversation?.customerLinks?.length ? <li className="text-xs text-[#9298a5]">No linked account or booking records verified.</li> : null}
                </ul>
              </div>
              {detailConversation?.affiliateApplication ? (
                <div className="mt-5 border-t border-[#343741] pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#aeb4c1]">Affiliate application context</h3>
                  <dl className="mt-2 space-y-2 text-sm">
                    <div><dt className="text-xs text-[#969ca9]">Status</dt><dd className="mt-0.5 capitalize">{detailConversation.affiliateApplication.status}</dd></div>
                    <div><dt className="text-xs text-[#969ca9]">Submitted</dt><dd className="mt-0.5">{dateTime(detailConversation.affiliateApplication.created_at)}</dd></div>
                    {detailConversation.affiliateApplication.website ? <div><dt className="text-xs text-[#969ca9]">Website</dt><dd className="mt-0.5 break-all text-xs text-[#c3c8d2]">{detailConversation.affiliateApplication.website}</dd></div> : null}
                    {detailConversation.affiliateApplication.traffic_estimate ? <div><dt className="text-xs text-[#969ca9]">Audience estimate</dt><dd className="mt-0.5">{detailConversation.affiliateApplication.traffic_estimate}</dd></div> : null}
                    {detailConversation.affiliateApplication.promotion_description ? <div><dt className="text-xs text-[#969ca9]">Promotion plan</dt><dd className="mt-0.5 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-[#c3c8d2]">{detailConversation.affiliateApplication.promotion_description}</dd></div> : null}
                  </dl>
                </div>
              ) : null}
            </> : <div className="hidden text-sm text-[#9298a5] lg:block">Select a conversation to see customer context.</div>}
          </aside>
        </section>
      </div>
    </main>
  );
}
