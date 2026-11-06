import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReadyStaysMarketplaceClient from "./ReadyStaysMarketplaceClient";

vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
      createElement("a", { href, ...props }, children),
  };
});

const resorts = [{ id: "resort-blt", name: "Bay Lake Tower" }];

describe("Ready Stays date filter modes", () => {
  it("preserves homepage dates and resort in specific-date mode", () => {
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[]}
        resorts={resorts}
        searchParams={{ resort: "resort-blt", checkIn: "2026-12-04", checkOut: "2026-12-11" }}
      />,
    );

    const checkIn = screen.getByLabelText("Check-in") as HTMLInputElement;
    const checkOut = screen.getByLabelText("Check-out") as HTMLInputElement;
    const resort = screen.getByLabelText("Resort") as HTMLInputElement;
    const form = checkIn.closest("form")!;
    const submitted = new FormData(form);

    expect(screen.getByRole("button", { name: "I have specific dates" })).toHaveAttribute("aria-pressed", "true");
    expect(checkIn.type).toBe("date");
    expect(checkOut.type).toBe("date");
    expect(checkIn.value).toBe("2026-12-04");
    expect(checkOut.value).toBe("2026-12-11");
    expect(checkIn.className).toContain("w-full");
    expect(checkOut.className).toContain("pr-10");
    expect(resort.value).toBe("Bay Lake Tower");
    expect(submitted.get("dateMode")).toBe("specific");
    expect(submitted.get("resort")).toBe("resort-blt");
    expect(submitted.get("checkIn")).toBe("2026-12-04");
    expect(submitted.get("checkOut")).toBe("2026-12-11");
    expect(submitted.has("month")).toBe(false);
    expect(submitted.has("holiday")).toBe(false);
    expect(screen.getByText(/fixed reservations matching Dec 4, 2026 – Dec 11, 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeInTheDocument();
  });

  it("defaults direct entry to flexible dates and allows all months", () => {
    render(<ReadyStaysMarketplaceClient readyStays={[]} resorts={resorts} searchParams={{}} />);

    const month = screen.getByLabelText("Preferred month and year") as HTMLInputElement;
    const form = month.closest("form")!;
    const submitted = new FormData(form);

    expect(screen.getByRole("button", { name: "My dates are flexible" })).toHaveAttribute("aria-pressed", "true");
    expect(month.value).toBe("");
    expect(screen.queryByLabelText("Check-in")).not.toBeInTheDocument();
    expect(screen.getByText(/Browsing all available months/)).toBeInTheDocument();
    expect(within(form).getByText("Holiday")).toBeInTheDocument();
    expect(submitted.get("dateMode")).toBe("flexible");
    expect(submitted.has("checkIn")).toBe(false);
    expect(submitted.has("checkOut")).toBe(false);
  });

  it("switches modes without losing entered values or submitting conflicting filters", () => {
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[]}
        resorts={resorts}
        searchParams={{ resort: "resort-blt", checkIn: "2026-12-04", checkOut: "2026-12-11" }}
      />,
    );

    const flexibleButton = screen.getByRole("button", { name: "My dates are flexible" });
    fireEvent.click(flexibleButton);

    const month = screen.getByLabelText("Preferred month and year") as HTMLInputElement;
    fireEvent.change(month, { target: { value: "2027-01" } });
    let submitted = new FormData(month.closest("form")!);
    expect(submitted.get("dateMode")).toBe("flexible");
    expect(submitted.get("month")).toBe("2027-01");
    expect(submitted.get("resort")).toBe("resort-blt");
    expect(submitted.has("checkIn")).toBe(false);
    expect(submitted.has("checkOut")).toBe(false);

    fireEvent.click(screen.getByRole("radio", { name: "Christmas" }));
    fireEvent.click(screen.getByRole("button", { name: "I have specific dates" }));
    expect((screen.getByLabelText("Check-in") as HTMLInputElement).value).toBe("2026-12-04");
    expect((screen.getByLabelText("Check-out") as HTMLInputElement).value).toBe("2026-12-11");
    submitted = new FormData(screen.getByLabelText("Check-in").closest("form")!);
    expect(submitted.get("dateMode")).toBe("specific");
    expect(submitted.has("month")).toBe(false);
    expect(submitted.has("holiday")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "My dates are flexible" }));
    expect((screen.getByLabelText("Preferred month and year") as HTMLInputElement).value).toBe("2027-01");
    expect((screen.getByRole("radio", { name: "Christmas" }) as HTMLInputElement).checked).toBe(true);
  });

  it("explains an exact-date empty result and offers flexible browsing", () => {
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[]}
        resorts={resorts}
        searchParams={{
          dateMode: "specific",
          resort: "resort-blt",
          checkIn: "2026-12-04",
          checkOut: "2026-12-11",
        }}
      />,
    );

    expect(screen.getByText("No Ready Stays match these exact dates")).toBeInTheDocument();
    expect(screen.getByText(/Reservations have fixed dates/i)).toBeInTheDocument();
    const browseLink = screen.getByRole("link", { name: "Browse flexible dates" });
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("dateMode=flexible"));
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("resort=resort-blt"));
    expect(browseLink.getAttribute("href")).not.toContain("checkIn");
    expect(browseLink.getAttribute("href")).not.toContain("checkOut");

    fireEvent.click(screen.getByRole("button", { name: "Change dates" }));
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("offers all-month browsing when a flexible month has no results", () => {
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[]}
        resorts={resorts}
        searchParams={{ dateMode: "flexible", month: "2027-01", resort: "resort-blt" }}
      />,
    );

    expect(screen.getByText("No Ready Stays overlap January 2027")).toBeInTheDocument();
    const allMonthsLink = screen.getByRole("link", { name: "Browse all available months" });
    expect(allMonthsLink).toHaveAttribute("href", expect.stringContaining("resort=resort-blt"));
    expect(allMonthsLink.getAttribute("href")).not.toContain("month=");
  });

  it("keeps the same filters available in the desktop sidebar and mobile drawer", () => {
    const { container } = render(<ReadyStaysMarketplaceClient readyStays={[]} resorts={resorts} searchParams={{}} />);

    expect(container.querySelector("aside")?.className).toContain("lg:block");
    expect(screen.getByRole("button", { name: "Filters" }).className).toContain("lg:hidden");
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "I have specific dates" })).toHaveLength(2);
  });
});
