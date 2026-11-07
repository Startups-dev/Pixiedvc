import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReadyStaysMarketplaceClient from "./ReadyStaysMarketplaceClient";

vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
      createElement("a", { href, ...props }, children),
  };
});

const resorts = [{ id: "resort-blt", name: "Bay Lake Tower", slug: "bay-lake-tower", calculator_code: "BLT" }];

function formatExpectedMonth(value: string) {
  const month = Number(value.split("-")[1]);
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2020, month - 1, 1)));
}

function makeReadyStay(id: string, points: number, checkIn: string, resortName = "Bay Lake Tower") {
  return {
    id,
    resort_id: "resort-blt",
    check_in: checkIn,
    check_out: "2027-12-11",
    points,
    room_type: "STUDIO",
    season_type: "standard",
    guest_price_per_point_cents: 2000,
    original_guest_price_per_point_cents: null,
    price_reduced_at: null,
    resorts: { name: resortName, slug: "bay-lake-tower", calculator_code: "BLT" },
  };
}

describe("Ready Stays date filter modes", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
    expect(screen.getByLabelText("Current search")).toHaveTextContent("Dec 4, 2026 – Dec 11, 2026 · Bay Lake Tower");
    expect(screen.queryByText(/Existing stays have fixed dates/)).not.toBeInTheDocument();
    const clearLinks = screen.getAllByRole("link", { name: "Clear filters" });
    expect(clearLinks.every((link) => link.getAttribute("href") === "/ready-stays")).toBe(true);
    expect(clearLinks[0]).toHaveClass("text-xs", "font-semibold");
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeInTheDocument();
  });

  it("defaults direct entry to flexible dates with no month filter", () => {
    render(<ReadyStaysMarketplaceClient readyStays={[]} resorts={resorts} searchParams={{}} />);

    const month = screen.getByLabelText("Month") as HTMLSelectElement;
    const year = screen.getByLabelText("Year") as HTMLSelectElement;
    const form = month.closest("form")!;
    const submitted = new FormData(form);

    expect(screen.getByRole("button", { name: "My dates are flexible" })).toHaveAttribute("aria-pressed", "true");
    expect(month.value).toBe("");
    expect(year.value).toBe("");
    expect(screen.getByText("TRAVEL MONTH")).toBeInTheDocument();
    expect(screen.queryByText("Holiday")).not.toBeInTheDocument();
    expect(screen.queryByText(/choose a month and year/i)).not.toBeInTheDocument();
    expect(submitted.has("month")).toBe(false);
    expect(screen.queryByLabelText("Check-in")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Current search")).not.toBeInTheDocument();
    expect(within(form).queryByText("Holiday")).not.toBeInTheDocument();
    expect(submitted.get("dateMode")).toBe("flexible");
    expect(submitted.has("checkIn")).toBe(false);
    expect(submitted.has("checkOut")).toBe(false);
  });

  it("ignores legacy holiday query parameters without hiding matching marketplace results", () => {
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[{ ...makeReadyStay("legacy-holiday-stay", 100, "2027-10-30"), check_out: "2027-11-02", season_type: "halloween" }]}
        resorts={resorts}
        searchParams={{ dateMode: "flexible", holiday: "christmas" }}
      />,
    );

    const month = screen.getByLabelText("Month") as HTMLSelectElement;
    expect(screen.queryByText("Holiday")).not.toBeInTheDocument();
    expect(screen.getByText("Bay Lake Tower")).toBeInTheDocument();
    expect(new FormData(month.closest("form")!).has("holiday")).toBe(false);
  });

  it.each(["2026-12", "2027-01", "2027-02"])("selects and submits %s in YYYY-MM format", (selectedMonth) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15, 12));
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[]}
        resorts={resorts}
        searchParams={{ dateMode: "flexible", month: selectedMonth }}
      />,
    );

    const [expectedYear, expectedMonth] = selectedMonth.split("-");
    const month = screen.getByLabelText("Month") as HTMLSelectElement;
    const year = screen.getByLabelText("Year") as HTMLSelectElement;
    expect(month.value).toBe(expectedMonth);
    expect(year.value).toBe(expectedYear);
    expect(within(month).getByRole("option", { name: formatExpectedMonth(`2020-${expectedMonth}`) })).toHaveValue(expectedMonth);
    expect(within(year).getByRole("option", { name: expectedYear })).toHaveValue(expectedYear);
    const submitted = new FormData(month.closest("form")!);
    expect(submitted.get("month")).toBe(selectedMonth);
    vi.useRealTimers();
  });

  it("limits years to the current and following year while disabling only past months", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15, 12));

    const { unmount } = render(<ReadyStaysMarketplaceClient readyStays={[]} resorts={resorts} searchParams={{}} />);
    const month = screen.getByLabelText("Month") as HTMLSelectElement;
    const year = screen.getByLabelText("Year") as HTMLSelectElement;
    const yearValues = within(year).getAllByRole("option").map((option) => (option as HTMLOptionElement).value).filter(Boolean);
    expect(yearValues).toEqual(["2026", "2027"]);
    expect(month.value).toBe("");
    expect(within(month).getByRole("option", { name: "October" })).toBeDisabled();
    expect(within(month).getByRole("option", { name: "November" })).toBeEnabled();
    expect(within(month).getByRole("option", { name: "December" })).toBeEnabled();

    fireEvent.change(year, { target: { value: "2026" } });
    fireEvent.change(month, { target: { value: "12" } });
    expect(new FormData(month.closest("form")!).get("month")).toBe("2026-12");
    fireEvent.change(year, { target: { value: "2027" } });
    expect(month.value).toBe("12");
    expect(new FormData(month.closest("form")!).get("month")).toBe("2027-12");
    expect(within(month).getByRole("option", { name: "January" })).toBeEnabled();
    expect(within(month).getByRole("option", { name: "October" })).toBeEnabled();
    expect(within(month).getByRole("option", { name: "November" })).toBeEnabled();
    expect(within(month).getByRole("option", { name: "December" })).toBeEnabled();
    fireEvent.change(month, { target: { value: "01" } });
    expect(new FormData(month.closest("form")!).get("month")).toBe("2027-01");

    unmount();
    vi.setSystemTime(new Date(2027, 0, 1, 12));
    render(<ReadyStaysMarketplaceClient readyStays={[]} resorts={resorts} searchParams={{}} />);
    const rolloverYear = screen.getByLabelText("Year") as HTMLSelectElement;
    const rolloverMonth = screen.getByLabelText("Month") as HTMLSelectElement;
    const rolloverYearValues = within(rolloverYear).getAllByRole("option").map((option) => (option as HTMLOptionElement).value).filter(Boolean);
    expect(rolloverYearValues).toEqual(["2027", "2028"]);
    expect(rolloverMonth.value).toBe("");
    expect(within(rolloverMonth).getByRole("option", { name: "January" })).toBeEnabled();
    fireEvent.change(rolloverYear, { target: { value: "2028" } });
    expect(within(rolloverMonth).getByRole("option", { name: "January" })).toBeEnabled();

    vi.useRealTimers();
  });

  it("offers all twelve months and clears month/year without clearing other filters", () => {
    const currentYear = new Date().getFullYear();
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[]}
        resorts={resorts}
        searchParams={{ dateMode: "flexible", resort: "resort-blt", price_min: "20" }}
      />,
    );

    const month = screen.getByLabelText("Month") as HTMLSelectElement;
    const year = screen.getByLabelText("Year") as HTMLSelectElement;
    for (const monthNumber of Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"))) {
      expect(within(month).getByRole("option", { name: formatExpectedMonth(`2020-${monthNumber}`) })).toHaveValue(monthNumber);
    }
    expect(within(year).getByRole("option", { name: String(currentYear) })).toHaveValue(String(currentYear));
    expect(within(year).getByRole("option", { name: String(currentYear + 1) })).toHaveValue(String(currentYear + 1));

    fireEvent.change(year, { target: { value: String(currentYear + 1) } });
    fireEvent.change(month, { target: { value: "02" } });
    expect(new FormData(month.closest("form")!).get("month")).toBe(`${currentYear + 1}-02`);
    fireEvent.change(month, { target: { value: "" } });
    expect(month.value).toBe("");
    expect(year.value).toBe("");
    expect(new FormData(month.closest("form")!).has("month")).toBe(false);
    expect(new FormData(month.closest("form")!).get("resort")).toBe("resort-blt");
    expect(new FormData(month.closest("form")!).get("price_min")).toBe("20");
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

    const month = screen.getByLabelText("Month") as HTMLSelectElement;
    const year = screen.getByLabelText("Year") as HTMLSelectElement;
    fireEvent.change(year, { target: { value: "2027" } });
    fireEvent.change(month, { target: { value: "01" } });
    let submitted = new FormData(month.closest("form")!);
    expect(submitted.get("dateMode")).toBe("flexible");
    expect(submitted.get("month")).toBe("2027-01");
    expect(submitted.get("resort")).toBe("resort-blt");
    expect(submitted.has("checkIn")).toBe(false);
    expect(submitted.has("checkOut")).toBe(false);
    expect(submitted.has("holiday")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "I have specific dates" }));
    expect((screen.getByLabelText("Check-in") as HTMLInputElement).value).toBe("2026-12-04");
    expect((screen.getByLabelText("Check-out") as HTMLInputElement).value).toBe("2026-12-11");
    submitted = new FormData(screen.getByLabelText("Check-in").closest("form")!);
    expect(submitted.get("dateMode")).toBe("specific");
    expect(submitted.has("month")).toBe(false);
    expect(submitted.has("holiday")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "My dates are flexible" }));
    expect((screen.getByLabelText("Month") as HTMLSelectElement).value).toBe("01");
    expect((screen.getByLabelText("Year") as HTMLSelectElement).value).toBe("2027");
    expect(screen.queryByText("Holiday")).not.toBeInTheDocument();
  });

  it("explains exact-date empty results and provides custom request, flexible browse, and date editing", () => {
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[]}
        resorts={resorts}
        searchParams={{
          dateMode: "specific",
          resort: "resort-blt",
          checkIn: "2026-12-04",
          checkOut: "2026-12-11",
          adults: "2",
          children: "1",
          nights: "7",
          room: "TWOBR",
          view: "P",
          price_min: "2000",
          points_max: "500",
          sort: "price_asc",
        }}
      />,
    );

    expect(screen.getByText("No Ready Stays for these dates")).toBeInTheDocument();
    expect(screen.getByText("Dec 4, 2026 – Dec 11, 2026 · Bay Lake Tower")).toBeInTheDocument();
    expect(screen.getByText("We couldn't find a confirmed reservation at Bay Lake Tower for Dec 4, 2026 – Dec 11, 2026. You can request these exact dates or explore other available stays.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Sort")).not.toBeInTheDocument();
    const requestLink = screen.getByRole("link", { name: "Request These Dates" });
    expect(requestLink).toHaveClass("!text-white");
    const requestUrl = new URL(requestLink.getAttribute("href")!, "https://hannadvc.com");
    expect(requestUrl.pathname).toBe("/calculator");
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
      checkIn: "2026-12-04",
      checkOut: "2026-12-11",
      nights: "7",
      resort: "bay-lake-tower",
      adults: "2",
      children: "1",
      room: "TWOBR",
      view: "P",
    });
    const browseLink = screen.getByRole("link", { name: "Explore Other Stays" });
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("dateMode=flexible"));
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("resort=resort-blt"));
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("price_min=2000"));
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("points_max=500"));
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("sort=price_asc"));
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("room=TWOBR"));
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("view=P"));
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("adults=2"));
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("children=1"));
    expect(browseLink).toHaveAttribute("href", expect.stringContaining("nights=7"));
    expect(browseLink.getAttribute("href")).not.toContain("checkIn");
    expect(browseLink.getAttribute("href")).not.toContain("checkOut");
    expect(browseLink.getAttribute("href")).not.toContain("month=");
    expect(screen.queryByRole("button", { name: "Change My Dates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/ready-stays");
    expect(screen.getAllByRole("link", { name: "Clear filters" })).toHaveLength(1);
    expect(requestLink.parentElement).toHaveClass("flex-col", "sm:flex-row");
  });

  it("uses only the supplied single date in an empty-result message and request intent", () => {
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[]}
        resorts={resorts}
        searchParams={{ dateMode: "specific", resort: "resort-blt", checkIn: "2026-12-04" }}
      />,
    );

    expect(screen.getByText(/for check-in on Dec 4, 2026/i)).toBeInTheDocument();
    const requestUrl = new URL(screen.getByRole("link", { name: "Request These Dates" }).getAttribute("href")!, "https://hannadvc.com");
    expect(requestUrl.searchParams.get("checkIn")).toBe("2026-12-04");
    expect(requestUrl.searchParams.has("checkOut")).toBe(false);
    expect(requestUrl.searchParams.has("nights")).toBe(false);
  });

  it("offers all-month browsing when a flexible month has no results", () => {
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[]}
        resorts={resorts}
        searchParams={{ dateMode: "flexible", month: "2027-01", resort: "resort-blt" }}
      />,
    );

    expect(screen.getByText("No Ready Stays for January 2027")).toBeInTheDocument();
    const allMonthsLink = screen.getByRole("link", { name: "Explore Other Stays" });
    expect(allMonthsLink).toHaveAttribute("href", expect.stringContaining("resort=resort-blt"));
    expect(allMonthsLink.getAttribute("href")).not.toContain("month=");
    expect(screen.queryByRole("link", { name: "Request These Exact Dates" })).not.toBeInTheDocument();
    expect(screen.getByText(/We couldn't find a confirmed reservation at Bay Lake Tower for January 2027/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Sort")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Clear filters" })).toHaveLength(1);
  });

  it("shows helpful copy for flexible browsing without an available month", () => {
    render(<ReadyStaysMarketplaceClient readyStays={[]} resorts={resorts} searchParams={{ dateMode: "flexible" }} />);
    expect(screen.getByText("No Ready Stays available right now.")).toBeInTheDocument();
    expect(screen.getByText("No confirmed reservations are available right now. Explore other available stays.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Request These Exact Dates" })).not.toBeInTheDocument();
  });

  it("preserves sorting and price/points filters when inventory exists", () => {
    render(
      <ReadyStaysMarketplaceClient
        readyStays={[
          makeReadyStay("higher-points", 500, "2027-01-15", "Resort A"),
          makeReadyStay("lower-points", 100, "2027-01-10", "Resort B"),
        ]}
        resorts={resorts}
        searchParams={{ dateMode: "flexible", sort: "price_desc", price_min: "20", points_max: "500", resort: "resort-blt" }}
      />,
    );
    const sort = screen.getByLabelText("Sort") as HTMLSelectElement;
    expect(sort.value).toBe("price_desc");
    expect(screen.getAllByRole("link", { name: "View Details" }).map((link) => link.getAttribute("href"))).toEqual([
      "/ready-stays/higher-points",
      "/ready-stays/lower-points",
    ]);
    fireEvent.change(sort, { target: { value: "points_asc" } });
    expect(screen.getAllByRole("link", { name: "View Details" }).map((link) => link.getAttribute("href"))).toEqual([
      "/ready-stays/lower-points",
      "/ready-stays/higher-points",
    ]);
    const form = screen.getByLabelText("Month").closest("form")!;
    expect(new FormData(form).get("price_min")).toBe("20");
    expect(new FormData(form).get("points_max")).toBe("500");
    expect(new FormData(form).get("resort")).toBe("resort-blt");
  });

  it("keeps the same filters available in the desktop sidebar and mobile drawer", () => {
    const { container } = render(<ReadyStaysMarketplaceClient readyStays={[]} resorts={resorts} searchParams={{}} />);

    expect(container.querySelector("aside")?.className).toContain("lg:block");
    expect(screen.getByRole("button", { name: "Filters" }).className).toContain("lg:hidden");
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "I have specific dates" })).toHaveLength(2);
    expect(screen.queryByText("Holiday")).not.toBeInTheDocument();
  });
});
