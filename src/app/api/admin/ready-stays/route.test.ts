import { beforeEach, describe, expect, test, vi } from "vitest";

import { DELETE } from "./route";

const flags = vi.hoisted(() => ({
  value: {
    enableReadyStaysAdmin: true,
    enableReadyStaysAdminPurge: false,
  },
}));

let sessionClient: any;
let adminClient: any;
let updateReadyStay: ReturnType<typeof vi.fn>;
let deleteReadyStay: ReturnType<typeof vi.fn>;

vi.mock("@/lib/ready-stays/showcase-config", () => ({
  READY_STAYS_SHOWCASE_FLAGS: flags.value,
}));

vi.mock("@/lib/admin", () => ({
  isUserAdmin: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => sessionClient),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: vi.fn(() => adminClient),
}));

function makeSessionClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-1", email: "admin@example.com", app_metadata: { role: "admin" } } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
        })),
      })),
    })),
  };
}

function makeAdminClient() {
  updateReadyStay = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  deleteReadyStay = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  return {
    from: vi.fn((table: string) => {
      if (table === "ready_stays") {
        return {
          update: updateReadyStay,
          delete: deleteReadyStay,
        };
      }
      return {};
    }),
  };
}

describe("DELETE /api/admin/ready-stays", () => {
  beforeEach(() => {
    flags.value.enableReadyStaysAdmin = true;
    flags.value.enableReadyStaysAdminPurge = false;
    sessionClient = makeSessionClient();
    adminClient = makeAdminClient();
  });

  test("blocks physical purge by default", async () => {
    const response = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ id: "ready-1", purge: true }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Ready Stays physical purge is disabled by feature flag." });
    expect(deleteReadyStay).not.toHaveBeenCalled();
    expect(updateReadyStay).not.toHaveBeenCalled();
  });

  test("soft remove still works when purge is disabled", async () => {
    const response = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ id: "ready-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(updateReadyStay).toHaveBeenCalledWith({
      status: "removed",
      placement_home: false,
      placement_resort: false,
      placement_search: false,
    });
    expect(deleteReadyStay).not.toHaveBeenCalled();
  });

  test("allows physical purge only behind explicit purge flag", async () => {
    flags.value.enableReadyStaysAdminPurge = true;

    const response = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ id: "ready-1", purge: true }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(deleteReadyStay).toHaveBeenCalled();
    expect(updateReadyStay).not.toHaveBeenCalled();
  });
});
