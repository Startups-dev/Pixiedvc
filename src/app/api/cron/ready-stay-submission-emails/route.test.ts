import { beforeEach, expect, it, vi } from "vitest";
const run = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ready-stays/submission-notifications", () => ({ runReadyStaySubmissionEmails: run }));
import { POST } from "./route";
beforeEach(() => { run.mockReset(); process.env.CRON_SECRET = "synthetic-secret"; });
it("fails closed for missing or invalid scheduler authentication", async () => {
  for (const authorization of ["", "Bearer wrong", "Bearer synthetic-secrex"]) {
    const response = await POST(new Request("https://example.test", { method: "POST", headers: { authorization } }));
    expect(response.status).toBe(401);
  }
  delete process.env.CRON_SECRET;
  expect((await POST(new Request("https://example.test", { method: "POST" }))).status).toBe(401);
  expect(run).not.toHaveBeenCalled();
});
it.each([0, 1])("reports worker review requirements (%s) to scheduler monitoring", async needsReview => {
  run.mockResolvedValue({ sent: 1, failed: 0, preparationFailed: 0, needsReview });
  const response = await POST(new Request("https://example.test", { method: "POST", headers: { authorization: "Bearer synthetic-secret" } }));
  expect(response.status).toBe(needsReview ? 503 : 200);
});
