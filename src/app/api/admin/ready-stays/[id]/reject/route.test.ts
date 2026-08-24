import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

const flags = vi.hoisted(() => ({
  value: {
    enableReadyStaysAdmin: true,
    enableReadyStaysAdminPurge: false,
  },
}));

let sessionClient: any;
let adminClient: any;
let updateReadyStay: ReturnType<typeof vi.fn>;
let sendReadyStayRejectedEmail: ReturnType<typeof vi.fn>;

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

vi.mock("@/lib/email", () => ({
  sendReadyStayRejectedEmail: (...args: unknown[]) => sendReadyStayRejectedEmail(...args),
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

function selectMaybeSingle(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const limit = vi.fn(() => ({ maybeSingle }));
  const or = vi.fn(() => ({ limit, maybeSingle }));
  const select = vi.fn(() => ({ eq, or, maybeSingle }));
  return { select };
}

function makeAdminClient() {
  updateReadyStay = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  return {
    from: vi.fn((table: string) => {
      if (table === "ready_stays") {
        return {
          ...selectMaybeSingle({
            id: "ready-1",
            owner_id: "owner-user-1",
            check_in: "2026-10-10",
            check_out: "2026-10-15",
            room_type: "Studio",
            resorts: { name: "Resort" },
          }),
          update: updateReadyStay,
        };
      }
      if (table === "owners") {
        return selectMaybeSingle({ email: "owner@example.com", display_name: "Owner" });
      }
      if (table === "profiles") {
        return selectMaybeSingle({ email: "owner@example.com", display_name: "Owner" });
      }
      return {};
    }),
  };
}

describe("POST /api/admin/ready-stays/[id]/reject", () => {
  beforeEach(() => {
    flags.value.enableReadyStaysAdmin = true;
    flags.value.enableReadyStaysAdminPurge = false;
    sessionClient = makeSessionClient();
    adminClient = makeAdminClient();
    sendReadyStayRejectedEmail = vi.fn().mockResolvedValue(undefined);
  });

  test("blocks rejection when Ready Stays admin is disabled", async () => {
    flags.value.enableReadyStaysAdmin = false;

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ reason: "Needs corrected proof." }),
      }),
      { params: Promise.resolve({ id: "ready-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Ready Stays admin is disabled by feature flag." });
    expect(updateReadyStay).not.toHaveBeenCalled();
    expect(sendReadyStayRejectedEmail).not.toHaveBeenCalled();
  });

  test("rejects when Ready Stays admin is enabled for an admin", async () => {
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ reason: "Needs corrected proof." }),
      }),
      { params: Promise.resolve({ id: "ready-1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, id: "ready-1" });
    expect(updateReadyStay).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "draft",
        verification_status: "rejected",
        verification_review_notes: "Needs corrected proof.",
      }),
    );
    expect(sendReadyStayRejectedEmail).toHaveBeenCalled();
  });
});
