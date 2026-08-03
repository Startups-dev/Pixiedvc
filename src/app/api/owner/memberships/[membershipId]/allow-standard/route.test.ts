import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

let supabaseMock: {
  auth: { getUser: ReturnType<typeof vi.fn> };
};

let adminMock: {
  from: ReturnType<typeof vi.fn>;
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn() })),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: vi.fn(() => adminMock),
}));

describe("POST /api/owner/memberships/[membershipId]/allow-standard", () => {
  beforeEach(() => {
    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-user-1" } },
          error: null,
        }),
      },
    };
  });

  test("authorizes against the owner record id, not the auth user id", async () => {
    const ownerMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: "owner-record-1", user_id: "owner-user-1" },
      error: null,
    });
    const ownerOr = vi.fn(() => ({ maybeSingle: ownerMaybeSingle }));
    const ownerSelect = vi.fn(() => ({ or: ownerOr }));

    const membershipMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: "membership-1", owner_id: "owner-record-1" },
      error: null,
    });
    const membershipEq = vi.fn(() => ({ maybeSingle: membershipMaybeSingle }));
    const membershipSelect = vi.fn(() => ({ eq: membershipEq }));

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));

    adminMock = {
      from: vi.fn((table: string) => {
        if (table === "owners") return { select: ownerSelect };
        if (table === "owner_memberships") return { select: membershipSelect, update };
        return { select: vi.fn() };
      }),
    };

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ membershipId: "11111111-1111-1111-1111-111111111111" }),
    });

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      matching_mode: "premium_then_standard",
      allow_standard_rate_fallback: true,
      fallback_remind_at: null,
    });
    expect(updateEq).toHaveBeenCalledWith("id", "11111111-1111-1111-1111-111111111111");
  });
});
