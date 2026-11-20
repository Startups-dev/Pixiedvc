import { beforeEach, describe, expect, test, vi } from "vitest";

const createSupabaseServerClient = vi.fn();
const getSupabaseAdminClient = vi.fn();
const maybeGrantFoundingOwnerBonus = vi.fn();

let ownerUpdatePayload: Record<string, unknown> | null;
let profileUpsertPayload: Record<string, unknown> | null;
let authUpdatePayload: Record<string, unknown> | null;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: () => createSupabaseServerClient(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => getSupabaseAdminClient(),
}));

vi.mock("@/lib/founding-owner-bonus", () => ({
  maybeGrantFoundingOwnerBonus: (...args: unknown[]) => maybeGrantFoundingOwnerBonus(...args),
}));

import { POST } from "@/app/api/owner/agreement/accept/route";

function makeAdminClient() {
  const owner = { id: "owner-1", user_id: "owner-1", metadata: null };

  return {
    from: (table: string) => {
      if (table === "owners") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: owner, error: null }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: async () => {
              ownerUpdatePayload = payload;
              return { error: null };
            },
          }),
        };
      }

      if (table === "profiles") {
        return {
          upsert: async (payload: Record<string, unknown>) => {
            profileUpsertPayload = payload;
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe("POST /api/owner/agreement/accept", () => {
  beforeEach(() => {
    ownerUpdatePayload = null;
    profileUpsertPayload = null;
    authUpdatePayload = null;
    createSupabaseServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-1", email: "owner@example.com", user_metadata: {} } },
        }),
        updateUser: vi.fn().mockImplementation(async (payload) => {
          authUpdatePayload = payload;
          return { data: { user: null }, error: null };
        }),
      },
    });
    getSupabaseAdminClient.mockReturnValue(makeAdminClient());
    maybeGrantFoundingOwnerBonus.mockReset().mockResolvedValue({ granted: true, error: null });
  });

  test("accepting agreement also marks owner onboarding complete for route guards", async () => {
    const request = new Request("http://localhost/api/owner/agreement/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.25, 10.0.0.1" },
      body: JSON.stringify({ signedName: "Jane Owner" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });
    expect(ownerUpdatePayload).toMatchObject({
      agreement_version: "v1",
      agreement_signed_name: "Jane Owner",
      agreement_accepted_ip: "203.0.113.25",
    });
    expect(ownerUpdatePayload?.agreement_accepted_at).toEqual(expect.any(String));
    expect(profileUpsertPayload).toMatchObject({
      id: "owner-1",
      email: "owner@example.com",
      role: "owner",
      onboarding_completed: true,
    });
    expect(profileUpsertPayload?.onboarding_completed_at).toEqual(expect.any(String));
    expect(authUpdatePayload).toEqual({
      data: {
        onboarding_completed: true,
        role: "owner",
      },
    });
    expect(maybeGrantFoundingOwnerBonus).toHaveBeenCalledWith({
      adminClient: expect.objectContaining({ from: expect.any(Function) }),
      ownerId: "owner-1",
    });
  });

  test("rejects an unauthenticated acceptance without writing an audit record", async () => {
    createSupabaseServerClient.mockReturnValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
    const response = await POST(new Request("http://localhost/api/owner/agreement/accept", {
      method: "POST", body: JSON.stringify({ signedName: "Jane Owner" }),
    }));
    expect(response.status).toBe(401);
    expect(ownerUpdatePayload).toBeNull();
    expect(profileUpsertPayload).toBeNull();
    expect(maybeGrantFoundingOwnerBonus).not.toHaveBeenCalled();
  });

  test.each(["", "  ", "Jo", " J "])("preserves server-side name validation for %j", async signedName => {
    const response = await POST(new Request("http://localhost/api/owner/agreement/accept", {
      method: "POST", body: JSON.stringify({ signedName }),
    }));
    expect(response.status).toBe(400);
    expect(ownerUpdatePayload).toBeNull();
    expect(profileUpsertPayload).toBeNull();
  });

  test("does not mark onboarding complete when the Founding Owner grant lookup fails", async () => {
    maybeGrantFoundingOwnerBonus.mockResolvedValue({ granted: false, error: new Error("lookup failed") });
    const response = await POST(new Request("http://localhost/api/owner/agreement/accept", {
      method: "POST",
      body: JSON.stringify({ signedName: "Jane Owner" }),
    }));

    expect(response.status).toBe(500);
    expect(profileUpsertPayload).toBeNull();
  });
});
