import { describe, expect, test, vi } from "vitest";

const sessionClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "admin-1", email: "admin@example.com" } },
    }),
  },
};

const deleteMatch = vi.fn();
const adminClient = {
  from: vi.fn((table: string) => {
    if (table === "booking_matches") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "11111111-1111-4111-8111-111111111111", booking_id: "booking-1", status: "accepted" },
              error: null,
            }),
          })),
        })),
        delete: deleteMatch,
      };
    }
    if (table === "rentals") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      };
    }
    return {};
  }),
};

vi.mock("@/lib/admin-emails", () => ({
  emailIsAllowedForAdmin: vi.fn(() => true),
}));

vi.mock("@/lib/admin/audit", () => ({
  logAdminAuditEvent: vi.fn(),
}));

vi.mock("@/lib/admin/matching", () => ({
  fetchAdminMatchDetail: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => sessionClient),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: vi.fn(() => adminClient),
}));

import { DELETE } from "./route";

describe("DELETE /api/admin/matching/[matchId]", () => {
  test("preserves accepted match history even when no rental exists", async () => {
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ matchId: "11111111-1111-4111-8111-111111111111" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/preserved/);
    expect(deleteMatch).not.toHaveBeenCalled();
  });
});
