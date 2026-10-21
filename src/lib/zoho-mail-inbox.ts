import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase-service-client";
import { parseZohoJson } from "@/lib/zoho-json";

const MAIL_API = "https://mail.zohocloud.ca/api";
const ACCOUNTS_API = "https://accounts.zohocloud.ca/oauth/v2";
const MAILBOX = "hello@hannadvc.com";

export function encryptionKey() {
  const configured = process.env.ZOHO_MAIL_ENCRYPTION_KEY;
  if (!configured || configured.length < 32) throw new Error("ZOHO_MAIL_ENCRYPTION_KEY_NOT_CONFIGURED");
  return createHash("sha256").update(configured).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSecret(value: string) {
  const [ivText, tagText, ciphertextText] = value.split(".");
  if (!ivText || !tagText || !ciphertextText) throw new Error("INVALID_ENCRYPTED_SECRET");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
}

export function verifyZohoWebhook(rawBody: Buffer, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  let received: Buffer;
  try { received = Buffer.from(signature, "base64"); } catch { return false; }
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function verifyResendWebhook(rawBody: Buffer, headers: Headers, secret: string, now = Date.now()) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(now / 1000 - seconds) > 300) return false;
  let key: Buffer;
  try { key = Buffer.from(secret.replace(/^whsec_/, ""), "base64"); } catch { return false; }
  const expected = createHmac("sha256", key).update(Buffer.concat([Buffer.from(`${id}.${timestamp}.`), rawBody])).digest("base64");
  return signatures.split(" ").some((entry) => {
    const [version, encoded] = entry.split(",", 2);
    if (version !== "v1" || !encoded) return false;
    const left = Buffer.from(expected);
    const right = Buffer.from(encoded);
    return left.length === right.length && timingSafeEqual(left, right);
  });
}

export function parseInternetHeaders(raw: unknown) {
  const headers = parseZohoHeaderFields(raw);
  const ids = (name: string) => (headers[name] ?? []).flatMap((value) => value.match(/<[^<>\s]+>/g) ?? []);
  return {
    messageId: ids("message-id")[0] ?? null,
    inReplyTo: ids("in-reply-to"),
    references: ids("references"),
  };
}

export function parseZohoHeaderFields(raw: unknown): Record<string, string[]> {
  const headers: Record<string, string[]> = {};
  if (typeof raw === "string") {
    const lines = raw.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/);
    let current = "";
    for (const line of lines) {
      const separator = line.indexOf(":");
      if (separator > 0) {
        current = line.slice(0, separator).trim().toLowerCase();
        (headers[current] ??= []).push(line.slice(separator + 1).trim());
      } else if (current && line.trim()) {
        headers[current][headers[current].length - 1] += ` ${line.trim()}`;
      }
    }
    return headers;
  }

  // Zoho documents a raw string for raw=true and a keyed header map for
  // raw=false. Accept both response shapes without logging header values.
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [name, value] of Object.entries(raw)) {
      const values = Array.isArray(value) ? value : [value];
      headers[name.toLowerCase()] = values.filter((item): item is string => typeof item === "string");
    }
  }
  return headers;
}

function parseZohoAddress(value: unknown) {
  if (typeof value !== "string") return null;
  const match = value.match(/<([^<>\s]+)>/) ?? value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[1] ?? match?.[0] ?? null;
}

function zohoMessageBody(data: Record<string, unknown>) {
  const value = typeof data.content === "string" ? data.content : typeof data.mailContent === "string" ? data.mailContent : "";
  return htmlToText(value).slice(0, 10000);
}

export function normalizeZohoMessageDetails(
  headerContent: unknown,
  contentData: Record<string, unknown>,
  listData: { fromAddress?: string; subject?: string } = {},
) {
  const headerFields = parseZohoHeaderFields(headerContent);
  const from = headerFields.from?.[0] ?? "";
  const identifiers = parseInternetHeaders(headerContent);
  return {
    ...identifiers,
    senderEmail: (parseZohoAddress(from) ?? parseZohoAddress(listData.fromAddress) ?? "").trim().toLowerCase(),
    senderName: from.replace(/<[^<>]+>/g, "").replace(/^['"]|['"]$/g, "").trim(),
    subject: (headerFields.subject?.[0] ?? listData.subject ?? "").trim().slice(0, 300),
    body: zohoMessageBody(contentData),
  };
}

export function htmlToText(html: string) {
  return html.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/[\t ]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function getZohoConnection() {
  const db = createServiceClient();
  const { data, error } = await db.from("support_email_connection").select("*").eq("singleton", true).maybeSingle();
  if (error) throw new Error("ZOHO_CONNECTION_LOAD_FAILED");
  return data;
}

async function persistConnection(values: Record<string, unknown>) {
  const db = createServiceClient();
  const { data: existing, error: lookupError } = await db.from("support_email_connection").select("singleton").eq("singleton", true).maybeSingle();
  if (lookupError) throw new Error("ZOHO_CONNECTION_LOAD_FAILED");
  const result = existing
    ? await db.from("support_email_connection").update(values).eq("singleton", true)
    : await db.from("support_email_connection").insert({ singleton: true, ...values });
  const error = result.error;
  if (error) throw new Error("ZOHO_CONNECTION_SAVE_FAILED");
}

export async function getZohoAccessToken() {
  const connection = await getZohoConnection();
  if (!connection?.refresh_token_ciphertext) throw new Error("ZOHO_NOT_CONNECTED");
  if (connection.access_token_ciphertext && connection.access_token_expires_at && Date.parse(connection.access_token_expires_at) > Date.now() + 60_000) {
    return decryptSecret(connection.access_token_ciphertext);
  }
  const clientId = process.env.ZOHO_MAIL_CLIENT_ID;
  const clientSecret = process.env.ZOHO_MAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("ZOHO_OAUTH_NOT_CONFIGURED");
  const response = await fetch(`${ACCOUNTS_API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token", refresh_token: decryptSecret(connection.refresh_token_ciphertext),
      client_id: clientId, client_secret: clientSecret,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || typeof result?.access_token !== "string") throw new Error("ZOHO_TOKEN_REFRESH_FAILED");
  await persistConnection({
    access_token_ciphertext: encryptSecret(result.access_token),
    access_token_expires_at: new Date(Date.now() + Number(result.expires_in ?? 3600) * 1000).toISOString(),
    ...(typeof result.refresh_token === "string" ? { refresh_token_ciphertext: encryptSecret(result.refresh_token) } : {}),
    last_error: null,
  });
  return result.access_token as string;
}

export async function zohoApi<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${MAIL_API}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`ZOHO_API_HTTP_${response.status}`);
  const result = parseZohoJson(await response.text()) as { status?: { code?: number; description?: string }; data?: T };
  if (result.status?.code && result.status.code >= 400) throw new Error("ZOHO_API_REJECTED");
  if (result.data === undefined) throw new Error("ZOHO_API_EMPTY_RESPONSE");
  return result.data;
}

export function getZohoOAuthConfig() {
  const clientId = process.env.ZOHO_MAIL_CLIENT_ID;
  const clientSecret = process.env.ZOHO_MAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("ZOHO_OAUTH_NOT_CONFIGURED");
  return { clientId, clientSecret, accountsApi: ACCOUNTS_API, mailbox: MAILBOX };
}

function addressValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function matchZohoMailboxAccount(accounts: Array<Record<string, unknown>>, mailbox: string) {
  const target = mailbox.trim().toLowerCase();
  for (const account of accounts) {
    const matches: string[] = [];
    for (const key of ["primaryEmailAddress", "mailboxAddress", "incomingUserName", "email"]) {
      if (addressValue(account[key]) === target) matches.push(key);
    }

    const emailAddress = account.emailAddress;
    if (typeof emailAddress === "string" && addressValue(emailAddress) === target) matches.push("emailAddress");
    const addressEntries = Array.isArray(emailAddress) ? emailAddress : emailAddress && typeof emailAddress === "object" ? [emailAddress] : [];
    for (const entry of addressEntries) {
      if (!entry || typeof entry !== "object") continue;
      const address = (entry as Record<string, unknown>).mailId ?? (entry as Record<string, unknown>).emailAddress ?? (entry as Record<string, unknown>).address;
      if (addressValue(address) === target) matches.push(Boolean((entry as Record<string, unknown>).isAlias) ? "emailAddress.alias" : "emailAddress.mailId");
    }
    if (matches.length) return { account, matchedFields: Array.from(new Set(matches)) };
  }
  return null;
}

export function summarizeZohoAccounts(accounts: Array<Record<string, unknown>>, mailbox: string) {
  let emailAddressArrayRows = 0;
  let emailAddressEntryCount = 0;
  let aliasEntryCount = 0;
  let primaryEntryCount = 0;
  let primaryEmailAddressFieldRows = 0;
  for (const account of accounts) {
    if (typeof account.primaryEmailAddress === "string") primaryEmailAddressFieldRows++;
    if (!Array.isArray(account.emailAddress)) continue;
    emailAddressArrayRows++;
    for (const entry of account.emailAddress) {
      if (!entry || typeof entry !== "object") continue;
      emailAddressEntryCount++;
      const value = entry as Record<string, unknown>;
      if (value.isAlias === true) aliasEntryCount++;
      if (value.isPrimary === true) primaryEntryCount++;
    }
  }
  const match = matchZohoMailboxAccount(accounts, mailbox);
  return {
    accountCount: accounts.length,
    emailAddressArrayRows,
    emailAddressEntryCount,
    aliasEntryCount,
    primaryEntryCount,
    primaryEmailAddressFieldRows,
    targetMailboxMatched: Boolean(match),
    matchedFieldNames: match?.matchedFields ?? [],
  };
}

export async function saveZohoTokens(input: { accessToken: string; refreshToken: string; expiresIn: number; accountId: string; inboxFolderId: string }) {
  const current = await getZohoConnection().catch(() => null);
  const now = new Date().toISOString();
  await persistConnection({
    zoho_account_id: input.accountId,
    zoho_inbox_folder_id: input.inboxFolderId,
    refresh_token_ciphertext: encryptSecret(input.refreshToken),
    access_token_ciphertext: encryptSecret(input.accessToken),
    access_token_expires_at: new Date(Date.now() + input.expiresIn * 1000).toISOString(),
    connected_at: now,
    import_started_at: current?.import_started_at ?? now,
    last_error: null,
  });
}

export async function saveZohoWebhookSecret(secret: string) {
  await persistConnection({ webhook_secret_ciphertext: encryptSecret(secret), updated_at: new Date().toISOString() });
}

export async function setZohoConnectionError(code: string | null, webhookAt = false, reconciledAt = false) {
  const values: Record<string, unknown> = { last_error: code, updated_at: new Date().toISOString() };
  if (webhookAt) values.last_webhook_at = new Date().toISOString();
  if (reconciledAt) values.last_reconciled_at = new Date().toISOString();
  await persistConnection(values);
}

export async function finishZohoReconciliation(nextStart: number, errorCode: string | null) {
  const now = new Date().toISOString();
  await persistConnection({ reconcile_start: nextStart, last_reconciled_at: now, last_error: errorCode, updated_at: now });
}

export async function recordZohoEvent(input: { eventId: string; eventType: string; providerMessageId?: string | null; status: string; errorCode?: string | null }) {
  const db = createServiceClient();
  const { error } = await db.from("support_email_webhook_events").upsert({
    provider: "zoho", event_id: input.eventId, event_type: input.eventType, provider_message_id: input.providerMessageId ?? null,
    status: input.status, error_code: input.errorCode ?? null, processed_at: new Date().toISOString(),
  }, { onConflict: "provider,event_id" });
  if (error) throw new Error("ZOHO_EVENT_LOG_FAILED");
}

export async function importZohoMessage(message: { messageId: string; folderId: string; threadId?: string; receivedTime?: number | string; fromAddress?: string; subject?: string }) {
  const db = createServiceClient();
  const connection = await getZohoConnection();
  if (!connection?.zoho_account_id || !connection.import_started_at) throw new Error("ZOHO_NOT_CONNECTED");
  const occurredAt = new Date(Number(message.receivedTime) || Date.now()).toISOString();
  if (Date.parse(occurredAt) < Date.parse(connection.import_started_at)) return { ignored: true, reason: "before_connection" };

  const existing = await db.from("support_email_message_links").select("id").eq("provider", "zoho").eq("provider_message_id", message.messageId).maybeSingle();
  if (existing.data) return { duplicate: true };

  const token = await getZohoAccessToken();
  const accountId = encodeURIComponent(connection.zoho_account_id);
  const folderId = encodeURIComponent(message.folderId);
  const messageId = encodeURIComponent(message.messageId);
  const [headerData, contentData] = await Promise.all([
    zohoApi<{ headerContent?: unknown }>(`/accounts/${accountId}/folders/${folderId}/messages/${messageId}/header?raw=true`, token),
    zohoApi<Record<string, unknown>>(`/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content?includeBlockContent=false`, token),
  ]);
  const details = normalizeZohoMessageDetails(headerData.headerContent, contentData, message);
  if (!details.senderEmail) throw new Error("ZOHO_MESSAGE_MISSING_SENDER");
  const references = [...details.references, ...details.inReplyTo].filter((value, index, all) => all.indexOf(value) === index);
  const { data, error } = await db.rpc("import_zoho_support_email", {
    p_provider_message_id: message.messageId,
    p_provider_thread_id: message.threadId ?? null,
    p_rfc_message_id: details.messageId,
    p_references: references,
    p_sender_email: details.senderEmail,
    p_sender_name: details.senderName,
    p_subject: details.subject,
    p_body: details.body,
    p_occurred_at: occurredAt,
  }).single();
  if (error) {
    const providerCode = typeof error.code === "string" && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : "UNKNOWN";
    throw new Error(`ZOHO_MESSAGE_IMPORT_FAILED_${providerCode}`);
  }
  if (!data) throw new Error("ZOHO_MESSAGE_IMPORT_FAILED_NO_RESULT");
  return { duplicate: !(data as { inserted: boolean }).inserted, conversationId: (data as { conversation_id: string }).conversation_id };
}

export async function setConnectionErrorCode(code: string | null) {
  await persistConnection({ last_error: code, updated_at: new Date().toISOString() });
}

export function webhookPathToken() {
  const token = process.env.ZOHO_MAIL_WEBHOOK_TOKEN;
  if (!token || token.length < 32) throw new Error("ZOHO_MAIL_WEBHOOK_TOKEN_NOT_CONFIGURED");
  return token;
}
