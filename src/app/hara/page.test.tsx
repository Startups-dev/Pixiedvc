import { describe, expect, it, vi } from "vitest";

describe("Hara public route", () => {
  it("/hara exposes the Hara metadata and loads the existing planning experience", async () => {
    vi.resetModules();
    vi.doMock("@/app/pixie/PixieClient", () => ({
      default: () => ({
        type: "PlanningClient",
      }),
    }));

    const page = await import("@/app/hara/page");

    expect(page.dynamic).toBe("force-dynamic");
    expect(page.metadata.title).toBe("Ask Hara | HannaDVC");
    expect(page.metadata.description).toContain("Hara");
    expect(page.metadata.description).toContain("HannaDVC");
    const element = await page.default();
    expect(element.props).toEqual({});
    vi.doUnmock("@/app/pixie/PixieClient");
  });
});
