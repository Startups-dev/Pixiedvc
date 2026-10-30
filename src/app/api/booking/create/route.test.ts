import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

const insertBookingMock = vi.fn();
const attachBookingAttributionMock = vi.fn();
let capturedBookingInsert: Record<string, unknown> | null = null;
let queryOps: Array<{ op: string; column: string; value?: unknown }> = [];
let adminClientMock: typeof authClientMock | null = null;
let testSwitchEnabled = true;
let activeSignatureRows: Array<Record<string, unknown>> = [];

let authClientMock: {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
};

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => authClientMock),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: vi.fn(() => adminClientMock),
}));

vi.mock("@/lib/booking-attribution", () => ({
  attachBookingAttribution: (...args: unknown[]) => attachBookingAttributionMock(...args),
}));

function bookingRequest(trip: Record<string, unknown>, testBooking = false) {
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
        gateway: testBooking ? "stripe" : undefined,
      },
      depositAmount: testBooking ? 99 : undefined,
      testBooking,
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
    adminClientMock = null;
    testSwitchEnabled = true;
    activeSignatureRows = [];
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
        if (table === "app_settings") {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { value: { enabled: testSwitchEnabled, auth_user_id: "4de38521-9534-4b81-b54e-81e6b7c58539" } }, error: null }) }) }) };
        }
        if (table === "resorts") {
          return makeSelectMaybeSingle({
            id: "resort-blt",
            slug: "bay-lake-tower",
            calculator_code: "BLT",
          });
        }
        if (table === "booking_requests") {
          return {
            select: vi.fn((columns: string) => makeThenableQuery(
              columns.includes("is_test_booking")
                ? { data: activeSignatureRows, error: null }
                : { data: [], error: null },
            )),
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

  test("allowlisted guest creates a TEST draft with zero paid and no attribution", async () => {
    const allowed = "4de38521-9534-4b81-b54e-81e6b7c58539";
    authClientMock.auth.getUser.mockResolvedValue({ data: { user: { id: allowed } }, error: null });
    adminClientMock = authClientMock;
    const response = await POST(bookingRequest({
      resortId: "BLT", villaType: "STUDIO", viewType: "L",
      checkIn: "2026-09-01", checkOut: "2026-09-03", points: 32, estCash: 704,
    }, true));
    expect(response.status).toBe(200);
    expect(capturedBookingInsert).toEqual(expect.objectContaining({
      status: "draft", is_test_booking: true, deposit_status: "test_pending",
      deposit_due: 99, deposit_paid: 0, accepted_terms: false, accepted_insurance: false,
    }));
    expect(attachBookingAttributionMock).not.toHaveBeenCalled();
  });

  test("other guests cannot create a TEST booking", async () => {
    const response = await POST(bookingRequest({
      resortId: "BLT", villaType: "STUDIO", viewType: "L",
      checkIn: "2026-09-01", checkOut: "2026-09-03", points: 32, estCash: 704,
    }, true));
    expect(response.status).toBe(403);
    expect(insertBookingMock).not.toHaveBeenCalled();
  });

  test("TEST itinerary is rejected before insert when an existing non-TEST draft has the active signature", async () => {
    const allowed = "4de38521-9534-4b81-b54e-81e6b7c58539";
    authClientMock.auth.getUser.mockResolvedValue({ data: { user: { id: allowed } }, error: null });
    adminClientMock = authClientMock;
    activeSignatureRows = [{ id: "existing-real-draft", is_test_booking: false, primary_view: "S", building_preference: "none" }];
    const response = await POST(bookingRequest({
      resortId: "BLT", villaType: "STUDIO", viewType: "L",
      checkIn: "2026-09-01", checkOut: "2026-09-03", points: 32, estCash: 704,
    }, true));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "TEST_ITINERARY_ALREADY_ACTIVE" });
    expect(insertBookingMock).not.toHaveBeenCalled();
  });

  test("the designated guest cannot bypass when the live switch is off", async () => {
    const allowed = "4de38521-9534-4b81-b54e-81e6b7c58539";
    authClientMock.auth.getUser.mockResolvedValue({ data: { user: { id: allowed } }, error: null });
    adminClientMock = authClientMock;
    testSwitchEnabled = false;
    const response = await POST(bookingRequest({
      resortId: "BLT", villaType: "STUDIO", viewType: "L",
      checkIn: "2026-09-01", checkOut: "2026-09-03", points: 32, estCash: 704,
    }, true));
    expect(response.status).toBe(403);
    expect(insertBookingMock).not.toHaveBeenCalled();
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
