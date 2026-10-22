import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), client: vi.fn() }));
vi.mock("twilio", () => ({ default: Object.assign(vi.fn(() => ({ messages: { create: mocks.create } })), { validateRequest: vi.fn() }) }));

import { sendAdminInboxSms } from "@/lib/admin-inbox-sms";

describe("Twilio SMS result handling", () => {
  const saved = new Map<string, string | undefined>();
  const names = ["TWILIO_SMS_ACCOUNT_SID", "TWILIO_SMS_AUTH_TOKEN", "TWILIO_SMS_MESSAGING_SERVICE_SID", "ADMIN_INBOX_SMS_ENCRYPTION_KEY"];
  beforeEach(() => {
    vi.clearAllMocks();
    for (const name of names) { saved.set(name, process.env[name]); process.env[name] = `synthetic-${name}-value-long-enough`; }
  });
  afterEach(() => {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });

  it("records Twilio acceptance and disables SDK retries", async () => {
    mocks.create.mockResolvedValue({ sid: "SMsynthetic", status: "queued" });
    await expect(sendAdminInboxSms("+14165550100", "Synthetic test only")).resolves.toEqual({
      status: "accepted", messageSid: "SMsynthetic", providerStatus: "queued",
    });
    const twilioFactory = (await import("twilio")).default as unknown as ReturnType<typeof vi.fn>;
    expect(twilioFactory).toHaveBeenCalledWith(expect.any(String), expect.any(String), { autoRetry: false, timeout: 12_000 });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0].statusCallback).toContain("/api/webhooks/twilio/sms-status");
  });

  it("marks an explicit provider rejection failed and an ambiguous network result unknown without retrying", async () => {
    mocks.create.mockRejectedValueOnce(Object.assign(new Error("provider response"), { status: 400, code: 21608 }));
    await expect(sendAdminInboxSms("+14165550100", "Synthetic test only")).resolves.toMatchObject({ status: "failed" });
    mocks.create.mockRejectedValueOnce(new Error("socket timeout"));
    await expect(sendAdminInboxSms("+14165550100", "Synthetic test only")).resolves.toMatchObject({ status: "unknown" });
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });
});
