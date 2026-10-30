import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ isTest: false, userId: "guest-1" as string | null }));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null } }) } }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "booking-1", is_test_booking: state.isTest }, error: null }) }) }),
    }),
  }),
}));
vi.mock("@/lib/affiliate-conversions", () => ({ ensureAffiliateConversionForBooking: vi.fn() }));

import { GET, POST } from "./route";

const oldKey = process.env.STRIPE_SECRET_KEY;
const oldBaseUrl = process.env.APP_BASE_URL;
const oldFetch = global.fetch;

function request(origin?: string) {
  return new Request("https://0.0.0.0:8080/api/booking/deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify({ bookingId: "booking-1", amount: 99, currency: "USD", gateway: "stripe" }),
  });
}

describe("deposit checkout isolation", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "fake-test-key";
    process.env.APP_BASE_URL = "https://hannadvc.com";
    state.isTest = false;
    state.userId = "guest-1";
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ id: "session-1", url: "https://checkout.stripe.test/session-1" }), { status: 200 })) as typeof fetch;
  });
  afterEach(() => {
    if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = oldKey;
    if (oldBaseUrl === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = oldBaseUrl;
    global.fetch = oldFetch;
  });

  it("never calls Stripe for a TEST booking", async () => {
    state.isTest = true;
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("keeps the existing Stripe checkout for regular bookings", async () => {
    const response = await POST(request("https://untrusted.example"));
    expect(response.status).toBe(200);
    expect((await response.json()).url).toBe("https://checkout.stripe.test/session-1");
    expect(global.fetch).toHaveBeenCalledOnce();
    const [, options] = vi.mocked(global.fetch).mock.calls[0];
    const params = new URLSearchParams(options?.body as string);
    expect(params.get("success_url")).toBe("https://hannadvc.com/pay/deposit/success?booking_request_id=booking-1&session_id={CHECKOUT_SESSION_ID}");
    expect(params.get("cancel_url")).toBe("https://hannadvc.com/book?deposit=cancelled");
  });

  it("redirects a request addressed to the internal host to the public site", async () => {
    const response = await GET(new Request("https://0.0.0.0:8080/api/booking/deposit"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://hannadvc.com/book?deposit=failed");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("requires authentication before creating a Stripe session", async () => {
    state.userId = null;
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
