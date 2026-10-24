import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import twilio from "twilio";
import { getZohoPublicAppOrigin } from "@/lib/app-url";

export type SmsSendOutcome =
  | { status: "accepted"; messageSid: string; providerStatus: string }
  | { status: "delivered"; messageSid: string; providerStatus: string }
  | { status: "failed"; errorCode: string }
  | { status: "unknown"; errorCode: string };

export type SmsPreferences = {
  user_id: string;
  phone_ciphertext: string | null;
  phone_last4: string | null;
  phone_verified_at: string | null;
  opted_in: boolean;
  enabled: boolean;
  new_inquiry_enabled: boolean;
  assigned_reply_enabled: boolean;
  reservation_opted_in: boolean;
  reservation_enabled: boolean;
  escalation_delay_minutes: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  time_zone: string;
};

function encryptionKey() {
  const configured = process.env.ADMIN_INBOX_SMS_ENCRYPTION_KEY;
  if (!configured || configured.length < 32) throw new Error("ADMIN_INBOX_SMS_ENCRYPTION_KEY_NOT_CONFIGURED");
  return createHash("sha256").update(configured).digest();
}

export function encryptSmsPhone(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSmsPhone(value: string) {
  const [iv, tag, ciphertext] = value.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("INVALID_ENCRYPTED_PHONE");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function hashSmsVerificationCode(code: string, challengeId: string) {
  return createHmac("sha256", encryptionKey()).update(`${challengeId}:${code}`).digest("hex");
}

export function compareSmsVerificationCode(expected: string, candidate: string, challengeId: string) {
  const received = Buffer.from(hashSmsVerificationCode(candidate, challengeId), "hex");
  const stored = Buffer.from(expected, "hex");
  return stored.length === received.length && timingSafeEqual(stored, received);
}

export function createSmsVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function normalizeE164Phone(value: unknown) {
  if (typeof value !== "string") return null;
  const phone = value.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export function getSmsConfiguration() {
  const encryptionSecret = process.env.ADMIN_INBOX_SMS_ENCRYPTION_KEY ?? "";
  const ready = Boolean(
    process.env.TWILIO_SMS_ACCOUNT_SID &&
    process.env.TWILIO_SMS_AUTH_TOKEN &&
    process.env.TWILIO_SMS_MESSAGING_SERVICE_SID &&
    encryptionSecret.length >= 32,
  );
  return {
    ready,
    missing: [
      !process.env.TWILIO_SMS_ACCOUNT_SID ? "TWILIO_SMS_ACCOUNT_SID" : null,
      !process.env.TWILIO_SMS_AUTH_TOKEN ? "TWILIO_SMS_AUTH_TOKEN" : null,
      !process.env.TWILIO_SMS_MESSAGING_SERVICE_SID ? "TWILIO_SMS_MESSAGING_SERVICE_SID" : null,
      encryptionSecret.length < 32
        ? "ADMIN_INBOX_SMS_ENCRYPTION_KEY" : null,
    ].filter((value): value is string => Boolean(value)),
  };
}

export function smsStatusCallbackUrl() {
  const origin = getZohoPublicAppOrigin();
  if (!origin) throw new Error("PUBLIC_APP_ORIGIN_NOT_CONFIGURED");
  return `${origin}/api/webhooks/twilio/sms-status`;
}

export function buildInboxEscalationSms(conversationId: string) {
  const origin = getZohoPublicAppOrigin();
  if (!origin) throw new Error("PUBLIC_APP_ORIGIN_NOT_CONFIGURED");
  const link = `${origin}/admin/inbox?conversation=${encodeURIComponent(conversationId)}`;
  return `HannaDVC Inbox: a conversation needs attention. ${link}`;
}

export function buildReservationRequestSms(source: "booking" | "renter", requestId: string) {
  const origin = getZohoPublicAppOrigin();
  if (!origin) throw new Error("PUBLIC_APP_ORIGIN_NOT_CONFIGURED");
  const path = source === "renter" ? "/admin/requests/renter/" : "/admin/requests/";
  return `HannaDVC: New reservation request — availability review needed. ${origin}${path}${encodeURIComponent(requestId)}#availability-review`;
}

export function parseQuietClock(value: string | null | undefined) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute),
  };
}

function localTimeToUtc(parts: { year: number; month: number; day: number; hour: number; minute: number }, timeZone: string) {
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let guess = desired;
  for (let index = 0; index < 3; index += 1) {
    const actual = zonedParts(new Date(guess), timeZone);
    const rendered = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    guess += desired - rendered;
  }
  return new Date(guess);
}

export function getQuietHoursEnd(now: Date, enabled: boolean, startText: string | null, endText: string | null, timeZone: string) {
  if (!enabled) return null;
  const start = parseQuietClock(startText);
  const end = parseQuietClock(endText);
  if (start === null || end === null || start === end) return null;
  let current;
  try { current = zonedParts(now, timeZone); } catch { return null; }
  const currentMinute = current.hour * 60 + current.minute;
  const isQuiet = start < end
    ? currentMinute >= start && currentMinute < end
    : currentMinute >= start || currentMinute < end;
  if (!isQuiet) return null;

  const endOnNextDay = start > end && currentMinute >= start;
  const date = new Date(Date.UTC(current.year, current.month - 1, current.day + (endOnNextDay ? 1 : 0)));
  return localTimeToUtc({
    year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(),
    hour: Math.floor(end / 60), minute: end % 60,
  }, timeZone);
}

export function validateTwilioStatusSignature(url: string, params: Record<string, string>, signature: string | null) {
  const authToken = process.env.TWILIO_SMS_AUTH_TOKEN;
  if (!authToken || !signature) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}

export async function sendAdminInboxSms(to: string, body: string): Promise<SmsSendOutcome> {
  const config = getSmsConfiguration();
  const accountSid = process.env.TWILIO_SMS_ACCOUNT_SID;
  const authToken = process.env.TWILIO_SMS_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_SMS_MESSAGING_SERVICE_SID;
  if (!config.ready || !accountSid || !authToken || !messagingServiceSid) {
    return { status: "failed", errorCode: "sms_provider_not_configured" };
  }

  try {
    const client = twilio(accountSid, authToken, { autoRetry: false, timeout: 12_000 });
    const message = await client.messages.create({
      to,
      body,
      messagingServiceSid,
      statusCallback: smsStatusCallbackUrl(),
    });
    if (message.status === "delivered") {
      return { status: "delivered", messageSid: message.sid, providerStatus: message.status };
    }
    if (message.status === "failed" || message.status === "undelivered") {
      return { status: "failed", errorCode: "twilio_message_rejected" };
    }
    return { status: "accepted", messageSid: message.sid, providerStatus: message.status };
  } catch (error) {
    const providerStatus = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status) : null;
    const providerCode = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code).replace(/[^A-Za-z0-9]/g, "").slice(0, 12) : "unknown";
    if (providerStatus && providerStatus >= 400 && providerStatus < 500) {
      return { status: "failed", errorCode: `twilio_rejected_${providerCode}` };
    }
    // A timeout or 5xx may mean Twilio accepted the POST but the response was lost.
    // Mark unknown and never retry automatically; a callback may still resolve it.
    return { status: "unknown", errorCode: `twilio_outcome_unknown_${providerCode}` };
  }
}

export function mapTwilioCallbackStatus(value: string) {
  const status = value.toLowerCase();
  if (status === "delivered") return "delivered" as const;
  if (status === "failed" || status === "undelivered") return "failed" as const;
  if (["queued", "sending", "sent", "accepted", "scheduled"].includes(status)) return "accepted" as const;
  return null;
}
