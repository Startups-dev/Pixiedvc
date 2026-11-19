import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recipients: ["admin-one@example.test", "admin-two@example.test"],
  events: [] as Array<Record<string, unknown>>,
  claims: [] as Array<Record<string, unknown>>,
  rpc: vi.fn(),
  fetch: vi.fn(),
  deferred: vi.fn(),
  needsReview: 0,
}));
vi.mock("@/lib/admin-emails", () => ({ adminEmails: () => mocks.recipients }));
vi.mock("@/lib/app-url", () => ({ getAppUrl: (path: string) => `https://hannadvc.test${path}` }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdminClient: () => ({
  rpc: mocks.rpc,
  from: (table: string) => table === "ready_stay_submission_outbox" ? {
    select: () => ({ is: () => ({ lte: () => ({ order: () => ({ limit: async () => ({ data: mocks.events, error: null }) }) }) }) }),
    update: (value: unknown) => { mocks.deferred(value); return { eq: () => ({ is: async () => ({ error: null }) }) }; },
  } : { select: () => ({ not: () => ({ is: () => ({ eq: async () => ({ error: null, count: mocks.needsReview }) }) }) }) },
}) }));
import { buildReadyStaySubmissionMessages, runReadyStaySubmissionEmails } from "./submission-notifications";

const details = {
  id: "11111111-1111-4111-8111-111111111111", ownerId: "owner-1", ownerEmail: "owner@example.test",
  resortName: "Saratoga Springs Resort", checkIn: "2027-01-18", checkOut: "2027-01-20",
  roomType: "Preferred Studio", points: 26,
};
const delivery = {
  id: "email-1", queue_claim_token: "claim-1", idempotency_key: "persistent-key",
  queue_locked_until: "2099-01-01T00:00:00.000Z",
  queue_request: { from: "original@example.test", to: "owner@example.test", subject: "Frozen subject", text: "Frozen body" },
};
describe("Ready Stay durable email worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recipients = ["admin-one@example.test", "admin-two@example.test"];
    mocks.events = [];
    mocks.claims = [];
    mocks.needsReview = 0;
    process.env.RESEND_API_KEY = "synthetic-test-key";
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: "resend-1" }) });
    mocks.rpc.mockImplementation(async (name: string) => name === "claim_ready_stay_submission_email"
      ? { data: mocks.claims.splice(0, 1), error: null } : { data: true, error: null });
  });
  it("freezes full owner/Admin messages and stable bounded keys", () => {
    const messages = buildReadyStaySubmissionMessages(details);
    expect(messages.map(m => m.request.to)).toEqual(["owner@example.test", ...mocks.recipients]);
    expect(messages[0].request.text).toContain("Points: 26");
    expect(messages[0].request.text).toContain("2027-01-18 – 2027-01-20");
    expect(messages[0].request.text).toContain("Preferred Studio");
    expect(messages[1].request.text).toContain("Admin sign-in required");
    expect(messages[1].request.text).toContain(`/admin/ready-stays?review=${details.id}`);
    expect(buildReadyStaySubmissionMessages(details)).toEqual(messages);
    expect(messages.every(m => m.idempotencyKey.length <= 256)).toBe(true);
  });
  it("deduplicates configured Admin addresses", () => {
    mocks.recipients = ["admin@example.test", "admin@example.test"];
    expect(buildReadyStaySubmissionMessages(details)).toHaveLength(2);
  });
  it("does not discard a missing recipient: retains the intent for scheduled preparation retry", async () => {
    mocks.recipients = [];
    mocks.events = [{ ready_stay_id: details.id, details }];
    expect((await runReadyStaySubmissionEmails()).preparationFailed).toBe(1);
    expect(mocks.deferred).toHaveBeenCalledWith(expect.objectContaining({ next_attempt_at: expect.any(String) }));
    expect(mocks.rpc).not.toHaveBeenCalledWith("expand_ready_stay_submission_emails", expect.anything());
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("recovers an intent left after the HTTP process stopped after saving", async () => {
    mocks.events = [{ ready_stay_id: details.id, details }];
    mocks.claims = [delivery];
    expect(await runReadyStaySubmissionEmails()).toEqual({ sent: 1, failed: 0, preparationFailed: 0, needsReview: 0 });
    expect(mocks.rpc).toHaveBeenCalledWith("expand_ready_stay_submission_emails", { p_id: details.id, p_messages: buildReadyStaySubmissionMessages(details) });
    expect(mocks.fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      body: JSON.stringify(delivery.queue_request), headers: expect.objectContaining({ "Idempotency-Key": "persistent-key" }),
    }));
    expect(mocks.rpc).toHaveBeenCalledWith("finish_ready_stay_submission_email", {
      p_id: "email-1", p_token: "claim-1", p_provider_id: "resend-1", p_error: null, p_definitely_rejected: false,
    });
  });
  it.each([429, 503])("schedules HTTP %s failures rather than depending on immediate retries", async status => {
    mocks.claims = [delivery];
    mocks.fetch.mockResolvedValueOnce({ ok: false, status });
    expect((await runReadyStaySubmissionEmails()).failed).toBe(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("finish_ready_stay_submission_email", expect.objectContaining({ p_error: `Resend HTTP ${status}`, p_definitely_rejected: status === 429 }));
  });
  it("recovers a transport/timeout failure through the persisted retry state", async () => {
    mocks.claims = [delivery];
    mocks.fetch.mockRejectedValueOnce(new Error("timeout"));
    expect((await runReadyStaySubmissionEmails()).failed).toBe(1);
    expect(mocks.rpc).toHaveBeenCalledWith("finish_ready_stay_submission_email", expect.objectContaining({ p_error: "timeout" }));
  });
  it("reports a lost DB acknowledgement so the lease can recover the same payload/key", async () => {
    mocks.claims = [delivery];
    mocks.rpc.mockImplementation(async (name: string) => name === "claim_ready_stay_submission_email"
      ? { data: mocks.claims.splice(0, 1), error: null } : { data: null, error: { message: "connection lost" } });
    await expect(runReadyStaySubmissionEmails()).rejects.toThrow("acknowledgement_failed");
  });
  it("does not claim or send when provider configuration is absent", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(runReadyStaySubmissionEmails()).rejects.toThrow("RESEND_API_KEY_missing");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("does not send if a suspended process resumes with an expired lease", async () => {
    mocks.claims = [{ ...delivery, queue_locked_until: "2020-01-01T00:00:00.000Z" }];
    await expect(runReadyStaySubmissionEmails()).rejects.toThrow("claim_expired");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("exposes expired ambiguous deliveries for operational review", async () => {
    mocks.needsReview = 2;
    expect((await runReadyStaySubmissionEmails()).needsReview).toBe(2);
  });
});
