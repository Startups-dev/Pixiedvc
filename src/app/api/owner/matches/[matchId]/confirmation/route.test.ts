import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

const ensureRentalForMatchMock = vi.fn();

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

vi.mock("@/lib/rentals/ensureRentalForMatch", () => ({
  ensureRentalForMatch: (...args: unknown[]) => ensureRentalForMatchMock(...args),
}));

vi.mock("@/lib/affiliate-conversions", () => ({
  ensureAffiliateConversionForBooking: vi.fn(),
}));

vi.mock("@/server/contracts", () => ({
  ensureGuestAgreementForBooking: vi.fn(),
}));

describe("POST /api/owner/matches/[matchId]/confirmation", () => {
  beforeEach(() => {
    ensureRentalForMatchMock.mockReset();
    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-user-1" } },
          error: null,
        }),
      },
    };
  });

  test("does not create or update rentals for a match owned by another owner", async () => {
    const ownerMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: "owner-record-1", user_id: "owner-user-1" },
      error: null,
    });
    const ownerOr = vi.fn(() => ({ maybeSingle: ownerMaybeSingle }));
    const ownerSelect = vi.fn(() => ({ or: ownerOr }));

    const matchMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const matchOwnerEq = vi.fn(() => ({ maybeSingle: matchMaybeSingle }));
    const matchIdEq = vi.fn(() => ({ eq: matchOwnerEq }));
    const matchSelect = vi.fn(() => ({ eq: matchIdEq }));

    adminMock = {
      from: vi.fn((table: string) => {
        if (table === "owners") return { select: ownerSelect };
        if (table === "booking_matches") return { select: matchSelect };
        return { select: vi.fn() };
      }),
    };

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationNumber: "ABC123" }),
      }),
      { params: Promise.resolve({ matchId: "match-owned-by-someone-else" }) },
    );

    expect(response.status).toBe(404);
    expect(matchIdEq).toHaveBeenCalledWith("id", "match-owned-by-someone-else");
    expect(matchOwnerEq).toHaveBeenCalledWith("owner_id", "owner-record-1");
    expect(ensureRentalForMatchMock).not.toHaveBeenCalled();
  });
});
