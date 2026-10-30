import { beforeEach, describe, expect, it, vi } from "vitest";

const allowed = "4de38521-9534-4b81-b54e-81e6b7c58539";
const state = vi.hoisted(() => ({ enabled: false, configuredId: "4de38521-9534-4b81-b54e-81e6b7c58539", error: false }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: { value: { enabled: state.enabled, auth_user_id: state.configuredId } },
      error: state.error ? { message: "unavailable" } : null,
    }) }) }) }),
  }),
}));

import { designatedTestGuestId, isDesignatedTestGuest, isTestBookingEnabled } from "./test-guest-booking";

describe("single guest test booking allowlist and live switch", () => {
  beforeEach(() => { state.enabled = false; state.configuredId = allowed; state.error = false; });

  it("authorizes exactly the supplied immutable Auth UUID", () => {
    expect(designatedTestGuestId()).toBe(allowed);
    expect(isDesignatedTestGuest(allowed)).toBe(true);
    expect(isDesignatedTestGuest("22222222-2222-4222-8222-222222222222")).toBe(false);
    expect(isDesignatedTestGuest(null)).toBe(false);
  });

  it("fails closed when the live switch is disabled, invalid, or unavailable", async () => {
    expect(await isTestBookingEnabled()).toBe(false);
    state.enabled = true;
    expect(await isTestBookingEnabled()).toBe(true);
    state.configuredId = "22222222-2222-4222-8222-222222222222";
    expect(await isTestBookingEnabled()).toBe(false);
    state.configuredId = allowed;
    state.error = true;
    expect(await isTestBookingEnabled()).toBe(false);
  });
});
