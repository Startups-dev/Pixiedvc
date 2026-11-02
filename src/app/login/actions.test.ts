import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/navigation", () => ({ resolveAccountNavigation: vi.fn() }));
import { resolveAccountNavigation } from "@/lib/navigation";
import { getPostLoginDestination } from "./actions";

describe("server-resolved password login destination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gets the current server account instead of accepting client role claims", async () => {
    vi.mocked(resolveAccountNavigation).mockResolvedValue({
      label: "Admin", defaultHref: "/admin", dashboards: [{ id: "admin", label: "Admin", href: "/admin" }],
    });
    expect(await getPostLoginDestination(null)).toBe("/admin");
    expect(await getPostLoginDestination("//example.com")).toBe("/admin");
    expect(await getPostLoginDestination("/admin/owners?filter=active")).toBe("/admin/owners?filter=active");
    expect(await getPostLoginDestination("/owner/dashboard")).toBe("/admin");
    expect(resolveAccountNavigation).toHaveBeenCalledWith();
  });

  it("rejects protected destinations for a guest", async () => {
    vi.mocked(resolveAccountNavigation).mockResolvedValue({
      label: "Guest", defaultHref: "/my-trip", dashboards: [{ id: "guest", label: "My Trip", href: "/my-trip" }],
    });
    expect(await getPostLoginDestination("/admin")).toBe("/my-trip");
    expect(await getPostLoginDestination("/profile")).toBe("/profile");
  });

  it("does not send a missing session into a dashboard", async () => {
    vi.mocked(resolveAccountNavigation).mockResolvedValue(null);
    expect(await getPostLoginDestination("/admin")).toBe("/login");
  });
});
