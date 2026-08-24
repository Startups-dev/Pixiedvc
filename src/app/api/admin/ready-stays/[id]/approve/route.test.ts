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

vi.mock("@/lib/ready-stays/owner-submission", () => ({
  buildReadyStayShowcaseDefaults: vi.fn(() => ({
    slug: "ready-stay-default",
    title: "Ready Stay Default",
    short_description: "Ready Stay",
    image_url: "https://example.com/ready-stay.jpg",
    sleeps: 4,
    badge: "Ready to Book",
    cta_label: "View Stay",
    href: "/ready-stays/ready-1",
  })),
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
  return {
    from: vi.fn((table: string) => {
      if (table === "ready_stays") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "ready-1",
                  status: "draft",
                  verification_status: "proof_uploaded",
                  reservation_proof_path: "proof.png",
                  check_in: "2026-10-10",
                  room_type: "Studio",
                  slug: null,
                  title: null,
                  short_description: null,
                  image_url: null,
                  sleeps: null,
                  badge: null,
                  cta_label: null,
                  href: null,
                  resort_id: "resort-1",
                  owner: { owners: [{ lifecycle_status: "active" }] },
                  resorts: { name: "Resort", slug: "resort", calculator_code: "RVA" },
                },
                error: null,
              }),
            })),
          })),
          update: updateReadyStay,
        };
      }
      return {};
    }),
  };
}

describe("POST /api/admin/ready-stays/[id]/approve", () => {
  beforeEach(() => {
    flags.value.enableReadyStaysAdmin = true;
    flags.value.enableReadyStaysAdminPurge = false;
    sessionClient = makeSessionClient();
    adminClient = makeAdminClient();
  });

  test("blocks approval when Ready Stays admin is disabled", async () => {
    flags.value.enableReadyStaysAdmin = false;

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "ready-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Ready Stays admin is disabled by feature flag." });
    expect(updateReadyStay).not.toHaveBeenCalled();
  });

  test("approves when Ready Stays admin is enabled for an admin", async () => {
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "ready-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, id: "ready-1" });
    expect(updateReadyStay).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "active",
        verification_status: "approved",
        placement_resort: true,
        placement_search: true,
      }),
    );
  });
});
