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

    const proofMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: "doc-1", storage_path: "owners/owner-1/rental-docs/rental-1/disney_confirmation_email/doc-1.png", meta: { original_name: "proof.png" } },
      error: null,
    });
    const proofLimit = vi.fn(() => ({ maybeSingle: proofMaybeSingle }));
    const proofOrder = vi.fn(() => ({ limit: proofLimit }));
    const proofTypeEq = vi.fn(() => ({ order: proofOrder }));
    const proofRentalEq = vi.fn(() => ({ eq: proofTypeEq }));
    const proofSelect = vi.fn(() => ({ eq: proofRentalEq }));

    const resortsMaybeSingle = vi.fn().mockResolvedValue({
      data: { name: "Disney's Grand Floridian Villas", slug: "grand-floridian-villas", calculator_code: "VGF" },
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
        if (table === "rental_documents") {
          return { select: proofSelect };
        }
        if (table === "resorts") {
          return { select: resortsSelect };
        }
        if (table === "ready_stays") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "ready-1", status: "draft", verification_status: "proof_uploaded" },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            })),
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

    const response = await POST(request as Request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Owner price below minimum. Minimum is $14.00/pt." });
  });

  test("requires reservation proof before listing", async () => {
    const proofMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const proofLimit = vi.fn(() => ({ maybeSingle: proofMaybeSingle }));
    const proofOrder = vi.fn(() => ({ limit: proofLimit }));
    const proofTypeEq = vi.fn(() => ({ order: proofOrder }));
    const proofRentalEq = vi.fn(() => ({ eq: proofTypeEq }));
    const proofSelect = vi.fn(() => ({ eq: proofRentalEq }));

    supabaseMock.from = vi.fn((table: string) => {
      if (table === "rentals") {
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
        return { select: vi.fn(() => ({ eq: rentalsEq })) };
      }
      if (table === "rental_milestones") {
        const milestonesEq = vi.fn().mockResolvedValue({
          data: [{ code: "disney_confirmation_uploaded", status: "completed" }],
          error: null,
        });
        return { select: vi.fn(() => ({ eq: milestonesEq })) };
      }
      if (table === "rental_documents") {
        return { select: proofSelect };
      }
      if (table === "resorts") {
        const resortsMaybeSingle = vi.fn().mockResolvedValue({
          data: { name: "Disney's Grand Floridian Villas", slug: "grand-floridian-villas", calculator_code: "VGF" },
          error: null,
        });
        const resortsEq = vi.fn(() => ({ maybeSingle: resortsMaybeSingle }));
        return { select: vi.fn(() => ({ eq: resortsEq })) };
      }
      if (table === "ready_stays") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: "ready-1", status: "draft", verification_status: "proof_uploaded" },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        };
      }
      return { select: vi.fn() };
    });

    const request = new Request("http://localhost/api/owner/ready-stays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rental_id: "rental-1",
        owner_price_per_point_cents: 2100,
      }),
    });

    const response = await POST(request as Request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Upload reservation proof before listing this Ready Stay." });
  });
});
