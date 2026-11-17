import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

import { PATCH, POST } from "./route";

const readyStaysInsertMock = vi.fn();

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
    readyStaysInsertMock.mockReset();
    readyStaysInsertMock.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: "ready-1", status: "draft", verification_status: "proof_uploaded" },
          error: null,
        }),
      })),
    });

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
        calculator_room_code: null,
        calculator_view_code: null,
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

    const ownersMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "owner-record-1",
        lifecycle_status: "active",
        founding_owner_bonus_cents_per_point: 200,
        founding_owner_bonus_started_at: "2020-01-01T00:00:00.000Z",
        founding_owner_bonus_expires_at: "2030-01-01T00:00:00.000Z",
      },
      error: null,
    });
    const ownersEq = vi.fn(() => ({ maybeSingle: ownersMaybeSingle }));
    const ownersSelect = vi.fn(() => ({ eq: ownersEq }));

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
        if (table === "owners") {
          return { select: ownersSelect };
        }
        if (table === "ready_stays") {
          return {
            insert: readyStaysInsertMock,
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
    const request = new NextRequest("http://localhost/api/owner/ready-stays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rental_id: "rental-1",
        owner_price_per_point_cents: 1200,
      }),
    });

    const response = await POST(request);
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
            calculator_room_code: null,
            calculator_view_code: null,
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
      if (table === "owners") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "owner-record-1",
                  lifecycle_status: "active",
                  founding_owner_bonus_cents_per_point: 200,
                  founding_owner_bonus_started_at: "2020-01-01T00:00:00.000Z",
                  founding_owner_bonus_expires_at: "2030-01-01T00:00:00.000Z",
                },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "ready_stays") {
        return {
          insert: readyStaysInsertMock,
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        };
      }
      return { select: vi.fn() };
    });

    const request = new NextRequest("http://localhost/api/owner/ready-stays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rental_id: "rental-1",
        owner_price_per_point_cents: 2100,
        founding_bonus_per_point_cents: 9999,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Upload reservation proof before listing this Ready Stay." });
  });

  test("copies exact calculator accommodation identity from rental to Ready Stay", async () => {
    const rentalsMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "rental-1",
        owner_user_id: "owner-1",
        resort_id: "resort-1",
        resort_code: "BLT",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
        points_required: 32,
        room_type: "Deluxe Studio - Lake View",
        calculator_room_code: "STUDIO",
        calculator_view_code: "L",
        match_id: null,
      },
      error: null,
    });
    const rentalsEq = vi.fn(() => ({ maybeSingle: rentalsMaybeSingle }));
    const rentalsSelect = vi.fn(() => ({ eq: rentalsEq }));

    supabaseMock.from = vi.fn((table: string) => {
      if (table === "rentals") {
        return { select: rentalsSelect };
      }
      if (table === "rental_milestones") {
        const milestonesEq = vi.fn().mockResolvedValue({
          data: [{ code: "disney_confirmation_uploaded", status: "completed" }],
          error: null,
        });
        return { select: vi.fn(() => ({ eq: milestonesEq })) };
      }
      if (table === "rental_documents") {
        const proofMaybeSingle = vi.fn().mockResolvedValue({
          data: {
            id: "doc-1",
            storage_path: "owners/owner-1/rental-docs/rental-1/disney_confirmation_email/doc-1.png",
            meta: { original_name: "proof.png" },
          },
          error: null,
        });
        const proofLimit = vi.fn(() => ({ maybeSingle: proofMaybeSingle }));
        const proofOrder = vi.fn(() => ({ limit: proofLimit }));
        const proofTypeEq = vi.fn(() => ({ order: proofOrder }));
        const proofRentalEq = vi.fn(() => ({ eq: proofTypeEq }));
        return { select: vi.fn(() => ({ eq: proofRentalEq })) };
      }
      if (table === "resorts") {
        const resortsMaybeSingle = vi.fn().mockResolvedValue({
          data: { name: "Bay Lake Tower", slug: "bay-lake-tower", calculator_code: "BLT" },
          error: null,
        });
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: resortsMaybeSingle })) })) };
      }
      if (table === "owners") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "owner-record-1",
                  lifecycle_status: "active",
                  founding_owner_bonus_cents_per_point: 200,
                  founding_owner_bonus_started_at: "2020-01-01T00:00:00.000Z",
                  founding_owner_bonus_expires_at: "2030-01-01T00:00:00.000Z",
                },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "ready_stays") {
        return {
          insert: readyStaysInsertMock,
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        };
      }
      return { select: vi.fn() };
    });

    const request = new NextRequest("http://localhost/api/owner/ready-stays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rental_id: "rental-1",
        owner_price_per_point_cents: 2100,
        founding_bonus_per_point_cents: 9999,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, id: "ready-1" });
    expect(readyStaysInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        points: 32,
        room_type: "Deluxe Studio - Lake View",
        calculator_room_code: "STUDIO",
        calculator_view_code: "L",
        owner_price_per_point_cents: 2100,
        guest_price_per_point_cents: 2800,
        founding_bonus_per_point_cents: 200,
      }),
    );
  });

  test("does not assign calculator identity to legacy rentals during publishing", async () => {
    const request = new NextRequest("http://localhost/api/owner/ready-stays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rental_id: "rental-1",
        owner_price_per_point_cents: 2100,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, id: "ready-1" });
    expect(readyStaysInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        calculator_room_code: null,
        calculator_view_code: null,
      }),
    );
  });

  test("rejects malformed calculator identity when publishing a structured rental", async () => {
    const rentalsMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "rental-1",
        owner_user_id: "owner-1",
        resort_id: "resort-1",
        resort_code: "BLT",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
        points_required: 32,
        room_type: "Deluxe Studio - Lake View",
        calculator_room_code: "STUDIO",
        calculator_view_code: null,
        match_id: null,
      },
      error: null,
    });

    supabaseMock.from = vi.fn((table: string) => {
      if (table === "rentals") {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: rentalsMaybeSingle })) })) };
      }
      if (table === "owners") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "owner-record-1", lifecycle_status: "active" },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "resorts") {
        const resortsMaybeSingle = vi.fn().mockResolvedValue({
          data: { name: "Bay Lake Tower", slug: "bay-lake-tower", calculator_code: "BLT" },
          error: null,
        });
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: resortsMaybeSingle })) })) };
      }
      return { select: vi.fn() };
    });

    const request = new NextRequest("http://localhost/api/owner/ready-stays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rental_id: "rental-1",
        owner_price_per_point_cents: 2100,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_accommodation" });
    expect(readyStaysInsertMock).not.toHaveBeenCalled();
  });

  test("rejects new Ready Stay creation for deactivated owners", async () => {
    supabaseMock.from = vi.fn((table: string) => {
      if (table === "owners") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: "owner-record-1", lifecycle_status: "deactivated" },
                error: null,
              }),
            })),
          })),
        };
      }
      return { select: vi.fn() };
    });

    const request = new NextRequest("http://localhost/api/owner/ready-stays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rental_id: "rental-1",
        owner_price_per_point_cents: 2100,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Owner account is not active for new Ready Stay listings." });
    expect(readyStaysInsertMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/owner/ready-stays pricing", () => {
  test("saves the owner base rate and guest fee without folding in the Founders bonus", async () => {
    const update = vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }));
    supabaseMock = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null }) },
      from: vi.fn((table: string) => {
        if (table !== "ready_stays") throw new Error(`unexpected table ${table}`);
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "ready-1", owner_id: "owner-1", check_in: "2027-01-18", check_out: "2027-01-20", status: "draft" },
              error: null,
            }) })),
          })),
          update,
        };
      }),
    };

    const response = await PATCH(new NextRequest("http://localhost/api/owner/ready-stays", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "ready-1", owner_price_per_point_cents: 2300 }),
    }));

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ owner_price_per_point_cents: 2300, guest_price_per_point_cents: 3000 });
    expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ founding_bonus_per_point_cents: expect.anything() }));
  });
});
