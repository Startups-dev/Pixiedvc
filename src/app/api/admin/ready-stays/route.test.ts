import { beforeEach, describe, expect, test, vi } from "vitest";

import { DELETE, PATCH } from "./route";

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
let currentReadyStay: { id: string; status: string; verification_status: string | null } | null;

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
  const maybeSingle = vi.fn().mockImplementation(async () => ({ data: currentReadyStay, error: null }));
  const selectEq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: selectEq }));
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
          select,
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
    currentReadyStay = { id: "ready-1", status: "active", verification_status: "approved" };
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

  test("blocks soft remove for sold listings", async () => {
    currentReadyStay = { id: "ready-1", status: "sold", verification_status: "approved" };

    const response = await DELETE(
      new Request("http://localhost", {
        method: "DELETE",
        body: JSON.stringify({ id: "ready-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "This Ready Stay is already historical and cannot be removed again." });
    expect(updateReadyStay).not.toHaveBeenCalled();
    expect(deleteReadyStay).not.toHaveBeenCalled();
  });

  test("blocks pricing edits for rejected audit records", async () => {
    currentReadyStay = { id: "ready-1", status: "removed", verification_status: "rejected" };

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          id: "ready-1",
          owner_price_per_point_cents: 2100,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "This Ready Stay is historical and cannot be edited. View it in history/audit instead.",
    });
    expect(updateReadyStay).not.toHaveBeenCalled();
  });

  test("blocks direct publish before approval workflow", async () => {
    currentReadyStay = { id: "ready-1", status: "draft", verification_status: "proof_uploaded" };

    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({
          id: "ready-1",
          status: "active",
          slug: "ready-1",
          title: "Ready Stay",
          image_url: "https://example.com/ready.jpg",
          sleeps: 4,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "Use the Ready Stay approval action before publishing this listing." });
    expect(updateReadyStay).not.toHaveBeenCalled();
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
