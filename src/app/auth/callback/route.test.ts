import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase-server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/navigation", () => ({ resolveAccountNavigation: vi.fn() }));
vi.mock("@/lib/app-url", () => ({ getAppBaseUrl: () => "https://hannadvc.test" }));

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { resolveAccountNavigation } from "@/lib/navigation";
import { GET } from "./route";

const user = { id: "account-1" };
const client = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user } }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ data: { user } }),
    verifyOtp: vi.fn().mockResolvedValue({ data: { user } }),
  },
};

describe("auth callback navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.auth.getUser.mockResolvedValue({ data: { user } });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
    vi.mocked(resolveAccountNavigation).mockResolvedValue({
      label: "Admin", defaultHref: "/admin", dashboards: [{ id: "admin", label: "Admin", href: "/admin" }],
    });
  });

  it("uses the shared server policy for an admin OAuth callback", async () => {
    const response = await GET(new Request("https://hannadvc.test/auth/callback?code=valid"));
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith("valid");
    expect(response.headers.get("location")).toBe("https://hannadvc.test/admin");
    expect(resolveAccountNavigation).toHaveBeenCalledWith(client);
  });

  it.each(["//example.com", "/%2f%2fexample.com", "/owner/dashboard"])("rejects unsafe or unauthorized return %s", async (next) => {
    const url = new URL("https://hannadvc.test/auth/callback?code=valid");
    url.searchParams.set("next", next);
    expect((await GET(new Request(url))).headers.get("location")).toBe("https://hannadvc.test/admin");
  });

  it("preserves an explicitly authorized return destination", async () => {
    expect((await GET(new Request("https://hannadvc.test/auth/callback?code=valid&next=%2Fadmin%2Fowners"))).headers.get("location"))
      .toBe("https://hannadvc.test/admin/owners");
  });

  it("preserves the existing affiliate confirmation flow", async () => {
    const response = await GET(new Request("https://hannadvc.test/auth/callback?code=valid&next=%2Faffiliate%2Flogin%3Fmode%3Dupdate"));
    expect(response.headers.get("location")).toBe("https://hannadvc.test/affiliate/login?mode=update&confirmed=1");
  });

  it("preserves the affiliate session-error destination", async () => {
    client.auth.getUser.mockResolvedValueOnce({ data: { user: null as unknown as typeof user } });
    const response = await GET(new Request("https://hannadvc.test/auth/callback?next=%2Faffiliate%2Fdashboard"));
    const destination = new URL(response.headers.get("location")!);
    expect(destination.pathname).toBe("/affiliate/login");
    expect(destination.searchParams.get("error")).toBe("session");
  });

  it("does not route an unverified session into admin", async () => {
    vi.mocked(resolveAccountNavigation).mockResolvedValue(null);
    expect((await GET(new Request("https://hannadvc.test/auth/callback?next=%2Fadmin"))).headers.get("location"))
      .toBe("https://hannadvc.test/login");
  });
});
