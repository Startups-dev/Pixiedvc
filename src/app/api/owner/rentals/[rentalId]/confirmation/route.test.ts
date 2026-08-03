import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

let authClientMock: {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

let adminClientMock: {
  from: ReturnType<typeof vi.fn>;
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn() })),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => authClientMock),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: vi.fn(() => adminClientMock),
}));

vi.mock("@/lib/affiliate-conversions", () => ({
  ensureAffiliateConversionForBooking: vi.fn(),
}));

vi.mock("@/server/contracts", () => ({
  ensureGuestAgreementForBooking: vi.fn(),
}));

describe("POST /api/owner/rentals/[rentalId]/confirmation", () => {
  beforeEach(() => {
    authClientMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-user-1" } },
          error: null,
        }),
      },
      from: vi.fn(),
    };
    adminClientMock = {
      from: vi.fn(),
    };
  });

  test("rejects cross-owner rental document storage paths before mutating rental state", async () => {
    const rentalMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "rental-1",
        owner_user_id: "owner-user-1",
        owner_id: "owner-record-1",
        rental_amount_cents: 100000,
        booking_request_id: null,
        dvc_confirmation_number: null,
      },
      error: null,
    });
    const rentalEq = vi.fn(() => ({ maybeSingle: rentalMaybeSingle }));
    const rentalSelect = vi.fn(() => ({ eq: rentalEq }));
    authClientMock.from = vi.fn((table: string) => {
      if (table === "rentals") return { select: rentalSelect };
      return { select: vi.fn() };
    });

    const response = await POST(
      new Request("http://localhost/api/owner/rentals/rental-1/confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation_number: "ABC123",
          storage_path: "owners/owner-user-2/rental-docs/rental-1/disney_confirmation_email/file.pdf",
          original_name: "confirmation.pdf",
          type: "disney_confirmation_email",
        }),
      }),
      { params: Promise.resolve({ rentalId: "rental-1" }) },
    );

    expect(response.status).toBe(403);
    expect(adminClientMock.from).not.toHaveBeenCalled();
  });
});
