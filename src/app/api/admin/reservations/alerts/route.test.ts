import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  authorized: true,
  rows: [{ id: "alert-1", booking_request_id: "booking-1", renter_request_id: null, created_at: "2026-10-24T10:00:00Z" }],
  update: vi.fn(),
}));

vi.mock("@/lib/admin-reservation-alerts", async (load) => {
  const actual = await load<typeof import("@/lib/admin-reservation-alerts")>();
  return {
    ...actual,
    getAdminReservationAlertContext: async () => state.authorized
      ? { ok: true, userId: "admin-1", client: {
        from: () => ({
          select: () => ({
            is: () => ({ order: () => ({ limit: async () => ({ data: state.rows, count: state.rows.length, error: null }) }) }),
            gte: () => ({ order: () => ({ limit: async () => ({ data: state.rows, error: null }) }) }),
          }),
          update: (values: Record<string, unknown>) => {
            state.update(values);
            return { eq: () => ({
              is: async () => ({ error: null }),
              eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: "42" }, error: null }) }) }),
            }) };
          },
        }),
      } }
      : { ok: false, response: Response.json({ error: "FORBIDDEN" }, { status: 403 }) },
  };
});

import { GET } from "./route";
import { POST } from "./read/route";
import { POST as reviewAvailability } from "../availability/route";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("admin reservation alerts", () => {
  beforeEach(() => { state.authorized = true; state.update.mockClear(); });

  it("returns unread count and private review destination metadata", async () => {
    const response = await GET(new Request("http://localhost/api/admin/reservations/alerts?after=2026-10-24T09:00:00Z"));
    const body = await response.json();
    expect(body.unreadCount).toBe(1);
    expect(body.events).toMatchObject([{ kind: "reservation", requestId: "booking-1", source: "booking" }]);
    expect(JSON.stringify(body)).not.toMatch(/guest|phone|email|check.in/i);
  });

  it("rejects non-admin staff and invalid read requests", async () => {
    state.authorized = false;
    expect((await GET(new Request("http://localhost/api/admin/reservations/alerts"))).status).toBe(403);
    state.authorized = true;
    expect((await POST(new Request("http://localhost/read", { method: "POST", body: JSON.stringify({ source: "booking", requestId: "bad" }) }))).status).toBe(400);
    expect(state.update).not.toHaveBeenCalled();
  });

  it("marks only the selected alert read", async () => {
    const response = await POST(new Request("http://localhost/read", { method: "POST", body: JSON.stringify({ source: "booking", requestId: uuid }) }));
    expect(response.status).toBe(200);
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ read_by: "admin-1" }));
    const renter = await POST(new Request("http://localhost/read", { method: "POST", body: JSON.stringify({ source: "renter", requestId: "42" }) }));
    expect(renter.status).toBe(200);
    const badRenter = await POST(new Request("http://localhost/read", { method: "POST", body: JSON.stringify({ source: "renter", requestId: uuid }) }));
    expect(badRenter.status).toBe(400);
  });

  it("updates a bigint renter request without assuming an updated_at column", async () => {
    const response = await reviewAvailability(new Request("http://localhost/availability", {
      method: "POST", body: JSON.stringify({ requestId: "42", availabilityStatus: "needs_clarification" }),
    }));
    expect(response.status).toBe(200);
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ availability_status: "needs_clarification" }));
    expect(state.update.mock.calls[0][0]).not.toHaveProperty("updated_at");
    expect((await reviewAvailability(new Request("http://localhost/availability", {
      method: "POST", body: JSON.stringify({ requestId: uuid, availabilityStatus: "available" }),
    }))).status).toBe(400);
  });
});
