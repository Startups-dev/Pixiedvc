import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  validateTwilioStatusSignature: vi.fn(),
  smsStatusCallbackUrl: vi.fn(),
  applyStoredTwilioSmsCallbacks: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/lib/supabase-service-client", () => ({ createServiceClient: mocks.createServiceClient }));
vi.mock("@/lib/admin-inbox-sms", () => ({
  validateTwilioStatusSignature: mocks.validateTwilioStatusSignature,
  smsStatusCallbackUrl: mocks.smsStatusCallbackUrl,
}));
vi.mock("@/lib/admin-inbox-sms-delivery", () => ({ applyStoredTwilioSmsCallbacks: mocks.applyStoredTwilioSmsCallbacks }));

import { POST } from "./route";

describe("Twilio SMS status webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.smsStatusCallbackUrl.mockReturnValue("https://hannadvc.com/api/webhooks/twilio/sms-status");
    mocks.validateTwilioStatusSignature.mockReturnValue(true);
    mocks.createServiceClient.mockReturnValue({ from: () => ({ upsert: mocks.upsert }) });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.applyStoredTwilioSmsCallbacks.mockResolvedValue({ found: true, updated: true, error: false });
  });

  it("rejects an invalid signature without persisting the callback", async () => {
    mocks.validateTwilioStatusSignature.mockReturnValue(false);
    const response = await POST(new Request("https://hannadvc.com/api/webhooks/twilio/sms-status", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": "invalid" },
      body: "MessageSid=SMsynthetic&MessageStatus=delivered",
    }));
    expect(response.status).toBe(403);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("stores only provider status metadata idempotently and applies early callbacks after the send response", async () => {
    const response = await POST(new Request("https://hannadvc.com/api/webhooks/twilio/sms-status", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": "synthetic-valid" },
      body: "MessageSid=SMsynthetic&MessageStatus=delivered&ErrorCode=",
    }));
    expect(response.status).toBe(200);
    expect(mocks.validateTwilioStatusSignature).toHaveBeenCalledWith(
      "https://hannadvc.com/api/webhooks/twilio/sms-status",
      { MessageSid: "SMsynthetic", MessageStatus: "delivered", ErrorCode: "" },
      "synthetic-valid",
    );
    expect(mocks.upsert).toHaveBeenCalledWith({
      provider_message_sid: "SMsynthetic", provider_status: "delivered", error_code: null,
    }, { onConflict: "provider_message_sid,provider_status", ignoreDuplicates: true });
    expect(mocks.applyStoredTwilioSmsCallbacks).toHaveBeenCalledWith("SMsynthetic");
  });
});
