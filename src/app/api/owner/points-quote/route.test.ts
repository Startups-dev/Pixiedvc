import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

const calculateStayPointsMock = vi.fn();

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

vi.mock("@/lib/stay/stayCalculator", () => ({
  calculateStayPoints: (...args: unknown[]) => calculateStayPointsMock(...args),
}));

describe("POST /api/owner/points-quote", () => {
  beforeEach(() => {
    calculateStayPointsMock.mockReset();

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
        if (table === "resorts") {
          return { select: resortsSelect };
        }
        return { select: vi.fn() };
      }),
    };
  });

  test("returns total points and nightly breakdown", async () => {
    calculateStayPointsMock.mockReturnValue({
      totalPoints: 84,
      totalNights: 2,
      nights: [
        { night: "2026-12-24", points: 42 },
        { night: "2026-12-25", points: 42 },
      ],
    });

    const request = new Request("http://localhost/api/owner/points-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resort_id: "resort-1",
        room_type: "Studio",
        check_in: "2026-12-24",
        check_out: "2026-12-26",
      }),
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      total_points: 84,
      total_nights: 2,
      nights: [
        { night: "2026-12-24", points: 42 },
        { night: "2026-12-25", points: 42 },
      ],
    });
  });

  test("returns 400 when calculator has no chart data", async () => {
    calculateStayPointsMock.mockImplementation(() => {
      throw new Error("Points charts missing for selected resort.");
    });

    const request = new Request("http://localhost/api/owner/points-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resort_id: "resort-1",
        room_type: "Studio",
        check_in: "2026-12-24",
        check_out: "2026-12-26",
      }),
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Points charts missing for selected resort." });
  });
});
