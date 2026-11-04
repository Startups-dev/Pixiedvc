import { fireEvent, render, waitFor } from "@testing-library/react";
import { DvcCalculator } from "../src/ui/DvcCalculator";

describe("calculator date validation", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
    });
    window.history.replaceState({}, "", "/calculator");
  });

  it("keeps an automatically advanced cross-year checkout valid without a stale error", async () => {
    const { container, queryByText } = render(<DvcCalculator />);
    const [checkIn, checkOut] = container.querySelectorAll<HTMLInputElement>('input[type="date"]');

    await waitFor(() => expect(checkIn.value).not.toBe("") && expect(checkOut.value).not.toBe(""));
    fireEvent.change(checkIn, { target: { value: "2026-12-31" } });

    expect(checkIn.value).toBe("2026-12-31");
    expect(checkOut.value).toBe("2027-01-07");
    expect(checkIn.max).toBe("2027-12-30");
    expect(checkOut.min).toBe("2027-01-01");
    expect(queryByText("Select dates between today and Dec 31, 2027.")).toBeNull();
  });

  it("does not show a range error while either date field is incomplete", async () => {
    const { container, queryByText } = render(<DvcCalculator />);
    const [checkIn, checkOut] = container.querySelectorAll<HTMLInputElement>('input[type="date"]');

    await waitFor(() => expect(checkIn.value).not.toBe("") && expect(checkOut.value).not.toBe(""));
    fireEvent.change(checkIn, { target: { value: "" } });
    expect(checkIn.value).toBe("");
    expect(queryByText("Select dates between today and Dec 31, 2027.")).toBeNull();

    fireEvent.change(checkIn, { target: { value: "2026-12-31" } });
    fireEvent.change(checkOut, { target: { value: "" } });
    expect(checkOut.value).toBe("");
    expect(queryByText("Select dates between today and Dec 31, 2027.")).toBeNull();
  });
});
