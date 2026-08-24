import { beforeEach, describe, expect, test, vi } from "vitest";

import { DELETE } from "./route";

let sessionClient: any;
let adminClient: any;
let deleteReadyStay: ReturnType<typeof vi.fn>;
let readyStayRow: any;
let payoutRows: any[];
let documentRows: any[];
let exceptionRows: any[];
let nonTestReadyStayRows: any[];

vi.mock("@/lib/admin", () => ({
  isUserAdmin: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => sessionClient),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: vi.fn(() => adminClient),
}));

function makeSessionClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-1", email: "admin@example.com", app_metadata: { role: "admin" } } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
        })),
      })),
    })),
  };
}

function makeAdminClient() {
  deleteReadyStay = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  readyStayRow = {
    id: "ready-test-1",
    status: "test",
    rental_id: null,
    booking_request_id: null,
    lock_session_id: null,
    sold_booking_request_id: null,
    is_test_listing: true,
  };
  payoutRows = [];
  documentRows = [];
  exceptionRows = [];
  nonTestReadyStayRows = [];
  return {
    from: vi.fn((table: string) => {
      if (table === "ready_stays") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, value: unknown) => {
              if (value === "ready-test-1") {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: readyStayRow,
                    error: null,
                  }),
                };
              }
              return {
                eq: vi.fn(() => ({
                  neq: vi.fn(() => ({
                    limit: vi.fn().mockResolvedValue({ data: nonTestReadyStayRows, error: null }),
                  })),
                })),
              };
            }),
          })),
          delete: deleteReadyStay,
        };
      }
      if (table === "payout_ledger") {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: payoutRows, error: null }) })) })) };
      }
      if (table === "rental_documents") {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: documentRows, error: null }) })) })) };
      }
      if (table === "rental_exceptions") {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: exceptionRows, error: null }) })) })) };
      }
      return {
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
          in: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
    }),
  };
}

describe("DELETE /api/admin/testing/ready-stays", () => {
  beforeEach(() => {
    sessionClient = makeSessionClient();
    adminClient = makeAdminClient();
  });

  test("keeps protected test-listing cleanup functional", async () => {
    readyStayRow.rental_id = "rental-test-1";
    const response = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ id: "ready-test-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(deleteReadyStay).toHaveBeenCalled();
  });

  test("refuses to hard-delete sold test listings", async () => {
    readyStayRow.status = "sold";
    readyStayRow.sold_booking_request_id = "booking-1";

    const response = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ id: "ready-test-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/preserved/);
    expect(deleteReadyStay).not.toHaveBeenCalled();
  });

  test("refuses to hard-delete linked rentals with history-bearing records", async () => {
    readyStayRow.rental_id = "rental-test-1";
    payoutRows = [{ id: "payout-1" }];

    const response = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ id: "ready-test-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/history-bearing/);
    expect(deleteReadyStay).not.toHaveBeenCalled();
  });
});
