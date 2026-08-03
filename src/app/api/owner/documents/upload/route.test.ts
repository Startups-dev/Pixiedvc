import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

let supabaseMock: {
  auth: { getUser: ReturnType<typeof vi.fn> };
  storage: { from: ReturnType<typeof vi.fn> };
};

let adminMock: {
  from: ReturnType<typeof vi.fn>;
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createRouteHandlerClient: vi.fn(() => supabaseMock),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: vi.fn(() => adminMock),
}));

describe("POST /api/owner/documents/upload", () => {
  beforeEach(() => {
    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-user-1" } },
          error: null,
        }),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: { path: "owner-user-1/file.pdf" }, error: null }),
        })),
      },
    };
  });

  test("inserts owner documents under the resolved owner record id", async () => {
    const ownerMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: "owner-record-1", user_id: "owner-user-1" },
      error: null,
    });
    const ownerOr = vi.fn(() => ({ maybeSingle: ownerMaybeSingle }));
    const ownerSelect = vi.fn(() => ({ or: ownerOr }));
    const insert = vi.fn().mockResolvedValue({ error: null });

    adminMock = {
      from: vi.fn((table: string) => {
        if (table === "owners") return { select: ownerSelect };
        if (table === "owner_documents") return { insert };
        return { select: vi.fn() };
      }),
    };

    const file = new File(["test"], "membership card.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "arrayBuffer", {
      value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]).buffer),
    });
    const formData = {
      get: vi.fn((key: string) => {
        if (key === "kind") return "membership_card";
        if (key === "file") return file;
        return null;
      }),
    };

    const response = await POST({ formData: vi.fn().mockResolvedValue(formData) } as unknown as Request);

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "owner-record-1",
        kind: "membership_card",
      }),
    );
  });

  test("rejects unsupported document types before upload", async () => {
    adminMock = {
      from: vi.fn(),
    };
    const file = new File(["test"], "script.txt", { type: "text/plain" });
    const formData = {
      get: vi.fn((key: string) => {
        if (key === "kind") return "membership_card";
        if (key === "file") return file;
        return null;
      }),
    };

    const response = await POST({ formData: vi.fn().mockResolvedValue(formData) } as unknown as Request);

    expect(response.status).toBe(400);
    expect(supabaseMock.storage.from).not.toHaveBeenCalled();
  });
});
