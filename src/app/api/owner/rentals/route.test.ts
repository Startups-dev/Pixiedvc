import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

const insertMock = vi.fn();

let supabaseMock: {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
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

function rentalRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/owner/rentals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeSelectSingle(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select };
}

describe("POST /api/owner/rentals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: { id: "rental-1" }, error: null }),
      })),
    });

    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-user-1" } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "owners") {
          return makeSelectSingle({ id: "owner-profile-1" });
        }
        if (table === "resorts") {
          return makeSelectSingle({ id: "resort-1", slug: "bay-lake-tower", calculator_code: "BLT" });
        }
        return { select: vi.fn() };
      }),
    };

    adminMock = {
      from: vi.fn((table: string) => {
        if (table === "rentals") {
          return { insert: insertMock };
        }
        return { insert: vi.fn() };
      }),
    };
  });

  test("stores valid exact BLT accommodation identity", async () => {
    const response = await POST(
      rentalRequest({
        resort_id: "resort-1",
        room_type: "Deluxe Studio - Lake View",
        calculator_room_code: "STUDIO",
        calculator_view_code: "L",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
        points: 32,
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ rentalId: "rental-1" });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resort_code: "BLT",
        room_type: "Deluxe Studio - Lake View",
        calculator_room_code: "STUDIO",
        calculator_view_code: "L",
        points_required: 32,
      }),
    );
  });

  test("rejects invalid room/view identity", async () => {
    const response = await POST(
      rentalRequest({
        resort_id: "resort-1",
        room_type: "Deluxe Studio - Savanna View",
        calculator_room_code: "STUDIO",
        calculator_view_code: "SV",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
        points: 32,
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_accommodation" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("rejects missing one half of calculator identity", async () => {
    const response = await POST(
      rentalRequest({
        resort_id: "resort-1",
        room_type: "Deluxe Studio - Lake View",
        calculator_room_code: "STUDIO",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
        points: 32,
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_accommodation" });
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("preserves legacy caller compatibility without assigning category", async () => {
    const response = await POST(
      rentalRequest({
        resort_id: "resort-1",
        room_type: "Studio",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
        points: 26,
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ rentalId: "rental-1" });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        room_type: "Studio",
        calculator_room_code: null,
        calculator_view_code: null,
      }),
    );
  });
});
