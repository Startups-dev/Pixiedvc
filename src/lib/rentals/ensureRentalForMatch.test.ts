import { beforeEach, describe, expect, test, vi } from "vitest";

import { ensureRentalForMatch } from "./ensureRentalForMatch";

let insertedRentalPayload: Record<string, unknown> | null = null;

function makeSelectMaybeSingle(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select };
}

function makeUpdateQuery() {
  const eq = vi.fn().mockResolvedValue({ error: null });
  return { eq };
}

function makeRentalsQuery() {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
    insert: vi.fn((payload: Record<string, unknown>) => {
      insertedRentalPayload = payload;
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "rental-1",
              check_in: payload.check_in,
              owner_user_id: payload.owner_user_id,
              rental_amount_cents: payload.rental_amount_cents,
            },
            error: null,
          }),
        })),
      };
    }),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  };
}

function makeAdminClient(bookingOverride: Record<string, unknown> = {}) {
  const booking = {
    id: "booking-1",
    renter_id: "guest-user-1",
    check_in: "2026-09-01",
    check_out: "2026-09-03",
    nights: 2,
    primary_resort_id: "resort-blt",
    primary_room: "STUDIO",
    primary_view: "L",
    total_points: 32,
    max_price_per_point: 22,
    est_cash: 704,
    guest_total_cents: null,
    guest_total_cents_original: null,
    guest_total_cents_final: null,
    guest_rate_per_point_cents: null,
    adults: 2,
    youths: 0,
    requires_accessibility: false,
    comments: null,
    lead_guest_name: "Fernanda Reis",
    lead_guest_email: "guest@example.com",
    lead_guest_phone: "555-0100",
    address_line1: "1 Main St",
    address_line2: null,
    city: "Orlando",
    state: "FL",
    postal_code: "32830",
    country: "US",
    deposit_due: 99,
    deposit_paid: 99,
    deposit_currency: "USD",
    guest_profile_complete_at: "2026-01-01T00:00:00.000Z",
    guest_agreement_accepted_at: "2026-01-01T00:00:00.000Z",
    primary_resort: {
      slug: "bay-lake-tower",
      calculator_code: "BLT",
      name: "Bay Lake Tower",
    },
    ...bookingOverride,
  };

  const rentalsQuery = makeRentalsQuery();

  return {
    from: vi.fn((table: string) => {
      if (table === "booking_matches") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "match-1",
                  booking_id: "booking-1",
                  owner_id: "owner-1",
                  owner_membership_id: null,
                  owner_base_rate_per_point_cents: null,
                  owner_premium_per_point_cents: null,
                  owner_rate_per_point_cents: null,
                  owner_total_cents: null,
                  owner_home_resort_premium_applied: null,
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => makeUpdateQuery()),
        };
      }
      if (table === "booking_requests") {
        return makeSelectMaybeSingle(booking);
      }
      if (table === "owners") {
        return makeSelectMaybeSingle({
          id: "owner-1",
          user_id: "owner-user-1",
          founding_owner_bonus_cents_per_point: null,
          founding_owner_bonus_started_at: null,
          founding_owner_bonus_expires_at: null,
          founding_owner_granted_at: null,
          founding_owner_promotion_id: null,
        });
      }
      if (table === "profiles") {
        return makeSelectMaybeSingle({ id: "owner-user-1", owner_rewards_enrolled_at: null });
      }
      if (table === "rentals") {
        return rentalsQuery;
      }
      if (table === "rental_milestones") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })) })),
        update: vi.fn(() => makeUpdateQuery()),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  };
}

describe("ensureRentalForMatch accommodation identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRentalPayload = null;
  });

  test("copies exact BLT STUDIO/L booking identity into matched rental and booking package", async () => {
    const adminClient = makeAdminClient();

    const result = await ensureRentalForMatch({
      adminClient: adminClient as any,
      matchId: "match-1",
    });

    expect(result.rentalId).toBe("rental-1");
    expect(insertedRentalPayload).toEqual(
      expect.objectContaining({
        room_type: "STUDIO",
        calculator_room_code: "STUDIO",
        calculator_view_code: "L",
        points_required: 32,
      }),
    );
    expect(insertedRentalPayload?.booking_package).toEqual(
      expect.objectContaining({
        room_type: "STUDIO",
        room_view: "L",
        calculator_room_code: "STUDIO",
        calculator_view_code: "L",
      }),
    );
  });

  test("does not invent exact calculator identity for legacy booking without a view", async () => {
    const adminClient = makeAdminClient({
      primary_room: "Studio",
      primary_view: null,
      total_points: 26,
    });

    await ensureRentalForMatch({
      adminClient: adminClient as any,
      matchId: "match-1",
    });

    expect(insertedRentalPayload).toEqual(
      expect.objectContaining({
        room_type: "Studio",
        calculator_room_code: null,
        calculator_view_code: null,
      }),
    );
  });

  test("rejects invalid exact booking identity before creating a matched rental", async () => {
    const adminClient = makeAdminClient({ primary_view: "SV" });

    await expect(
      ensureRentalForMatch({
        adminClient: adminClient as any,
        matchId: "match-1",
      }),
    ).rejects.toThrow("invalid_accommodation_identity");
    expect(insertedRentalPayload).toBeNull();
  });
});
