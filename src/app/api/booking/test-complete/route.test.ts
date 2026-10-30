import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  userId: "11111111-1111-4111-8111-111111111111",
  allowed: true,
  switchEnabled: true,
  booking: {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    renter_id: "11111111-1111-4111-8111-111111111111",
    status: "draft",
    is_test_booking: true,
    deposit_status: "test_pending",
    deposit_due: 99,
    deposit_paid: 0,
  },
  updates: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: state.userId } } }) } }),
}));
vi.mock("@/lib/test-guest-booking", () => ({ isDesignatedTestGuest: () => state.allowed, isTestBookingEnabled: async () => state.switchEnabled }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      select: () => makeQuery(() => ({ data: state.booking, error: null })),
      update: (values: Record<string, unknown>) => {
        state.updates.push(values);
        return makeQuery(() => ({ data: { id: state.booking.id }, error: null }));
      },
    }),
  }),
}));

function makeQuery(resolve: () => unknown) {
  const query = {
    eq: () => query,
    select: () => query,
    maybeSingle: async () => resolve(),
  };
  return query;
}

import { POST } from "./route";

function request() {
  return new Request("http://localhost/api/booking/test-complete", {
    method: "POST",
    body: JSON.stringify({ bookingId: state.booking.id }),
  });
}

describe("test deposit completion", () => {
  beforeEach(() => {
    state.allowed = true;
    state.switchEnabled = true;
    state.booking.status = "draft";
    state.booking.is_test_booking = true;
    state.booking.deposit_status = "test_pending";
    state.booking.deposit_paid = 0;
    state.updates.length = 0;
  });

  it("submits an allowlisted test request without recording payment", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(state.updates).toEqual([expect.objectContaining({ status: "submitted", deposit_status: "test_bypassed" })]);
    expect(state.updates[0]).not.toHaveProperty("deposit_paid");
  });

  it("rejects every other account before reading or updating the booking", async () => {
    state.allowed = false;
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(state.updates).toHaveLength(0);
  });

  it("refuses completion as soon as the live switch is disabled", async () => {
    state.switchEnabled = false;
    expect((await POST(request())).status).toBe(403);
    expect(state.updates).toHaveLength(0);
  });

  it("rejects a regular booking and a booking with paid deposit", async () => {
    state.booking.is_test_booking = false;
    expect((await POST(request())).status).toBe(404);
    state.booking.is_test_booking = true;
    state.booking.deposit_paid = 99;
    expect((await POST(request())).status).toBe(409);
    expect(state.updates).toHaveLength(0);
  });
});
