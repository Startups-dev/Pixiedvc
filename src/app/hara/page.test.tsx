import { describe, expect, it, vi } from "vitest";

describe("Hara public route", () => {
  it("/hara exposes the Hara metadata and loads the existing planning experience", async () => {
    vi.resetModules();
    vi.doMock("@/app/pixie/PixieClient", () => ({
      default: ({ enabled }: { enabled: boolean }) => ({ type: "PlanningClient", enabled }),
    }));

    const page = await import("@/app/hara/page");

    expect(page.metadata.title).toBe("Ask Hara | HannaDVC");
    expect(page.metadata.description).toContain("Hara");
    expect(page.metadata.description).toContain("HannaDVC");
    expect(page.default().type).toBeDefined();
  });
});
