import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";
import { getDvcAccommodationOptions } from "../../../../../packages/pixiedvc-calculator/src/engine/accommodations";
import { Resorts } from "../../../../../packages/pixiedvc-calculator/src/engine/charts";

const accommodationOptions = Resorts.flatMap((resort) => getDvcAccommodationOptions(resort.code));

const insertBookingMock = vi.fn();
const attachBookingAttributionMock = vi.fn();
let capturedBookingInsert: Record<string, unknown> | null = null;
let queryOps: Array<{ op: string; column: string; value?: unknown }> = [];
let adminClientMock: typeof authClientMock | null = null;
let testSwitchEnabled = true;
let activeSignatureRows: Array<Record<string, unknown>> = [];
let existingBookingRows: Array<Record<string, unknown>> = [];
let selectedResort = { id: "resort-blt", slug: "bay-lake-tower", calculator_code: "BLT" };

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
    in: vi.fn((column: string, value: unknown) => {
      queryOps.push({ op: "in", column, value });
      return query;
    }),
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
    existingBookingRows = [];
    selectedResort = { id: "resort-blt", slug: "bay-lake-tower", calculator_code: "BLT" };
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
          return makeSelectMaybeSingle(selectedResort);
        }
        if (table === "booking_requests") {
          return {
            select: vi.fn((columns: string) => makeThenableQuery(
              columns.includes("is_test_booking")
                ? { data: activeSignatureRows, error: null }
                : { data: existingBookingRows, error: null },
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
    expect(queryOps).toContainEqual({ op: "in", column: "primary_view", value: ["L", "Lake View"] });
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

  test("canonical input cannot bypass an existing regular label-based draft", async () => {
    authClientMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "4de38521-9534-4b81-b54e-81e6b7c58539" } }, error: null,
    });
    adminClientMock = authClientMock;
    activeSignatureRows = [{
      id: "legacy-real", is_test_booking: false, primary_room: "Deluxe Studio",
      primary_view: "Lake View", building_preference: "none",
    }];
    const response = await POST(bookingRequest({
      resortId: "BLT", villaType: "STUDIO", viewType: "L",
      checkIn: "2026-12-10", checkOut: "2026-12-17", points: 100, estCash: 2400,
    }, true));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "TEST_ITINERARY_ALREADY_ACTIVE" });
    expect(queryOps).toContainEqual({ op: "in", column: "primary_room", value: ["STUDIO", "Deluxe Studio"] });
    expect(insertBookingMock).not.toHaveBeenCalled();
  });

  test("checks every matching draft when canonical and legacy rows coexist", async () => {
    authClientMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "4de38521-9534-4b81-b54e-81e6b7c58539" } }, error: null,
    });
    adminClientMock = authClientMock;
    activeSignatureRows = [
      { id: "test", is_test_booking: true, primary_room: "STUDIO", primary_view: "L", building_preference: "none" },
      { id: "real", is_test_booking: false, primary_room: "Deluxe Studio", primary_view: "Lake View", building_preference: "none" },
    ];
    const response = await POST(bookingRequest({
      resortId: "BLT", villaType: "STUDIO", viewType: "L",
      checkIn: "2026-12-10", checkOut: "2026-12-17", points: 100, estCash: 2400,
    }, true));

    expect(response.status).toBe(409);
    expect(insertBookingMock).not.toHaveBeenCalled();
  });

  test("does not guess which PVB room an ambiguous legacy draft represents", async () => {
    selectedResort = { id: "resort-pvb", slug: "polynesian-villas", calculator_code: "PVB" };
    authClientMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "4de38521-9534-4b81-b54e-81e6b7c58539" } }, error: null,
    });
    adminClientMock = authClientMock;
    activeSignatureRows = [{
      id: "ambiguous-legacy", is_test_booking: true, primary_room: "Deluxe Studio",
      primary_view: "Resort View", building_preference: "none",
    }];
    const response = await POST(bookingRequest({
      resortId: "PVB", villaType: "STUDIO", viewType: "R",
      checkIn: "2026-12-10", checkOut: "2026-12-17", points: 100, estCash: 2400,
    }, true));

    expect(response.status).toBe(409);
    expect(insertBookingMock).not.toHaveBeenCalled();
  });

  test.each([false, true])("reuses an unambiguous legacy draft without converting it (test=%s)", async (testBooking) => {
    if (testBooking) {
      authClientMock.auth.getUser.mockResolvedValue({
        data: { user: { id: "4de38521-9534-4b81-b54e-81e6b7c58539" } }, error: null,
      });
      adminClientMock = authClientMock;
      activeSignatureRows = [{
        id: "legacy", is_test_booking: true, primary_room: "Deluxe Studio",
        primary_view: "Lake View", building_preference: "none",
      }];
    }
    existingBookingRows = [{ id: "legacy", status: "draft" }];
    const response = await POST(bookingRequest({
      resortId: "BLT", villaType: "STUDIO", viewType: "L",
      checkIn: "2026-12-10", checkOut: "2026-12-17", points: 100, estCash: 2400,
    }, testBooking));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ bookingId: "legacy" });
    expect(queryOps).toContainEqual({ op: "eq", column: "is_test_booking", value: testBooking });
    expect(queryOps).toContainEqual({ op: "in", column: "primary_view", value: ["L", "Lake View"] });
    expect(insertBookingMock).not.toHaveBeenCalled();
    if (testBooking) expect(attachBookingAttributionMock).not.toHaveBeenCalled();
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
      expect.objectContaining({ "trip.viewType": expect.stringContaining("not a valid combination") }),
    );
    expect(body.error).toBe(body.fieldErrors["trip.viewType"]);
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
      expect.objectContaining({ "trip.viewType": expect.stringContaining("more than one category") }),
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

  test("resolves Riviera Grand Villa / Preferred View labels for the designated test guest", async () => {
    selectedResort = { id: "resort-rva", slug: "riviera-resort", calculator_code: "RVA" };
    authClientMock.auth.getUser.mockResolvedValue({
      data: { user: { id: "4de38521-9534-4b81-b54e-81e6b7c58539" } }, error: null,
    });
    adminClientMock = authClientMock;
    const response = await POST(bookingRequest({
      resortId: "RVA", villaType: "Grand Villa", viewType: "Preferred View",
      checkIn: "2026-12-10", checkOut: "2026-12-24", points: 1700, estCash: 40800,
    }, true));

    expect(response.status).toBe(200);
    expect(capturedBookingInsert).toEqual(expect.objectContaining({
      primary_room: "GRANDVILLA", primary_view: "P", is_test_booking: true,
      status: "draft", deposit_status: "test_pending", deposit_due: 99, deposit_paid: 0,
      accepted_terms: false, accepted_insurance: false, guest_agreement_accepted_at: null,
    }));
    expect(attachBookingAttributionMock).not.toHaveBeenCalled();
  });

  test.each(accommodationOptions)("preserves canonical $resortCode/$roomCode/$viewCode", async (option) => {
    selectedResort = { id: `resort-${option.resortCode}`, slug: "", calculator_code: option.resortCode };
    const response = await POST(bookingRequest({
      resortId: option.resortCode, villaType: option.roomCode, viewType: option.viewCode,
      checkIn: "2026-12-10", checkOut: "2026-12-17", points: 100, estCash: 2400,
    }));

    expect(response.status).toBe(200);
    expect(capturedBookingInsert).toEqual(expect.objectContaining({
      primary_room: option.roomCode, primary_view: option.viewCode, is_test_booking: false,
    }));
  });

  test.each(accommodationOptions)("resolves or explicitly rejects ambiguous labels for $resortCode/$roomCode/$viewCode", async (option) => {
    selectedResort = { id: `resort-${option.resortCode}`, slug: "", calculator_code: option.resortCode };
    const sameLabels = getDvcAccommodationOptions(option.resortCode).filter((candidate) =>
      candidate.roomLabel === option.roomLabel && candidate.categoryLabel === option.categoryLabel);
    const response = await POST(bookingRequest({
      resortId: option.resortCode, villaType: option.roomLabel, viewType: option.categoryLabel,
      checkIn: "2026-12-10", checkOut: "2026-12-17", points: 100, estCash: 2400,
    }));

    if (sameLabels.length > 1) {
      expect(response.status).toBe(422);
      expect((await response.json()).fieldErrors["trip.viewType"]).toContain("more than one category");
      expect(insertBookingMock).not.toHaveBeenCalled();
    } else {
      expect(response.status).toBe(200);
      expect(capturedBookingInsert).toEqual(expect.objectContaining({
        primary_room: option.roomCode, primary_view: option.viewCode,
      }));
    }
  });

  test.each([
    ["Deluxe Studio", "Savanna View"],
    ["Unknown room", "Unknown view"],
    ["CABIN", "S"],
  ])("rejects unsupported BLT selection %s / %s before inserting", async (villaType, viewType) => {
    const response = await POST(bookingRequest({
      resortId: "BLT", villaType, viewType,
      checkIn: "2026-12-10", checkOut: "2026-12-17", points: 100, estCash: 2400,
    }));

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("not a valid combination");
    expect(body.error).toBe(body.fieldErrors["trip.viewType"]);
    expect(insertBookingMock).not.toHaveBeenCalled();
  });
});
