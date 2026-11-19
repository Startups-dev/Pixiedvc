import { adminEmails } from "@/lib/admin-emails";
import { createHash } from "node:crypto";
import { getAppUrl } from "@/lib/app-url";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export type ReadyStaySubmissionEmailDetails = {
  id: string;
  ownerId: string;
  ownerEmail: string | null;
  resortName: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  points: number;
};

export function readyStaySubmissionEmail(details: ReadyStaySubmissionEmailDetails, recipient: "owner" | "admin") {
  const path = recipient === "owner"
    ? `/owner/ready-stays/${encodeURIComponent(details.id)}`
    : `/admin/ready-stays?review=${encodeURIComponent(details.id)}#ready-stay-${encodeURIComponent(details.id)}`;
  const link = getAppUrl(path, `Ready Stay ${recipient} submission notification`);
  if (!link) return null;
  const subject = recipient === "owner"
    ? "We received your Ready Stay submission"
    : `Ready Stay submission needs review — ${details.resortName}`;
  const greeting = recipient === "owner" ? "Your Ready Stay submission was received." : "A new Ready Stay submission needs review.";
  const body = [
    greeting,
    "",
    `Resort: ${details.resortName}`,
    `Dates: ${details.checkIn} – ${details.checkOut}`,
    `Room category: ${details.roomType}`,
    `Points: ${details.points}`,
    `Submission reference: ${details.id}`,
    "",
    recipient === "owner" ? `View submission details: ${link}` : `Review this submission (Admin sign-in required): ${link}`,
  ].join("\n");
  return { subject, body, link };
}

export function buildReadyStaySubmissionMessages(details: ReadyStaySubmissionEmailDetails) {
  const recipients = [...new Set(adminEmails())];
  if (!details.ownerEmail || recipients.length === 0) throw new Error("submission_email_recipients_missing");
  const audiences: Array<[string, "owner" | "admin"]> = [
    [details.ownerEmail, "owner"], ...recipients.map((email): [string, "admin"] => [email, "admin"]),
  ];
  return audiences.map(([address, audience]) => {
    const email = readyStaySubmissionEmail(details, audience);
    if (!email) throw new Error("app_url_unavailable");
    const to = address.trim().toLowerCase();
    return {
      templateKey: audience === "owner" ? "ready_stay_owner_submission_confirmation" : "ready_stay_admin_submission_alert",
      recipientUserId: audience === "owner" ? details.ownerId : null,
      audience,
      // UUID-sized stable key stays below Resend's 256 character limit.
      idempotencyKey: `ready-stay-submission:${details.id}:${audience}:${createHash("sha256").update(to).digest("hex")}`,
      request: { from: process.env.RESEND_FROM_EMAIL ?? "hello@hannadvc.com", to, subject: email.subject, text: email.body },
    };
  });
}

type Delivery = {
  id: string;
  queue_claim_token: string;
  queue_locked_until: string;
  idempotency_key: string;
  queue_request: Record<string, unknown>;
};

// The database owns durable state and concurrency. This worker can stop at any
// await: expansion is atomic, delivery claims expire, and the provider key/payload
// remain identical when recovering a send whose acknowledgement was lost.
export async function runReadyStaySubmissionEmails() {
  const db = getSupabaseAdminClient();
  if (!db) throw new Error("service_role_missing");
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY_missing");
  const events = await db.from("ready_stay_submission_outbox")
    .select("ready_stay_id, details").is("expanded_at", null)
    .lte("next_attempt_at", new Date().toISOString()).order("next_attempt_at").limit(25);
  if (events.error) throw new Error("submission_outbox_read_failed");
  let preparationFailed = 0;
  for (const event of events.data ?? []) {
    try {
      const messages = buildReadyStaySubmissionMessages(event.details as ReadyStaySubmissionEmailDetails);
      const expanded = await db.rpc("expand_ready_stay_submission_emails", { p_id: event.ready_stay_id, p_messages: messages });
      if (expanded.error) throw new Error("submission_outbox_expand_failed");
    } catch {
      // Leave the intent pending: missing configuration never drops a recipient.
      preparationFailed++;
      const deferred = await db.from("ready_stay_submission_outbox").update({
        next_attempt_at: new Date(Date.now() + 300_000).toISOString(),
        error_message: "Email preparation failed; check owner email, Admin recipients and app URL",
      }).eq("ready_stay_id", event.ready_stay_id).is("expanded_at", null);
      if (deferred.error) throw new Error("submission_email_preparation_defer_failed");
      console.error("Ready Stay email preparation pending retry", { readyStayId: event.ready_stay_id });
    }
  }
  let sent = 0;
  let failed = 0;
  const deadline = Date.now() + 40_000;
  for (let count = 0; count < 25 && Date.now() < deadline; count++) {
    const claimed = await db.rpc("claim_ready_stay_submission_email");
    if (claimed.error) throw new Error("submission_email_claim_failed");
    const row = (claimed.data as Delivery[] | null)?.[0];
    if (!row) break;
    // A suspended process must not send using a claim that expired meanwhile.
    if (!(Date.parse(row.queue_locked_until) > Date.now() + 15_000)) {
      throw new Error("submission_email_claim_expired");
    }
    let providerId: string | null = null;
    let error: string | null = null;
    let definitelyRejected = false;
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": row.idempotency_key },
        body: JSON.stringify(row.queue_request),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        definitelyRejected = response.status >= 400 && response.status < 500 && response.status !== 409;
        throw new Error(`Resend HTTP ${response.status}`);
      }
      const result = await response.json() as { id?: string };
      if (!result.id) throw new Error("Resend acknowledgement missing id");
      providerId = result.id;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Resend transport failed";
    }
    const finished = await db.rpc("finish_ready_stay_submission_email", {
      p_id: row.id, p_token: row.queue_claim_token, p_provider_id: providerId, p_error: error,
      p_definitely_rejected: definitelyRejected,
    });
    // Never hide a lost acknowledgement: the expired lease will recover it.
    if (finished.error || finished.data !== true) throw new Error("submission_email_acknowledgement_failed");
    if (error) failed++; else sent++;
  }
  const review = await db.from("outbound_emails").select("id", { count: "exact", head: true })
    .not("queue_request", "is", null).is("queue_next_attempt_at", null).eq("status", "failed");
  if (review.error) throw new Error("submission_email_health_check_failed");
  return { sent, failed, preparationFailed, needsReview: review.count ?? 0 };
}
