import { describe, expect, it, vi } from "vitest";

import { canUseHaraPreview, isPixiePublicEnabled } from "@/lib/pixie/hara-access";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe("Hara access", () => {
  it("keeps production public access disabled when the public flag is false", () => {
    expect(isPixiePublicEnabled({ PIXIE_PUBLIC_ENABLED: "false", NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("authorizes preview testers through existing admin identity rules", () => {
    expect(canUseHaraPreview({ profileRole: "admin" })).toBe(true);
    expect(canUseHaraPreview({ appRole: "admin" })).toBe(true);
  });

  it("does not grant preview access to public users", () => {
    expect(canUseHaraPreview({ profileRole: "guest", appRole: "guest", email: "guest@example.com" })).toBe(false);
    expect(canUseHaraPreview({ profileRole: null, appRole: null, email: null })).toBe(false);
  });
});
