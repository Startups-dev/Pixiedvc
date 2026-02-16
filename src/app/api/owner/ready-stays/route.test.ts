import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

let supabaseMock: {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: vi.fn() })),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => supabaseMock),
}));

vi.mock("@/lib/ready-stays/pricing", () => ({
  getReadyStayPricingBand: vi.fn(() => ({
    seasonType: "normal",
    minOwnerCents: 1900,
    suggestedOwnerCents: 2100,
    maxOwnerCents: 2300,
    guestCapCents: 3000,
    pixieFeeCents: 700,
  })),
}));

describe("POST /api/owner/ready-stays", () => {
  beforeEach(() => {
    const rentalsMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "rental-1",
        owner_user_id: "owner-1",
        resort_id: "resort-1",
        resort_code: "VGF",
        check_in: "2026-07-10",
        check_out: "2026-07-14",
        points_required: 80,
        room_type: "Studio",
        match_id: null,
      },
      error: null,
    });

    const rentalsEq = vi.fn(() => ({ maybeSingle: rentalsMaybeSingle }));
    const rentalsSelect = vi.fn(() => ({ eq: rentalsEq }));

    const milestonesEq = vi.fn().mockResolvedValue({
      data: [{ code: "disney_confirmation_uploaded", status: "completed" }],
      error: null,
    });
    const milestonesSelect = vi.fn(() => ({ eq: milestonesEq }));

    const resortsMaybeSingle = vi.fn().mockResolvedValue({
      data: { calculator_code: "VGF" },
      error: null,
    });
    const resortsEq = vi.fn(() => ({ maybeSingle: resortsMaybeSingle }));
    const resortsSelect = vi.fn(() => ({ eq: resortsEq }));

    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-1" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "rentals") {
          return { select: rentalsSelect };
        }
        if (table === "rental_milestones") {
          return { select: milestonesSelect };
        }
        if (table === "resorts") {
          return { select: resortsSelect };
        }
        if (table === "ready_stays") {
          return {
            insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
          };
        }
        return { select: vi.fn() };
      }),
    };
  });

  test("rejects owner price below global minimum", async () => {
    const request = new Request("http://localhost/api/owner/ready-stays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rental_id: "rental-1",
        owner_price_per_point_cents: 1200,
      }),
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Owner price below minimum. Minimum is $14.00/pt." });
  });
});
