import { beforeEach, describe, expect, test, vi } from "vitest";

const createSupabaseServerClient = vi.fn();
const getSupabaseAdminClient = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: () => createSupabaseServerClient(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => getSupabaseAdminClient(),
}));

import { getOwnerAccessState } from "@/lib/owner/access";

function createSelectChain(result: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: result, error: null });
  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ maybeSingle, order }));
  const select = vi.fn(() => ({ eq }));
  return { select };
}

function createDbStub({
  profile,
  owner,
}: {
  profile: unknown;
  owner: unknown;
}) {
  const profileTable = createSelectChain(profile);
  const ownerTable = createSelectChain(owner);

  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") return profileTable;
      if (table === "owners") return ownerTable;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe("getOwnerAccessState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseAdminClient.mockReturnValue(null);
  });

  test("redirects owner users with incomplete onboarding back to owner onboarding", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-1", email: "owner@example.com", user_metadata: { role: "owner" } } },
        }),
      },
      ...createDbStub({
        profile: { role: "owner", onboarding_completed: false, onboarding_completed_at: null },
        owner: null,
      }),
    };
    createSupabaseServerClient.mockResolvedValue(supabase);

    const state = await getOwnerAccessState({ redirectPath: "/owner/dashboard" });

    expect(state.redirectTo).toBe("/owner/onboarding");
    expect(state.onboardingComplete).toBe(false);
    expect(state.owner).toBeNull();
  });

  test("redirects completed owner onboarding to agreement until accepted", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-1", email: "owner@example.com", user_metadata: { role: "owner" } } },
        }),
      },
      ...createDbStub({
        profile: { role: "owner", onboarding_completed: true, onboarding_completed_at: "2026-08-18T12:00:00.000Z" },
        owner: {
          id: "owner-1",
          user_id: "owner-1",
          agreement_accepted_at: null,
          agreement_version: "v1",
          metadata: null,
        },
      }),
    };
    createSupabaseServerClient.mockResolvedValue(supabase);

    const state = await getOwnerAccessState({ redirectPath: "/owner/dashboard" });

    expect(state.redirectTo).toBe("/owner/onboarding/agreement");
    expect(state.onboardingComplete).toBe(true);
    expect(state.agreementAcceptedAt).toBeNull();
  });

  test("allows completed onboarding with accepted owner agreement to reach dashboard", async () => {
    const acceptedAt = "2026-08-18T12:05:00.000Z";
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-1", email: "owner@example.com", user_metadata: { role: "owner" } } },
        }),
      },
      ...createDbStub({
        profile: { role: "owner", onboarding_completed: true, onboarding_completed_at: "2026-08-18T12:00:00.000Z" },
        owner: {
          id: "owner-1",
          user_id: "owner-1",
          agreement_accepted_at: acceptedAt,
          agreement_version: "v1",
          metadata: null,
        },
      }),
    };
    createSupabaseServerClient.mockResolvedValue(supabase);

    const state = await getOwnerAccessState({ redirectPath: "/owner/dashboard" });

    expect(state.redirectTo).toBeNull();
    expect(state.owner?.id).toBe("owner-1");
    expect(state.agreementAcceptedAt).toBe(acceptedAt);
  });
});
