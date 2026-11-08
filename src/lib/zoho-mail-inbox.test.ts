import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { classifyZohoMessageSource, decryptSecret, encryptSecret, htmlToText, matchZohoMailboxAccount, normalizeZohoMessageDetails, normalizeZohoThreadId, parseInternetHeaders, summarizeZohoAccounts, verifyResendWebhook, verifyZohoWebhook } from "@/lib/zoho-mail-inbox";
import { parseZohoJson } from "@/lib/zoho-json";

const oldKey = process.env.ZOHO_MAIL_ENCRYPTION_KEY;
afterEach(() => {
  if (oldKey === undefined) delete process.env.ZOHO_MAIL_ENCRYPTION_KEY;
  else process.env.ZOHO_MAIL_ENCRYPTION_KEY = oldKey;
});

describe("Zoho Mail inbox security and threading helpers", () => {
  it("preserves large numeric Zoho message, folder, thread, and account identifiers exactly", () => {
    const parsed = parseZohoJson<{ data: Array<Record<string, unknown>> }>(
      '{"data":[{"messageId":1560840837125110000,"folderId":3881227000000013000,"threadId":9007199254740993123,"accountId":9876543210987654321,"receivedTime":1792534702178,"subject":"Message body says \\\"messageId\\\": 123"}]}',
    );
    expect(parsed.data[0]).toMatchObject({
      messageId: "1560840837125110000",
      folderId: "3881227000000013000",
      threadId: "9007199254740993123",
      accountId: "9876543210987654321",
      receivedTime: 1792534702178,
    });
    expect(parsed.data[0].subject).toBe('Message body says "messageId": 123');
  });

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

  it("normalizes Zoho's documented header-map and content response shapes", () => {
    const details = normalizeZohoMessageDetails({
      From: ['Hanna Test <Sender@Example.test>'],
      To: ["hello@hannadvc.com, Jen <jen@example.test>"],
      Cc: ["copy@example.test"],
      Subject: ["Re: Test"],
      "Message-ID": ["<incoming@example.test>"],
      "In-Reply-To": ["<outgoing@example.test>"],
    }, { messageId: "synthetic-message", content: "<div>Hanna inbox test 2</div>" });

    expect(details).toMatchObject({
      senderEmail: "sender@example.test",
      senderName: "Hanna Test",
      recipientEmails: ["hello@hannadvc.com", "jen@example.test", "copy@example.test"],
      subject: "Re: Test",
      messageId: "<incoming@example.test>",
      inReplyTo: ["<outgoing@example.test>"],
      body: "Hanna inbox test 2",
    });
  });

  it("uses Zoho's documented list sender when a usable From header is absent", () => {
    const details = normalizeZohoMessageDetails(null, { mailContent: "Plain text message" }, {
      fromAddress: "sender@example.test",
      subject: "Synthetic subject",
    });

    expect(details).toMatchObject({
      senderEmail: "sender@example.test",
      subject: "Synthetic subject",
      body: "Plain text message",
    });
  });

  it("accepts a subject-only email when Zoho returns an HTML body that renders empty", () => {
    const details = normalizeZohoMessageDetails(
      [
        "From: Hanna Test <sender@example.test>",
        "Subject: Hanna inbox test 2",
        "Message-ID: <subject-only@example.test>",
      ].join("\r\n"),
      { messageId: "synthetic-message", content: "<div></div>" },
      { fromAddress: "sender@example.test", subject: "Hanna inbox test 2" },
    );

    expect(details).toMatchObject({
      senderEmail: "sender@example.test",
      subject: "Hanna inbox test 2",
      messageId: "<subject-only@example.test>",
      body: "",
    });
    expect(details.body).toHaveLength(0);
  });

  it("matches the requested Zoho mailbox in documented primary and alias response fields", () => {
    const accounts = [
      {
        accountId: "synthetic-account-1",
        primaryEmailAddress: "primary@example.test",
        mailboxAddress: "primary@example.test",
        emailAddress: [
          { mailId: "primary@example.test", isAlias: false, isPrimary: true },
          { mailId: "hello@hannadvc.com", isAlias: true, isPrimary: false },
        ],
      },
      { accountId: "synthetic-account-2", primaryEmailAddress: "other@example.test", emailAddress: [{ mailId: "other@example.test", isPrimary: true }] },
    ];

    const match = matchZohoMailboxAccount(accounts, "hello@hannadvc.com");
    expect(match?.account.accountId).toBe("synthetic-account-1");
    expect(match?.matchedFields).toContain("emailAddress.alias");
    expect(matchZohoMailboxAccount(accounts, "primary@example.test")?.matchedFields).toContain("primaryEmailAddress");
    expect(matchZohoMailboxAccount(accounts, "unlisted@hannadvc.com")).toBeNull();
    expect(summarizeZohoAccounts(accounts, "hello@hannadvc.com")).toMatchObject({
      accountCount: 2,
      emailAddressArrayRows: 2,
      emailAddressEntryCount: 3,
      aliasEntryCount: 1,
      primaryEntryCount: 2,
      targetMailboxMatched: true,
    });
    expect(JSON.stringify(summarizeZohoAccounts(accounts, "hello@hannadvc.com"))).not.toContain("hello@hannadvc.com");
  });

  it("imports only external messages from the configured inbox folder", () => {
    expect(classifyZohoMessageSource({
      folderId: "inbox-folder", inboxFolderId: "inbox-folder", senderEmail: "guest@example.test",
    })).toBe("inbound");
    expect(classifyZohoMessageSource({
      folderId: "sent-folder", inboxFolderId: "inbox-folder", senderEmail: "hello@hannadvc.com",
    })).toBe("non_inbox_folder");
  });

  it("ignores an outgoing message copied into the Inbox by its mailbox From header", () => {
    const details = normalizeZohoMessageDetails({
      From: ["HannaDVC <hello@hannadvc.com>"],
      To: ["Jen <jen@example.test>"],
    }, { content: "Hi Jen" });

    expect(classifyZohoMessageSource({
      folderId: "inbox-folder", inboxFolderId: "inbox-folder", senderEmail: details.senderEmail,
    })).toBe("mailbox_sent_copy");
    expect(details.recipientEmails).toEqual(["jen@example.test"]);
  });

  it("uses real reply IDs while rejecting Zoho's zero thread sentinel", () => {
    expect(normalizeZohoThreadId("0")).toBeNull();
    expect(normalizeZohoThreadId("000")).toBeNull();
    expect(normalizeZohoThreadId(" null ")).toBeNull();
    expect(normalizeZohoThreadId("thread-123")).toBe("thread-123");
  });

  it("keeps an incoming reply in its mixed conversation using RFC references", () => {
    const details = normalizeZohoMessageDetails({
      From: ["Guest <guest@example.test>"],
      To: ["hello@hannadvc.com"],
      "Message-ID": ["<guest-reply@example.test>"],
      "In-Reply-To": ["<resend-reply@example.test>"],
      References: ["<initial-request@example.test> <resend-reply@example.test>"],
    }, { content: "Guest reply" });

    expect(classifyZohoMessageSource({
      folderId: "inbox-folder", inboxFolderId: "inbox-folder", senderEmail: details.senderEmail,
    })).toBe("inbound");
    expect(normalizeZohoThreadId("0")).toBeNull();
    expect([...details.references, ...details.inReplyTo]).toContain("<resend-reply@example.test>");
  });
});
