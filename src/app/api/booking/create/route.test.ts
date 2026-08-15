import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

const insertBookingMock = vi.fn();
const attachBookingAttributionMock = vi.fn();
let capturedBookingInsert: Record<string, unknown> | null = null;
let queryOps: Array<{ op: string; column: string; value?: unknown }> = [];

let authClientMock: {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => authClientMock),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: vi.fn(() => null),
}));

vi.mock("@/lib/booking-attribution", () => ({
  attachBookingAttribution: (...args: unknown[]) => attachBookingAttributionMock(...args),
}));

function bookingRequest(trip: Record<string, unknown>) {
  return new Request("http://localhost/api/booking/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trip,
      guest: {
        leadFirstName: "Fernanda",
        leadLastName: "Reis",
        email: "guest@example.com",
        phone: "555-0100",
        address: "1 Main St",
        city: "Orlando",
        region: "FL",
        postalCode: "32830",
        country: "US",
        adults: 2,
        youths: 0,
      },
      agreement: {
        acceptTerms: true,
        authorizeDeposit: true,
        signedName: "Fernanda Reis",
      },
    }),
  });
}

function makeThenableQuery(resolveValue: unknown = { data: [], error: null }) {
  const query: Record<string, unknown> = {};
  const chain = () => query;
  Object.assign(query, {
    eq: vi.fn((column: string, value: unknown) => {
      queryOps.push({ op: "eq", column, value });
      return query;
    }),
    is: vi.fn((column: string, value: unknown) => {
      queryOps.push({ op: "is", column, value });
      return query;
    }),
    in: vi.fn(chain),
    order: vi.fn(chain),
    limit: vi.fn(chain),
    then: (resolve: (value: unknown) => void) => Promise.resolve(resolve(resolveValue)),
  });
  return query;
}

function makeSelectMaybeSingle(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const or = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq, or }));
  return { select };
}

describe("POST /api/booking/create DVC accommodation identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedBookingInsert = null;
    queryOps = [];
    insertBookingMock.mockImplementation((payload: Record<string, unknown>) => {
      capturedBookingInsert = payload;
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: "booking-1" }, error: null }),
        })),
      };
    });

    authClientMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "guest-user-1" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "resorts") {
          return makeSelectMaybeSingle({
            id: "resort-blt",
            slug: "bay-lake-tower",
            calculator_code: "BLT",
          });
        }
        if (table === "booking_requests") {
          return {
            select: vi.fn(() => makeThenableQuery()),
            insert: insertBookingMock,
          };
        }
        if (table === "booking_request_guests") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return { select: vi.fn(), insert: vi.fn() };
      }),
    };
  });

  test("persists exact BLT STUDIO/L as primary room and view", async () => {
    const response = await POST(
      bookingRequest({
        resortId: "BLT",
        villaType: "STUDIO",
        viewType: "L",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
        points: 32,
        estCash: 704,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ bookingId: "booking-1" });
    expect(capturedBookingInsert).toEqual(
      expect.objectContaining({
        primary_room: "STUDIO",
        primary_view: "L",
        total_points: 32,
      }),
    );
    expect(queryOps).toContainEqual({ op: "eq", column: "primary_view", value: "L" });
  });

  test("rejects invalid exact room/view combination", async () => {
    const response = await POST(
      bookingRequest({
        resortId: "BLT",
        villaType: "STUDIO",
        viewType: "SV",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
        points: 32,
        estCash: 704,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.fieldErrors).toEqual(
      expect.objectContaining({ "trip.viewType": "Select a valid room category." }),
    );
    expect(insertBookingMock).not.toHaveBeenCalled();
  });

  test("rejects ambiguous generic BLT Studio without assigning Standard View", async () => {
    const response = await POST(
      bookingRequest({
        resortId: "BLT",
        villaType: "Studio",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
        points: 26,
        estCash: 572,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.fieldErrors).toEqual(
      expect.objectContaining({ "trip.viewType": "Select a room category." }),
    );
    expect(insertBookingMock).not.toHaveBeenCalled();
  });

  test("resolves a single-category calculator room without requiring a redundant view", async () => {
    authClientMock.from = vi.fn((table: string) => {
      if (table === "resorts") {
        return makeSelectMaybeSingle({
          id: "resort-bcv",
          slug: "beach-club-villas",
          calculator_code: "BCV",
        });
      }
      if (table === "booking_requests") {
        return {
          select: vi.fn(() => makeThenableQuery()),
          insert: insertBookingMock,
        };
      }
      if (table === "booking_request_guests") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return { select: vi.fn(), insert: vi.fn() };
    });

    const response = await POST(
      bookingRequest({
        resortId: "BCV",
        villaType: "STUDIO",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
        points: 32,
        estCash: 704,
      }),
    );

    expect(response.status).toBe(200);
    expect(capturedBookingInsert).toEqual(
      expect.objectContaining({
        primary_room: "STUDIO",
        primary_view: "S",
      }),
    );
  });
});
