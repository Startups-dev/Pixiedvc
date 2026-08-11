import { describe, expect, it, vi } from "vitest";

describe("Hara public route", () => {
  it("/hara exposes the Hara metadata and loads the existing planning experience", async () => {
    vi.resetModules();
    vi.doMock("@/lib/pixie/hara-access", () => ({
      getHaraAccessState: vi.fn(async () => ({ enabled: false, mode: "disabled" })),
    }));
    vi.doMock("@/app/pixie/PixieClient", () => ({
      default: ({ enabled, previewMode }: { enabled: boolean; previewMode?: boolean }) => ({
        type: "PlanningClient",
        enabled,
        previewMode,
      }),
    }));

    const page = await import("@/app/hara/page");

    expect(page.dynamic).toBe("force-dynamic");
    expect(page.metadata.title).toBe("Ask Hara | HannaDVC");
    expect(page.metadata.description).toContain("Hara");
    expect(page.metadata.description).toContain("HannaDVC");
    const element = await page.default();
    expect(element.props).toMatchObject({ enabled: false, previewMode: false });
    vi.doUnmock("@/lib/pixie/hara-access");
    vi.doUnmock("@/app/pixie/PixieClient");
  });

  it("keeps public users disabled when Hara is not publicly enabled", async () => {
    vi.resetModules();
    vi.doMock("@/lib/pixie/hara-access", () => ({
      getHaraAccessState: vi.fn(async () => ({ enabled: false, mode: "disabled" })),
    }));
    vi.doMock("@/app/pixie/PixieClient", () => ({
      default: ({ enabled, previewMode }: { enabled: boolean; previewMode?: boolean }) => ({
        type: "PlanningClient",
        enabled,
        previewMode,
      }),
    }));

    const page = await import("@/app/hara/page");

    const element = await page.default();
    expect(element.props).toMatchObject({
      enabled: false,
      previewMode: false,
    });
    vi.doUnmock("@/lib/pixie/hara-access");
    vi.doUnmock("@/app/pixie/PixieClient");
  });

  it("passes preview mode through for authorized testers", async () => {
    vi.resetModules();
    vi.doMock("@/lib/pixie/hara-access", () => ({
      getHaraAccessState: vi.fn(async () => ({ enabled: true, mode: "preview" })),
    }));
    vi.doMock("@/app/pixie/PixieClient", () => ({
      default: ({ enabled, previewMode }: { enabled: boolean; previewMode?: boolean }) => ({
        type: "PlanningClient",
        enabled,
        previewMode,
      }),
    }));

    const page = await import("@/app/hara/page");

    const element = await page.default();
    expect(element.props).toMatchObject({
      enabled: true,
      previewMode: true,
    });
    vi.doUnmock("@/lib/pixie/hara-access");
    vi.doUnmock("@/app/pixie/PixieClient");
  });
});
