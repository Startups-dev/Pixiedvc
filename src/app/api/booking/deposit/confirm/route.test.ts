import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/affiliate-conversions", () => ({ ensureAffiliateConversionForBooking: vi.fn() }));

import { GET } from "./route";

const oldKey = process.env.STRIPE_SECRET_KEY;
const oldBaseUrl = process.env.APP_BASE_URL;
const oldFetch = global.fetch;

describe("deposit confirmation redirect origin", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "fake-test-key";
    process.env.APP_BASE_URL = "https://hannadvc.com";
    global.fetch = vi.fn() as typeof fetch;
  });

  afterEach(() => {
    if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = oldKey;
    if (oldBaseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = oldBaseUrl;
    global.fetch = oldFetch;
  });

  it("uses the public site on a missing-session redirect from an internal URL", async () => {
    const response = await GET(new Request("https://0.0.0.0:8080/api/booking/deposit/confirm"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://hannadvc.com/book?deposit=failed");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("preserves the JSON response for a missing session", async () => {
    const response = await GET(new Request("https://0.0.0.0:8080/api/booking/deposit/confirm?format=json"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ confirmed: false, error: "Missing secret or session id." });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
