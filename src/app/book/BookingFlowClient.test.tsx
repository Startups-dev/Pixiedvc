import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BookingFlowClient from "./BookingFlowClient";

const { push, getSession } = vi.hoisted(() => ({ push: vi.fn(), getSession: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/useReferral", () => ({ useReferral: () => ({ ref: null }) }));
vi.mock("@/lib/supabase-browser", () => ({ supabaseBrowser: () => ({ auth: { getSession } }) }));
vi.mock("../../../packages/booking-form/src/steps/GuestInfo", async () => {
  const { useFormContext } = await import("react-hook-form");
  return { GuestInfo: ({ onNext }: { onNext: () => void }) => {
    const { register } = useFormContext();
    return <div>
      <input aria-label="Room selection" {...register("trip.villaType")} />
      <input aria-label="View selection" {...register("trip.viewType")} />
      <button onClick={onNext}>Continue guest information</button>
    </div>;
  } };
});
vi.mock("../../../packages/booking-form/src/steps/AgreementAndPayment", async () => {
  const { useFormContext } = await import("react-hook-form");
  return { AgreementAndPayment: ({ onSubmit, onTestSubmit }: {
    onSubmit: () => void; onTestSubmit?: () => void;
  }) => {
    const { setValue } = useFormContext();
    return <div>
      {onTestSubmit ? <button onClick={onTestSubmit}>Complete test request</button> : null}
      <button onClick={() => {
        setValue("agreement.acceptTerms", true);
        setValue("agreement.authorizeDeposit", true);
        setValue("agreement.signedName", "Test Guest");
        onSubmit();
      }}>Place deposit</button>
    </div>;
  } };
});

const prefill = {
  resortId: "UNKNOWN", resortName: "DVC Resort", villaType: "Villa", viewType: "",
  checkIn: "", checkOut: "", points: 0, estCash: 0,
};
const guest = {
  leadTitle: "Mr." as const, leadFirstName: "Test", leadLastName: "Guest",
  email: "guest@example.com", phone: "555-0100", address: "1 Main St",
  city: "Orlando", region: "FL", postalCode: "32830", country: "US",
};
const fetchMock = vi.fn();
let createResponse: { status: number; body: Record<string, unknown> };

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  getSession.mockResolvedValue({ data: { session: { user: { id: "test-guest" } } } });
  createResponse = { status: 200, body: { bookingId: "test-booking" } };
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/booking/test-eligibility") return Response.json({ eligible: true });
    if (url === "/api/booking/create") return Response.json(createResponse.body, { status: createResponse.status });
    if (url === "/api/booking/test-complete") return Response.json({ ok: true });
    if (url === "/api/booking/deposit") return Response.json({ url: "https://checkout.example.test/session" });
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("requestAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

async function openQuote(quote: Record<string, unknown> = {}) {
  window.localStorage.setItem("pixiedvc:quote:validation-test", JSON.stringify({
    quote: {
      resortCode: "RVA", resortName: "Disney's Riviera Resort",
      villaType: "Grand Villa", viewType: "Preferred View", room: "GRANDVILLA", view: "P",
      checkIn: "2026-12-10", checkOut: "2026-12-24", points: 1700, totalUSD: 40800,
      ...quote,
    },
  }));
  render(<BookingFlowClient
    prefill={prefill}
    resorts={[
      { id: "resort-rva", slug: "riviera-resort", name: "Disney's Riviera Resort" },
      { id: "resort-pvb", slug: "polynesian-villas", name: "Polynesian Villas" },
    ]}
    quoteToken="validation-test" startAtGuestInfo guestDefaults={guest}
  />);
  await screen.findByRole("button", { name: "Continue guest information" });
}

async function submitTest() {
  fireEvent.click(screen.getByRole("button", { name: "Continue guest information" }));
  fireEvent.click(await screen.findByRole("button", { name: "Complete test request" }));
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === "/api/booking/create")).toBe(true));
}

function submittedBooking() {
  const request = fetchMock.mock.calls.find(([url]) => url === "/api/booking/create");
  return JSON.parse(request?.[1].body ?? "{}");
}

describe("calculator quote accommodation identity", () => {
  it("keeps Riviera labels visible while submitting GRANDVILLA/P through the no-charge path", async () => {
    await openQuote();
    expect(screen.getByLabelText("Room selection")).toHaveValue("Grand Villa");
    expect(screen.getByLabelText("View selection")).toHaveValue("Preferred View");
    await submitTest();

    expect(submittedBooking()).toMatchObject({
      trip: { villaType: "GRANDVILLA", viewType: "P" }, testBooking: true, depositAmount: 99,
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/guest?booking=test-booking"));
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/booking/deposit")).toBe(false);
  });

  it.each(["STUDIO", "DELUXESTUDIO"])("preserves PVB %s even when display labels are identical", async (room) => {
    await openQuote({
      resortCode: "PVB", resortName: "Polynesian Villas", villaType: "Deluxe Studio", room,
      viewType: "Resort View", view: "R",
    });
    await submitTest();
    expect(submittedBooking().trip).toMatchObject({ villaType: room, viewType: "R" });
  });

  it("leaves legacy label-only quotes for server resolution", async () => {
    await openQuote({ room: undefined, view: undefined });
    await submitTest();
    expect(submittedBooking().trip).toMatchObject({ villaType: "Grand Villa", viewType: "Preferred View" });
  });

  it("does not apply stale quote codes after a selection is edited", async () => {
    await openQuote();
    fireEvent.change(screen.getByLabelText("Room selection"), { target: { value: "Deluxe Studio" } });
    fireEvent.change(screen.getByLabelText("View selection"), { target: { value: "Standard View" } });
    await submitTest();
    expect(submittedBooking().trip).toMatchObject({ villaType: "Deluxe Studio", viewType: "Standard View" });
  });

  it("shows the specific accommodation rejection on the deposit step", async () => {
    const message = "The selected room and view are not a valid combination for this resort. Return to the calculator and choose an available room category.";
    createResponse = { status: 422, body: {
      error: message, step: "trip", fieldErrors: { "trip.viewType": message },
    } };
    await openQuote();
    await submitTest();

    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.queryByText(/Please complete required fields/)).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/booking/test-complete")).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/booking/deposit")).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("preserves the regular Stripe path and submits the same canonical identity", async () => {
    await openQuote();
    fireEvent.click(screen.getByRole("button", { name: "Continue guest information" }));
    fireEvent.click(await screen.findByRole("button", { name: "Place deposit" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === "/api/booking/deposit")).toBe(true));
    expect(submittedBooking()).toMatchObject({
      trip: { villaType: "GRANDVILLA", viewType: "P" }, testBooking: false, depositAmount: 99,
    });
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/booking/test-complete")).toBe(false);
  });
});
