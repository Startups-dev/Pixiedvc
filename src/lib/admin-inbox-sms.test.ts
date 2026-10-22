import { afterEach, describe, expect, it, vi } from "vitest";
import twilio from "twilio";
import {
  buildInboxEscalationSms,
  compareSmsVerificationCode,
  createSmsVerificationCode,
  decryptSmsPhone,
  encryptSmsPhone,
  getQuietHoursEnd,
  hashSmsVerificationCode,
  mapTwilioCallbackStatus,
  normalizeE164Phone,
  smsStatusCallbackUrl,
  validateTwilioStatusSignature,
} from "@/lib/admin-inbox-sms";

describe("Admin Inbox SMS safeguards", () => {
  const env = process.env as Record<string, string | undefined>;
  const savedEnv = new Map(["ADMIN_INBOX_SMS_ENCRYPTION_KEY", "TWILIO_SMS_AUTH_TOKEN", "NODE_ENV", "APP_BASE_URL"]
    .map((name) => [name, env[name]] as const));
  afterEach(() => {
    for (const [name, value] of savedEnv) {
      if (value === undefined) Reflect.deleteProperty(env, name);
      else env[name] = value;
    }
    vi.restoreAllMocks();
  });

  it("encrypts stored phone numbers and hashes expiring verification codes", () => {
    process.env.ADMIN_INBOX_SMS_ENCRYPTION_KEY = "synthetic-test-encryption-key-with-enough-length";
    const phone = normalizeE164Phone("+1 (416) 555-0100");
    expect(phone).toBe("+14165550100");
    const encrypted = encryptSmsPhone(phone!);
    expect(encrypted).not.toContain(phone!);
    expect(decryptSmsPhone(encrypted)).toBe(phone);
    const code = createSmsVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
    const challenge = "synthetic-challenge-id";
    const digest = hashSmsVerificationCode(code, challenge);
    expect(digest).not.toContain(code);
    expect(compareSmsVerificationCode(digest, code, challenge)).toBe(true);
    expect(compareSmsVerificationCode(digest, "000000", challenge)).toBe(code === "000000");
    expect(normalizeE164Phone("4165550100")).toBeNull();
  });

  it("defers sends during quiet hours in Toronto time, including overnight periods", () => {
    const beforeStart = new Date("2026-01-15T23:30:00Z"); // 6:30 PM Toronto
    expect(getQuietHoursEnd(beforeStart, true, "22:00", "08:00", "America/Toronto")).toBeNull();
    const overnight = new Date("2026-01-16T04:00:00Z"); // 11 PM Toronto
    expect(getQuietHoursEnd(overnight, true, "22:00", "08:00", "America/Toronto")?.toISOString()).toBe("2026-01-16T13:00:00.000Z");
    const daytime = new Date("2026-01-16T15:00:00Z"); // 10 AM Toronto
    expect(getQuietHoursEnd(daytime, true, "09:00", "17:00", "America/Toronto")?.toISOString()).toBe("2026-01-16T22:00:00.000Z");
  });

  it("keeps SMS contents minimal and uses the public production Inbox link", () => {
    env.NODE_ENV = "production";
    expect(buildInboxEscalationSms("synthetic-conversation-id")).toBe(
      "HannaDVC Inbox: a conversation needs attention. https://hannadvc.com/admin/inbox?conversation=synthetic-conversation-id",
    );
    expect(smsStatusCallbackUrl()).toBe("https://hannadvc.com/api/webhooks/twilio/sms-status");
  });

  it("validates callbacks with Twilio's signature validator and maps statuses", () => {
    process.env.TWILIO_SMS_AUTH_TOKEN = "synthetic-auth-token";
    process.env.APP_BASE_URL = "https://hannadvc.com";
    env.NODE_ENV = "test";
    const url = smsStatusCallbackUrl();
    const params = { MessageSid: "SMsynthetic", MessageStatus: "delivered" };
    const signature = twilio.getExpectedTwilioSignature(process.env.TWILIO_SMS_AUTH_TOKEN, url, params);
    expect(validateTwilioStatusSignature(url, params, signature)).toBe(true);
    expect(validateTwilioStatusSignature(url, { ...params, MessageStatus: "failed" }, signature)).toBe(false);
    expect(validateTwilioStatusSignature(url, params, null)).toBe(false);
    expect(mapTwilioCallbackStatus("queued")).toBe("accepted");
    expect(mapTwilioCallbackStatus("delivered")).toBe("delivered");
    expect(mapTwilioCallbackStatus("undelivered")).toBe("failed");
    expect(mapTwilioCallbackStatus("made-up-status")).toBeNull();
  });
});
