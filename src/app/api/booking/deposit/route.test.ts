import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ isTest: false }));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "guest-1" } } }) } }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "booking-1", is_test_booking: state.isTest }, error: null }) }) }),
    }),
  }),
}));
vi.mock("@/lib/affiliate-conversions", () => ({ ensureAffiliateConversionForBooking: vi.fn() }));

import { POST } from "./route";

const oldKey = process.env.STRIPE_SECRET_KEY;
const oldFetch = global.fetch;

function request() {
  return new Request("http://localhost/api/booking/deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId: "booking-1", amount: 99, currency: "USD", gateway: "stripe" }),
  });
}

describe("deposit checkout isolation", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "fake-test-key";
    state.isTest = false;
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ id: "session-1", url: "https://checkout.stripe.test/session-1" }), { status: 200 })) as typeof fetch;
  });
  afterEach(() => {
    if (oldKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = oldKey;
    global.fetch = oldFetch;
  });

  it("never calls Stripe for a TEST booking", async () => {
    state.isTest = true;
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("keeps the existing Stripe checkout for regular bookings", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).url).toBe("https://checkout.stripe.test/session-1");
    expect(global.fetch).toHaveBeenCalledOnce();
  });
});
