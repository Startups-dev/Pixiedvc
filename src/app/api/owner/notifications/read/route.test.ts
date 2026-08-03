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

describe("POST /api/owner/notifications/read", () => {
  beforeEach(() => {
    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-user-1" } },
          error: null,
        }),
      },
      from: vi.fn(),
    };
  });

  test("marks only authenticated owner notifications as read", async () => {
    const inMock = vi.fn().mockResolvedValue({ error: null });
    const eqMock = vi.fn(() => ({ in: inMock }));
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    supabaseMock.from = vi.fn(() => ({ update: updateMock }));

    const response = await POST(
      new Request("http://localhost/api/owner/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["note-a", "note-b"] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(supabaseMock.from).toHaveBeenCalledWith("notifications");
    expect(eqMock).toHaveBeenCalledWith("user_id", "owner-user-1");
    expect(inMock).toHaveBeenCalledWith("id", ["note-a", "note-b"]);
  });
});
