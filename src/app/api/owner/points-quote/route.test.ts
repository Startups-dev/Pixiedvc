import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

let calculatorCode = "BCV";

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

function pointsQuoteRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/owner/points-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/owner/points-quote", () => {
  beforeEach(() => {
    calculatorCode = "BCV";

    const resortsMaybeSingle = vi.fn().mockImplementation(async () => ({
      data: { calculator_code: calculatorCode },
      error: null,
    }));
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

  test("returns exact BLT Studio Standard View points", async () => {
    const response = await POST(
      pointsQuoteRequest({
        resort_code: "BLT",
        room_code: "STUDIO",
        view_code: "S",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total_points).toBe(26);
    expect(body.total_nights).toBe(2);
  });

  test("returns exact BLT Studio Lake View points", async () => {
    const response = await POST(
      pointsQuoteRequest({
        resort_code: "BLT",
        room_code: "STUDIO",
        view_code: "L",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total_points).toBe(32);
  });

  test("returns exact BLT Studio Theme Park View points", async () => {
    const response = await POST(
      pointsQuoteRequest({
        resort_code: "BLT",
        room_code: "STUDIO",
        view_code: "T",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total_points).toBe(36);
  });

  test("rejects legacy generic BLT Studio as ambiguous", async () => {
    calculatorCode = "BLT";

    const response = await POST(
      pointsQuoteRequest({
        resort_id: "resort-1",
        room_type: "Studio",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "ambiguous_accommodation" });
  });

  test("keeps legacy generic requests when they resolve to one exact identity", async () => {
    calculatorCode = "BCV";

    const response = await POST(
      pointsQuoteRequest({
        resort_id: "resort-1",
        room_type: "Studio",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.total_points).toBeGreaterThan(0);
    expect(body.total_nights).toBe(2);
  });

  test("rejects invalid exact view code", async () => {
    const response = await POST(
      pointsQuoteRequest({
        resort_code: "BLT",
        room_code: "STUDIO",
        view_code: "SV",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_accommodation" });
  });

  test("rejects invalid exact room code", async () => {
    const response = await POST(
      pointsQuoteRequest({
        resort_code: "BLT",
        room_code: "CABIN",
        view_code: "S",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_accommodation" });
  });

  test("rejects missing exact view code", async () => {
    const response = await POST(
      pointsQuoteRequest({
        resort_code: "BLT",
        room_code: "STUDIO",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_accommodation" });
  });

  test("rejects unsupported exact resort code", async () => {
    const response = await POST(
      pointsQuoteRequest({
        resort_code: "NOPE",
        room_code: "STUDIO",
        view_code: "S",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "unsupported_resort" });
  });

  test("rejects invalid date range", async () => {
    const response = await POST(
      pointsQuoteRequest({
        resort_code: "BLT",
        room_code: "STUDIO",
        view_code: "S",
        check_in: "2026-09-03",
        check_out: "2026-09-01",
      }) as any,
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid_dates" });
  });
});
