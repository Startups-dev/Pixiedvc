import { describe, expect, it, vi } from "vitest";

const permanentRedirectMock = vi.fn((href: string) => {
  throw new Error(`redirect:${href}`);
});

vi.mock("next/navigation", () => ({
  permanentRedirect: permanentRedirectMock,
}));

describe("legacy Pixie public route", () => {
  it("/pixie permanently redirects to /hara", async () => {
    vi.resetModules();
    const page = await import("@/app/pixie/page");

    expect(() => page.default()).toThrow("redirect:/hara");
    expect(permanentRedirectMock).toHaveBeenCalledWith("/hara");
  });
});
