import { describe, expect, it, vi } from "vitest";

import { getHaraAccessState, isPixiePublicEnabled } from "@/lib/pixie/hara-access";

const getCurrentUserAdminStateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin", () => ({
  getCurrentUserAdminState: getCurrentUserAdminStateMock,
}));

describe("Hara access", () => {
  it("keeps production public access disabled when the public flag is false", () => {
    expect(isPixiePublicEnabled({ PIXIE_PUBLIC_ENABLED: "false", NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("authorizes preview access from the existing computed admin state", async () => {
    getCurrentUserAdminStateMock.mockResolvedValueOnce({
      user: { email: null },
      profileRole: null,
      appRole: null,
      isAdmin: true,
    });

    await expect(getHaraAccessState({ PIXIE_PUBLIC_ENABLED: "false", NODE_ENV: "production" } as NodeJS.ProcessEnv)).resolves.toEqual({
      enabled: true,
      mode: "preview",
    });
  });

  it("does not grant preview access to public non-admin users", async () => {
    getCurrentUserAdminStateMock.mockResolvedValueOnce({
      user: null,
      profileRole: null,
      appRole: null,
      isAdmin: false,
    });

    await expect(getHaraAccessState({ PIXIE_PUBLIC_ENABLED: "false", NODE_ENV: "production" } as NodeJS.ProcessEnv)).resolves.toEqual({
      enabled: false,
      mode: "disabled",
    });
  });

  it("does not silently treat auth infrastructure failures as normal disabled access", async () => {
    const error = new Error("dynamic server usage");
    getCurrentUserAdminStateMock.mockRejectedValueOnce(error);

    await expect(getHaraAccessState({ PIXIE_PUBLIC_ENABLED: "false", NODE_ENV: "production" } as NodeJS.ProcessEnv)).rejects.toThrow(
      "dynamic server usage",
    );
  });
});
