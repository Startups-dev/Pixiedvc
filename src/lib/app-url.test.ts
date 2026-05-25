import { afterEach, describe, expect, it, vi } from "vitest";

const originalNodeEnv = process.env.NODE_ENV;
const originalPublicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

describe("client app URL resolution", () => {
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXT_PUBLIC_SITE_URL = originalPublicSiteUrl;
    process.env.NEXT_PUBLIC_APP_URL = originalPublicAppUrl;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("prefers NEXT_PUBLIC_SITE_URL for staging or production auth redirects", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://pixiedvc-web-staging-776171407864.us-central1.run.app";
    process.env.NEXT_PUBLIC_APP_URL = "";

    vi.stubGlobal("window", {
      location: { origin: "https://0.0.0.0:8080" },
    });

    const { getClientAppUrl } = await import("@/lib/app-url");
    expect(getClientAppUrl("/auth/callback")).toBe(
      "https://pixiedvc-web-staging-776171407864.us-central1.run.app/auth/callback",
    );
  });

  it("rewrites 0.0.0.0 to localhost for local development only", async () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SITE_URL = "";
    process.env.NEXT_PUBLIC_APP_URL = "";

    vi.stubGlobal("window", {
      location: { origin: "http://0.0.0.0:8080" },
    });

    const { getClientAppUrl } = await import("@/lib/app-url");
    expect(getClientAppUrl("/auth/callback")).toBe("http://localhost:8080/auth/callback");
  });
});
