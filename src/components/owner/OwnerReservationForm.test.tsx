// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  dvcAccommodationIdentityKey,
  getDvcAccommodationOptions,
} from "../../../packages/pixiedvc-calculator/src/engine/accommodations";
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

function accommodationKey(resortCode: string, roomCode: string, viewCode: string) {
  const option = getDvcAccommodationOptions(resortCode).find(
    (item) => item.roomCode === roomCode && item.viewCode === viewCode,
  );
  if (!option) throw new Error(`Missing ${resortCode} ${roomCode}/${viewCode} option.`);
  return dvcAccommodationIdentityKey(option);
}

function setDates(checkIn: string, checkOut: string) {
  fireEvent.change(screen.getByLabelText(/Check-in/i), { target: { value: checkIn } });
  fireEvent.change(screen.getByLabelText(/Check-out/i), { target: { value: checkOut } });
}

const RESORTS = [
  { id: "blt-id", name: "Bay Lake Tower", calculator_code: "BLT" },
  { id: "bwv-id", name: "BoardWalk Villas", calculator_code: "BWV" },
  { id: "bcv-id", name: "Beach Club Villas", calculator_code: "BCV" },
  { id: "pvb-id", name: "Polynesian Villas", calculator_code: "PVB" },
];

describe("OwnerReservationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/owner/points-quote")) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const byView: Record<string, number> = { S: 26, L: 32, T: 36 };
        const totalPoints =
          body.resort_code === "BLT"
            ? byView[String(body.view_code)] ?? 84
            : body.resort_code === "BWV" && body.room_code === "STUDIO" && body.view_code === "P"
              ? 14
              : 84;
        return makeJsonResponse({
          total_points: totalPoints,
          total_nights: 2,
          nights: [
            { night: "2026-09-01", points: Math.floor(totalPoints / 2) },
            { night: "2026-09-02", points: Math.ceil(totalPoints / 2) },
          ],
        });
      }

      if (url.includes("/api/owner/rentals")) {
        return makeJsonResponse({ rentalId: "rental-1" });
      }

      return makeJsonResponse({});
    }) as unknown as typeof fetch;
  });

  it("shows exact BLT accommodation options instead of generic Studio", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    await user.selectOptions(screen.getByLabelText(/Resort/i), "blt-id");

    expect(screen.getByRole("option", { name: "Deluxe Studio - Standard View" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Deluxe Studio - Lake View" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Deluxe Studio - Theme Park View" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^Studio$/i })).not.toBeInTheDocument();
  });

  it("sends exact BLT Studio Lake View identity and populates 32 points", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    await user.selectOptions(screen.getByLabelText(/Resort/i), "blt-id");
    await user.selectOptions(screen.getByLabelText(/Accommodation/i), accommodationKey("BLT", "STUDIO", "L"));
    setDates("2026-09-01", "2026-09-03");

    await waitFor(() => {
      expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("32");
    });

    const pointsQuoteCall = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter(([input]) => String(input).includes("/api/owner/points-quote"))
      .at(-1);
    expect(pointsQuoteCall).toBeTruthy();
    expect(JSON.parse(String(pointsQuoteCall?.[1]?.body))).toEqual({
      resort_code: "BLT",
      room_code: "STUDIO",
      view_code: "L",
      check_in: "2026-09-01",
      check_out: "2026-09-03",
    });
  });

  it("clears an incompatible accommodation when resort changes", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    const accommodationSelect = screen.getByLabelText(/Accommodation/i) as HTMLSelectElement;
    await user.selectOptions(screen.getByLabelText(/Resort/i), "blt-id");
    await user.selectOptions(accommodationSelect, accommodationKey("BLT", "STUDIO", "L"));
    expect(accommodationSelect.value).toBe(accommodationKey("BLT", "STUDIO", "L"));

    await user.selectOptions(screen.getByLabelText(/Resort/i), "bcv-id");
    expect(accommodationSelect.value).toBe("");
  });

  it("keeps PVB studio-like calculator room codes as distinct options", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    await user.selectOptions(screen.getByLabelText(/Resort/i), "pvb-id");

    const optionLabels = screen
      .getAllByRole("option")
      .map((option) => option.textContent ?? "")
      .filter((label) => /Studio/i.test(label));

    expect(optionLabels).toContain("Duo Studio - Resort View");
    expect(optionLabels).toContain("Duo Studio - Preferred View");
    expect(optionLabels).toContain("Deluxe Studio - Theme Park View");
  });

  it("supports a single-category accommodation normally", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    await user.selectOptions(screen.getByLabelText(/Resort/i), "bcv-id");

    expect(screen.getByRole("option", { name: "Deluxe Studio - Standard" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/Accommodation/i), accommodationKey("BCV", "STUDIO", "S"));
    setDates("2026-09-01", "2026-09-03");

    await waitFor(() => {
      expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("84");
    });
  });

  it("does not request a quote before exact accommodation is selected", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    await user.selectOptions(screen.getByLabelText(/Resort/i), "blt-id");
    setDates("2026-09-01", "2026-09-03");

    const calledUrls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([input]) => String(input));
    expect(calledUrls.some((url) => url.includes("/api/owner/points-quote"))).toBe(false);
  });

  it("submits the selected accommodation display label as legacy room_type", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    await user.selectOptions(screen.getByLabelText(/Resort/i), "blt-id");
    await user.selectOptions(screen.getByLabelText(/Accommodation/i), accommodationKey("BLT", "STUDIO", "L"));
    setDates("2026-09-01", "2026-09-03");
    await user.clear(screen.getByLabelText(/Set your payout/i));
    await user.type(screen.getByLabelText(/Set your payout/i), "10");

    await waitFor(() => {
      expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("32");
    });

    await user.click(screen.getByRole("button", { name: /Save Reservation/i }));

    await waitFor(() => {
      const rentalsCall = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([input]) =>
        String(input).includes("/api/owner/rentals"),
      );
      expect(rentalsCall).toBeTruthy();
      expect(JSON.parse(String(rentalsCall?.[1]?.body))).toMatchObject({
        room_type: "Deluxe Studio - Lake View",
        calculator_room_code: "STUDIO",
        calculator_view_code: "L",
      });
    });
  });

  it("sends the exact BWV Boardwalk/Preferred Sept 4-5 rental payload", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    await user.selectOptions(screen.getByLabelText(/Resort/i), "bwv-id");
    await user.selectOptions(screen.getByLabelText(/Accommodation/i), accommodationKey("BWV", "STUDIO", "P"));
    setDates("2026-09-04", "2026-09-05");
    await user.clear(screen.getByLabelText(/Set your payout/i));
    await user.type(screen.getByLabelText(/Set your payout/i), "22");

    await waitFor(() => {
      expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("14");
    });

    await user.click(screen.getByRole("button", { name: /Save Reservation/i }));

    await waitFor(() => {
      const rentalsCall = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(([input]) =>
        String(input).includes("/api/owner/rentals"),
      );
      expect(rentalsCall).toBeTruthy();
      expect(JSON.parse(String(rentalsCall?.[1]?.body))).toEqual({
        resort_id: "bwv-id",
        check_in: "2026-09-04",
        check_out: "2026-09-05",
        room_type: "Deluxe Studio - Boardwalk/Preferred View",
        calculator_room_code: "STUDIO",
        calculator_view_code: "P",
        points: 14,
        confirmation_number: null,
        confirmation_uploaded: false,
      });
    });
  });

  it("does not persist a Ready Stay submission when confirmation proof is missing", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    await user.selectOptions(screen.getByLabelText(/Resort/i), "bwv-id");
    await user.selectOptions(screen.getByLabelText(/Accommodation/i), accommodationKey("BWV", "STUDIO", "P"));
    setDates("2026-09-04", "2026-09-05");
    await user.clear(screen.getByLabelText(/Set your payout/i));
    await user.type(screen.getByLabelText(/Set your payout/i), "22");
    await user.type(screen.getByLabelText(/Confirmation number/i), "ABC123");

    await user.click(screen.getByRole("button", { name: /Submit Ready Stay/i }));

    expect(await screen.findByText("Upload reservation proof before submitting this Ready Stay.")).toBeInTheDocument();
    const calledUrls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([input]) =>
      String(input),
    );
    expect(calledUrls.some((url) => url.includes("/api/owner/rentals"))).toBe(false);
    expect(calledUrls.some((url) => url.includes("/api/owner/ready-stays"))).toBe(false);
  });

  it("does not overwrite manually edited points and allows use calculated points", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url.includes("/api/owner/points-quote")) {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        if (body.check_out === "2026-09-04") {
          return makeJsonResponse({
            total_points: 126,
            total_nights: 3,
            nights: [
              { night: "2026-09-01", points: 42 },
              { night: "2026-09-02", points: 42 },
              { night: "2026-09-03", points: 42 },
            ],
          });
        }

        return makeJsonResponse({
          total_points: 84,
          total_nights: 2,
          nights: [
            { night: "2026-09-01", points: 42 },
            { night: "2026-09-02", points: 42 },
          ],
        });
      }

      if (url.includes("/api/owner/rentals")) {
        return makeJsonResponse({ rentalId: "rental-1" });
      }

      return makeJsonResponse({});
    }) as unknown as typeof fetch;

    render(<OwnerReservationForm resorts={RESORTS} />);

    await user.selectOptions(screen.getByLabelText(/Resort/i), "bcv-id");
    await user.selectOptions(screen.getByLabelText(/Accommodation/i), accommodationKey("BCV", "STUDIO", "S"));
    setDates("2026-09-01", "2026-09-03");

    await waitFor(() => {
      expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("84");
    });

    const pointsInput = screen.getByLabelText(/^Points/i);
    fireEvent.change(pointsInput, { target: { value: "90" } });

    fireEvent.change(screen.getByLabelText(/Check-out/i), { target: { value: "2026-09-04" } });

    await waitFor(() => {
      expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("90");
    });

    await user.click(screen.getByRole("button", { name: /Use calculated points \(126\)/i }));

    expect((screen.getByLabelText(/^Points/i) as HTMLInputElement).value).toBe("126");
  });

  it("blocks submit when owner payout would put guest price above cap", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    await user.selectOptions(screen.getByLabelText(/Resort/i), "bcv-id");
    await user.selectOptions(screen.getByLabelText(/Accommodation/i), accommodationKey("BCV", "STUDIO", "S"));
    setDates("2026-09-10", "2026-09-12");

    const payoutInput = screen.getByLabelText(/Set your payout/i);
    await user.clear(payoutInput);
    await user.type(payoutInput, "30");

    await user.click(screen.getByRole("button", { name: /Save Reservation/i }));

    const calledUrls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([input]) =>
      String(input),
    );

    expect(calledUrls.some((url) => url.includes("/api/owner/rentals"))).toBe(false);
    const errors = await screen.findAllByText(/Too high - the maximum allowed is/i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("updates submit text based on confirmation number", async () => {
    const user = userEvent.setup();

    render(<OwnerReservationForm resorts={RESORTS} />);

    expect(screen.getByRole("button", { name: /Save Reservation/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Confirmation number/i), "ABC123");

    expect(screen.getByRole("button", { name: /Submit Ready Stay/i })).toBeInTheDocument();
  });
});
