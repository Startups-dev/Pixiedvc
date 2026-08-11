import { describe, expect, it, vi } from "vitest";

import { getHaraAccessState, isPixiePublicEnabled } from "@/lib/pixie/hara-access";

const getCurrentUserAdminStateMock = vi.hoisted(() => vi.fn());
const emailIsAllowedForAdminMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin", () => ({
  getCurrentUserAdminState: getCurrentUserAdminStateMock,
}));

vi.mock("@/lib/admin-emails", () => ({
  emailIsAllowedForAdmin: emailIsAllowedForAdminMock,
}));

describe("Hara access", () => {
  it("keeps production public access disabled when the public flag is false", () => {
    expect(isPixiePublicEnabled({ PIXIE_PUBLIC_ENABLED: "false", NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("authorizes preview access from the existing computed admin state", async () => {
    emailIsAllowedForAdminMock.mockReturnValueOnce(true);
    getCurrentUserAdminStateMock.mockResolvedValueOnce({
      user: { email: "admin@example.com" },
      profileRole: "admin",
      appRole: null,
      isAdmin: true,
    });

    await expect(getHaraAccessState({ PIXIE_PUBLIC_ENABLED: "false", NODE_ENV: "production" } as NodeJS.ProcessEnv)).resolves.toEqual({
      enabled: true,
      mode: "preview",
    });
  });

  it("logs redacted Hara access diagnostics for preview checks", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    emailIsAllowedForAdminMock.mockReturnValueOnce(true);
    getCurrentUserAdminStateMock.mockResolvedValueOnce({
      user: { email: "admin@example.com", id: "user-1" },
      profileRole: "admin",
      appRole: null,
      isAdmin: true,
    });

    await getHaraAccessState({ PIXIE_PUBLIC_ENABLED: "false", NODE_ENV: "production" } as NodeJS.ProcessEnv);

    expect(info).toHaveBeenCalledWith("[hara-access-debug]", {
      event: "hara_access_debug",
      authenticated: true,
      hasEmail: true,
      emailAllowedForAdmin: true,
      profileRole: "admin",
      appRole: null,
      adminStateIsAdmin: true,
      publicEnabled: false,
      resultingMode: "preview",
    });
    expect(JSON.stringify(info.mock.calls)).not.toContain("admin@example.com");
    expect(JSON.stringify(info.mock.calls)).not.toContain("user-1");
    info.mockRestore();
  });

  it("does not grant preview access to public non-admin users", async () => {
    emailIsAllowedForAdminMock.mockReturnValueOnce(false);
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
