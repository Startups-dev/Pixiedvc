// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OwnerReservationForm from "./OwnerReservationForm";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

function makeJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OwnerReservationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/owner/points-quote")) {
        return makeJsonResponse({
          total_points: 84,
          total_nights: 2,
          nights: [
            { night: "2026-12-24", points: 42 },
            { night: "2026-12-25", points: 42 },
          ],
        });
      }

      if (url.includes("/api/owner/rentals")) {
        return makeJsonResponse({ rentalId: "rental-1" });
      }

      return makeJsonResponse({});
    }) as unknown as typeof fetch;
  });

  it("auto-fills points from points-quote when fields are selected", async () => {
    const user = userEvent.setup();

    render(
      <OwnerReservationForm
        resorts={[{ id: "resort-1", name: "Grand Floridian", calculator_code: "VGF" }]}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/Resort/i), "resort-1");
    await user.selectOptions(screen.getByLabelText(/Room type/i), "Studio");
    await user.type(screen.getByLabelText(/Check-in/i), "2026-12-24");
    await user.type(screen.getByLabelText(/Check-out/i), "2026-12-26");

    await waitFor(() => {
      expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("84");
    });
  });

  it("does not overwrite manually edited points and allows use calculated points", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/owner/points-quote")) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        if (body.check_out === "2026-12-27") {
          return makeJsonResponse({
            total_points: 126,
            total_nights: 3,
            nights: [
              { night: "2026-12-24", points: 42 },
              { night: "2026-12-25", points: 42 },
              { night: "2026-12-26", points: 42 },
            ],
          });
        }

        return makeJsonResponse({
          total_points: 84,
          total_nights: 2,
          nights: [
            { night: "2026-12-24", points: 42 },
            { night: "2026-12-25", points: 42 },
          ],
        });
      }

      if (url.includes("/api/owner/rentals")) {
        return makeJsonResponse({ rentalId: "rental-1" });
      }

      return makeJsonResponse({});
    }) as unknown as typeof fetch;

    render(
      <OwnerReservationForm
        resorts={[{ id: "resort-1", name: "Grand Floridian", calculator_code: "VGF" }]}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/Resort/i), "resort-1");
    await user.selectOptions(screen.getByLabelText(/Room type/i), "Studio");
    await user.type(screen.getByLabelText(/Check-in/i), "2026-12-24");
    await user.type(screen.getByLabelText(/Check-out/i), "2026-12-26");

    await waitFor(() => {
      expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("84");
    });

    const pointsInput = screen.getByLabelText(/^Points/i);
    fireEvent.change(pointsInput, { target: { value: "90" } });

    const checkOutInput = screen.getByLabelText(/Check-out/i);
    await user.clear(checkOutInput);
    await user.type(checkOutInput, "2026-12-27");

    await waitFor(() => {
      expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("90");
    });

    await user.click(screen.getByRole("button", { name: /Use calculated points \(126\)/i }));

    expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("126");
  });

  it("blocks submit when owner payout would put guest price above cap", async () => {
    const user = userEvent.setup();

    render(
      <OwnerReservationForm
        resorts={[{ id: "resort-1", name: "Grand Floridian", calculator_code: "VGF" }]}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/Resort/i), "resort-1");
    await user.selectOptions(screen.getByLabelText(/Room type/i), "Studio");
    await user.type(screen.getByLabelText(/Check-in/i), "2026-09-10");
    await user.type(screen.getByLabelText(/Check-out/i), "2026-09-12");

    const payoutInput = screen.getByLabelText(/Set your payout/i);
    await user.clear(payoutInput);
    await user.type(payoutInput, "30");

    await user.click(screen.getByRole("button", { name: /Save Reservation/i }));

    const calledUrls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([input]) =>
      typeof input === "string" ? input : input.toString(),
    );

    expect(calledUrls.some((url) => url.includes("/api/owner/rentals"))).toBe(false);
    const errors = await screen.findAllByText(/Too high - the maximum allowed is/i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("updates submit text based on confirmation number", async () => {
    const user = userEvent.setup();

    render(
      <OwnerReservationForm
        resorts={[{ id: "resort-1", name: "Grand Floridian", calculator_code: "VGF" }]}
      />,
    );

    expect(screen.getByRole("button", { name: /Save Reservation/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Confirmation number/i), "ABC123");

    expect(screen.getByRole("button", { name: /Save & List Ready Stay/i })).toBeInTheDocument();
  });
});
