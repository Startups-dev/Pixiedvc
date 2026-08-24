import { beforeEach, describe, expect, test, vi } from "vitest";

import { DELETE } from "./route";

let sessionClient: any;
let adminClient: any;
let deleteReadyStay: ReturnType<typeof vi.fn>;

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
  return {
    from: vi.fn((table: string) => {
      if (table === "ready_stays") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "ready-test-1",
                  rental_id: null,
                  booking_request_id: null,
                  lock_session_id: null,
                  sold_booking_request_id: null,
                  is_test_listing: true,
                },
                error: null,
              }),
            })),
          })),
          delete: deleteReadyStay,
        };
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
});
