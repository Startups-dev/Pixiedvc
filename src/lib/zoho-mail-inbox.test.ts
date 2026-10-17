import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, htmlToText, parseInternetHeaders, verifyResendWebhook, verifyZohoWebhook } from "@/lib/zoho-mail-inbox";

const oldKey = process.env.ZOHO_MAIL_ENCRYPTION_KEY;
afterEach(() => {
  if (oldKey === undefined) delete process.env.ZOHO_MAIL_ENCRYPTION_KEY;
  else process.env.ZOHO_MAIL_ENCRYPTION_KEY = oldKey;
});

describe("Zoho Mail inbox security and threading helpers", () => {
  it("encrypts refresh tokens using authenticated encryption", () => {
    process.env.ZOHO_MAIL_ENCRYPTION_KEY = "test-only-key-with-adequate-length-000000000000";
    const encrypted = encryptSecret("refresh-token-value");
    expect(encrypted).not.toContain("refresh-token-value");
    expect(decryptSecret(encrypted)).toBe("refresh-token-value");
    const [iv, tag, cipherText] = encrypted.split(".");
    expect(() => decryptSecret(`${iv}.${tag}.${cipherText!.startsWith("A") ? "B" : "A"}${cipherText!.slice(1)}`)).toThrow();
  });

  it("accepts only valid Zoho HMAC signatures over the exact raw body", () => {
    const body = Buffer.from('{"messageId":123}');
    const secret = "zoho-hook-test-secret";
    const signature = createHmac("sha256", secret).update(body).digest("base64");
    expect(verifyZohoWebhook(body, signature, secret)).toBe(true);
    expect(verifyZohoWebhook(Buffer.from('{"messageId":124}'), signature, secret)).toBe(false);
  });

  it("verifies Resend signed events and rejects stale timestamps", () => {
    const body = Buffer.from('{"type":"email.sent"}');
    const key = Buffer.from("resend-webhook-secret").toString("base64");
    const signingSecret = `whsec_${key}`;
    const timestamp = "1792260000";
    const id = "evt_123";
    const signature = createHmac("sha256", Buffer.from(key, "base64"))
      .update(Buffer.concat([Buffer.from(`${id}.${timestamp}.`), body])).digest("base64");
    const headers = new Headers({ "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` });
    expect(verifyResendWebhook(body, headers, signingSecret, Number(timestamp) * 1000)).toBe(true);
    expect(verifyResendWebhook(body, headers, signingSecret, Number(timestamp) * 1000 + 301_000)).toBe(false);
  });

  it("matches only explicit RFC identifiers from message headers", () => {
    const parsed = parseInternetHeaders([
      "From: Example Guest <guest@example.test>",
      "Subject: Re: HannaDVC support reply",
      "Message-ID: <incoming@example.test>",
      "In-Reply-To: <reply@example.test>",
      "References: <ack@example.test> <reply@example.test>",
    ].join("\r\n"));
    expect(parsed).toEqual({ messageId: "<incoming@example.test>", inReplyTo: ["<reply@example.test>"], references: ["<ack@example.test>", "<reply@example.test>"] });
    expect(htmlToText('<p>Reply<br>Text</p><script>alert(1)</script>')).toBe("Reply\nText");
  });
});
