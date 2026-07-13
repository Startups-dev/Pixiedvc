import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PixieComposer from "@/components/pixie/PixieComposer";
import PixieHeader from "@/components/pixie/PixieHeader";
import PixieMessage from "@/components/pixie/PixieMessage";
import PixieReadyStayCard from "@/components/pixie/PixieReadyStayCard";
import PixieSavePrompt from "@/components/pixie/PixieSavePrompt";
import { createInitialPixieChatState } from "@/lib/pixie/client/chat-state";
import type { PixieReadyStayMatch } from "@/lib/pixie/ready-stays/types";

vi.mock("@/lib/pixie/client/analytics", () => ({
  trackPixieEvent: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} className={props.className} />
  ),
}));

function readyStayMatch(overrides: Partial<PixieReadyStayMatch> = {}): PixieReadyStayMatch {
  return {
    matchId: "pixie-ready-stay-rs1",
    listingId: "rs1",
    classification: "partial_overlap",
    rank: 1,
    score: 64,
    resortId: "akv",
    resortSlug: "animal-kingdom-villas",
    resortDisplayName: "Animal Kingdom Villas",
    subProperty: "kidani",
    roomTypeId: "deluxe_studio",
    roomDisplayName: "Deluxe Studio",
    arrivalDate: "2027-09-07",
    departureDate: "2027-09-10",
    numberOfNights: 3,
    sleeps: 4,
    points: 45,
    listingPrice: {
      pricingContext: "ready_stay_listing_price",
      totalCents: 225000,
      currency: "USD",
      estimateStatus: "listing_price",
      source: "ready_stays_public_listing",
      sourceVersion: "test",
    },
    dateMatch: {
      classification: "partial_overlap",
      listingNights: 3,
      requestedNights: 5,
      overlapNights: 3,
      withinFlexibility: false,
      sameDuration: false,
      satisfiesFullStay: false,
      satisfiesDates: false,
      requiresDateChange: true,
      requiresLengthChange: true,
      partialStayOnly: true,
      reasonCodes: ["partial_overlap_only"],
      warnings: [],
    },
    capacityMatch: {
      capacityStatus: "fits",
      requiredCapacity: 4,
      listingCapacity: 4,
      fitsParty: true,
      spareCapacity: 0,
      confidence: "verified",
      warnings: [],
    },
    budgetFit: {
      budgetStatus: "within_budget",
      budgetContext: "accommodation_only",
      budgetAmountCents: 250000,
      listingPriceCents: 225000,
      differenceCents: -25000,
      explanationCode: "within_accommodation_budget",
    },
    reasonCodes: ["partial_overlap_only", "capacity_verified", "listing_price_verified"],
    explanationFragments: ["This listing overlaps part of the requested dates."],
    warnings: ["recheck_required_before_booking"],
    dataQuality: "complete",
    inventoryStatus: "recheck_required_before_booking",
    bookingPath: "/ready-stays/rs1",
    isTestListing: false,
    ...overrides,
  };
}

describe("Pixie UI contracts", () => {
  it("renders Pixie disclosure and Disney non-affiliation language", () => {
    render(<PixieHeader state={createInitialPixieChatState()} enabled onResetClick={() => undefined} />);

    expect(screen.getByRole("heading", { name: /walt disney world planning workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/AI planning assistant inside PixieDVC/i)).toBeInTheDocument();
    expect(screen.getByText(/not Disney or an official Disney representative/i)).toBeInTheDocument();
  });

  it("composer sends on Enter and preserves Shift+Enter for new lines", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSend = vi.fn();
    render(
      <PixieComposer
        value="We know our dates"
        disabled={false}
        active={false}
        canSend
        onChange={onChange}
        onSend={onSend}
        onCancel={() => undefined}
      />,
    );

    const input = screen.getByLabelText(/tell pixie about your trip/i);
    await user.click(input);
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSend).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("renders user text as escaped text instead of HTML", () => {
    const { container } = render(
      <PixieMessage
        message={{
          id: "msg",
          role: "user",
          content: '<img src=x onerror="alert(1)">',
          createdAt: "2026-07-12T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText(/<img src=x/i)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("Ready Stay cards clearly label partial overlaps and recheck warnings", () => {
    render(<PixieReadyStayCard match={readyStayMatch()} />);

    expect(screen.getAllByText(/partial overlap/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/not a full trip match/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventory and price require recheck/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view ready stay/i })).toHaveAttribute("href", "/ready-stays/rs1");
    expect(screen.queryByText(/owner payout/i)).not.toBeInTheDocument();
  });

  it("save prompt does not claim server-side trip persistence", () => {
    const state = createInitialPixieChatState();
    const highValueState = {
      ...state,
      completeness: { ...state.completeness, score: 40 },
    };
    render(<PixieSavePrompt state={highValueState} onShown={() => undefined} />);

    expect(screen.getByText(/server-side saved trips come in a later phase/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in to continue/i })).toHaveAttribute("href", "/login?mode=signup&next=%2Fpixie&intent=pixie");
  });
});
