import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReadyStaysMarketplaceClient from "./ReadyStaysMarketplaceClient";

vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
      createElement("a", { href, ...props }, children),
  };
});

describe("Ready Stays filter layout", () => {
  it("keeps selected dates and resort visible in full-width, stacked controls", () => {
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[]}
        resorts={[{ id: "resort-blt", name: "Bay Lake Tower" }]}
        searchParams={{
          resort: "resort-blt",
          checkIn: "2026-12-04",
          checkOut: "2026-12-11",
        }}
      />,
    );

    const checkIn = screen.getByLabelText("Check-in") as HTMLInputElement;
    const checkOut = screen.getByLabelText("Check-out") as HTMLInputElement;
    const resort = screen.getByLabelText("Resort") as HTMLInputElement;
    const dateGrid = checkIn.closest("label")?.parentElement;

    expect(checkIn.type).toBe("date");
    expect(checkOut.type).toBe("date");
    expect(checkIn.value).toBe("2026-12-04");
    expect(checkOut.value).toBe("2026-12-11");
    expect(dateGrid?.className).toContain("grid-cols-1");
    expect(dateGrid?.className).not.toContain("grid-cols-2");
    expect(checkIn.className).toContain("w-full");
    expect(checkOut.className).toContain("pr-10");
    expect(resort.value).toBe("Bay Lake Tower");
    expect(resort.className).toContain("w-full");
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Clear filters" })).toHaveLength(2);
    for (const clearLink of screen.getAllByRole("link", { name: "Clear filters" })) {
      expect(clearLink).toHaveAttribute("href", "/ready-stays");
    }

    fireEvent.change(checkIn, { target: { value: "2026-12-05" } });
    expect(checkIn.value).toBe("2026-12-05");
  });
});
