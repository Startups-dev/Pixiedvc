import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service-client";
import { decryptSecret, importZohoMessage, recordZohoEvent, saveZohoWebhookSecret, setZohoConnectionError, verifyZohoWebhook, webhookPathToken } from "@/lib/zoho-mail-inbox";
import { timingSafeEqual } from "node:crypto";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token: pathToken } = await params;
  let configuredToken: string;
  try { configuredToken = webhookPathToken(); } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
  const pathTokenBuffer = Buffer.from(pathToken);
  const configuredTokenBuffer = Buffer.from(configuredToken);
  if (pathTokenBuffer.length !== configuredTokenBuffer.length || !timingSafeEqual(pathTokenBuffer, configuredTokenBuffer)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const rawBody = Buffer.from(await request.arrayBuffer());
  if (rawBody.length > 1_000_000) return NextResponse.json({ ok: false }, { status: 413 });
  const candidateSecret = request.headers.get("x-hook-secret");
  const signature = request.headers.get("x-hook-signature");
  const db = createServiceClient();
  const { data: connection } = await db.from("support_email_connection").select("webhook_secret_ciphertext").eq("singleton", true).maybeSingle();
  let webhookSecret: string | null = null;
  let savedSecret: string | null = null;
  let savedSignatureValid = false;
  let candidateSignatureValid = false;
  try {
    savedSecret = connection?.webhook_secret_ciphertext ? decryptSecret(connection.webhook_secret_ciphertext) : null;
    savedSignatureValid = Boolean(savedSecret && verifyZohoWebhook(rawBody, signature, savedSecret));
    candidateSignatureValid = Boolean(candidateSecret && verifyZohoWebhook(rawBody, signature, candidateSecret));
    if (savedSignatureValid) webhookSecret = savedSecret;
    else if (candidateSignatureValid) webhookSecret = candidateSecret;
  } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
  if (!webhookSecret) {
    // Zoho sends an initial POST while saving an outgoing webhook. Some setup
    // probes are not signed email events; acknowledge only a non-event payload
    // after the unguessable URL token has been verified above. Never import it.
    let validationBody: Record<string, unknown> | null = null;
    try {
      const parsed: unknown = JSON.parse(rawBody.toString("utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        validationBody = parsed as Record<string, unknown>;
      }
    } catch { /* Non-JSON probes are not valid setup requests. */ }
    const hasMailIdentity = validationBody &&
      (Object.hasOwn(validationBody, "messageId") || Object.hasOwn(validationBody, "folderId"));
    const isValidationProbe = rawBody.length === 0 || (Boolean(validationBody) && !hasMailIdentity);
    // Zoho's first save request can contain a real mail payload and the new
    // X-Hook-Secret, but no X-Hook-Signature. Treat it as a handshake only:
    // store the secret and require signed requests before importing mail.
    const isInitialUnsignedMail = !savedSecret && !signature && Boolean(validationBody && hasMailIdentity);
    if (candidateSecret && (isValidationProbe || isInitialUnsignedMail)) {
      try {
        await saveZohoWebhookSecret(candidateSecret);
        return NextResponse.json({ ok: true, validation: true });
      } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
    }
    let bodyIsJson = false;
    let hasMessageIdField = false;
    let hasFolderIdField = false;
    try {
      const parsed: unknown = JSON.parse(rawBody.toString("utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        bodyIsJson = true;
        hasMessageIdField = Object.hasOwn(parsed, "messageId");
        hasFolderIdField = Object.hasOwn(parsed, "folderId");
      }
    } catch { /* Log metadata only for non-JSON requests. */ }
    console.warn("Zoho webhook signature rejected", {
      signaturePresent: Boolean(signature),
      candidateSecretPresent: Boolean(candidateSecret),
      savedSecretPresent: Boolean(savedSecret),
      savedSignatureValid,
      candidateSignatureValid,
      bodyByteLength: rawBody.length,
      bodyIsJson,
      hasMessageIdField,
      hasFolderIdField,
      contentType: request.headers.get("content-type"),
    });
    return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  if (candidateSecret && (!connection?.webhook_secret_ciphertext || decryptSecret(connection.webhook_secret_ciphertext) !== candidateSecret)) {
    try { await saveZohoWebhookSecret(candidateSecret); }
    catch { return NextResponse.json({ ok: false }, { status: 503 }); }
  }

  const response = (payload: Record<string, unknown>, status = 200) => NextResponse.json(payload, { status });
  let body: Record<string, unknown>;
  try { body = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>; }
  catch { return response({ ok: false, error: "INVALID_JSON" }, 400); }
  const messageId = String(body.messageId ?? "");
  const eventId = `zoho:${messageId}:${String(body.receivedTime ?? "")}`;
  try {
    if (!messageId || !body.folderId) {
      await recordZohoEvent({ eventId: eventId || `zoho:setup:${Date.now()}`, eventType: "incoming_email", status: "ignored", errorCode: "NO_MESSAGE_ID" });
      return response({ ok: true });
    }
    const result = await importZohoMessage({
      messageId, folderId: String(body.folderId),
      threadId: body.threadId ? String(body.threadId) : undefined,
      receivedTime: body.receivedTime as number | string | undefined,
    });
    await recordZohoEvent({ eventId, eventType: "incoming_email", providerMessageId: messageId, status: result.ignored ? "ignored" : "processed" });
    await setZohoConnectionError(null, true, false);
    return response({ ok: true });
  } catch {
    await recordZohoEvent({ eventId: eventId || `zoho:unknown:${Date.now()}`, eventType: "incoming_email", providerMessageId: messageId || null, status: "failed", errorCode: "IMPORT_FAILED" }).catch(() => undefined);
    await setZohoConnectionError("zoho_import_failed", true, false).catch(() => undefined);
    return response({ ok: false, error: "IMPORT_FAILED" }, 503);
  }
}
