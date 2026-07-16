import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PixieComposer from "@/components/pixie/PixieComposer";
import PixieHeader from "@/components/pixie/PixieHeader";
import PixieMessage from "@/components/pixie/PixieMessage";
import PixieQuickReplies from "@/components/pixie/PixieQuickReplies";
import PixieReadyStayCard from "@/components/pixie/PixieReadyStayCard";
import PixieSavePrompt from "@/components/pixie/PixieSavePrompt";
import SupportWidget from "@/components/support/SupportWidget";
import { createInitialPixieChatState } from "@/lib/pixie/client/chat-state";
import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { createEmptyPixieTripState } from "@/lib/pixie/planner-state";
import type { PixieRecommendationResult } from "@/lib/pixie/resorts/recommendation-service";
import type { PixieReadyStayMatch } from "@/lib/pixie/ready-stays/types";

const navigationMock = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMock.pathname,
}));

vi.mock("@/lib/pixie/client/analytics", () => ({
  trackPixieEvent: vi.fn(),
}));

vi.mock("@/components/support/SupportPanel", () => ({
  default: () => <div>Support panel</div>,
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

function recommendationResult(): PixieRecommendationResult {
  return {
    recommendations: [
      {
        recommendationId: "pixie-rec-bcv-studio",
        resortId: "bcv",
        resortSlug: "beach-club-villas",
        displayName: "Beach Club Villas",
        rank: 1,
        score: 90,
        eligibleRoomTypes: [],
        recommendedRoomType: {
          id: "deluxe_studio",
          displayName: "Deluxe Studio",
          calculatorRoomCode: "DELUXESTUDIO",
          standardCapacity: 4,
          maximumCapacity: 5,
          bedroomCount: 0,
          kitchenLevel: "kitchenette",
          laundryAvailability: "shared",
          calculatorSupported: true,
        },
        estimatedPoints: null,
        estimatedGuestPrice: null,
        budgetFit: "budget_context_missing",
        reasonCodes: ["near_priority_park"],
        explanationFragments: ["Close to EPCOT."],
        tradeoffs: ["Budget fit will improve after accommodation budget context is known."],
        warnings: [],
        dataQuality: ["partial"],
        pricingStatus: "not_requested",
        calculatorStatus: "not_requested",
        scoringBreakdown: [],
      },
    ],
    excludedResorts: [],
    warnings: [],
    inputSummary: { destination: "walt_disney_world", partySize: 4, budgetType: "unknown" },
    recommendationReadiness: evaluatePixieCompleteness(createEmptyPixieTripState("2026-07-15T12:00:00.000Z")),
    generatedAt: "2026-07-15T12:00:00.000Z",
    scoringVersion: "test",
    catalogVersion: "test",
    pricingVersion: "test",
    calculatorCoverage: { supportedYears: [2026] },
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
    expect(screen.getByText(/Incomplete stay/i)).toBeInTheDocument();
    expect(screen.getByText(/not a full trip match/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventory and price require recheck/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /review ready stay/i })).toHaveAttribute("href", "/ready-stays/rs1");
    expect(screen.queryByText("64")).not.toBeInTheDocument();
    expect(screen.queryByText(/owner payout/i)).not.toBeInTheDocument();
  });

  it("hides the global support widget on Pixie routes", () => {
    navigationMock.pathname = "/pixie";
    render(<SupportWidget />);

    expect(screen.queryByRole("button", { name: /open concierge support/i })).not.toBeInTheDocument();
  });

  it("keeps the global support widget available outside Pixie routes", () => {
    navigationMock.pathname = "/";
    render(<SupportWidget />);

    expect(screen.getByRole("button", { name: /open concierge support/i })).toBeInTheDocument();
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

  it("renders contextual budget quick replies that still send natural API messages", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<PixieQuickReplies nextQuestionKey="ask_budget_context" disabled={false} onSend={onSend} />);

    expect(screen.getByRole("button", { name: /accommodation budget/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /whole-trip budget/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: /whole-trip budget/i }));
    expect(onSend).toHaveBeenCalledWith("I have a whole-trip budget, not just lodging.");
  });

  it("shows recommendation quick replies after trusted recommendations exist", () => {
    const state = createInitialPixieChatState();
    render(
      <PixieQuickReplies
        state={{ ...state, recommendations: recommendationResult() }}
        nextQuestionKey="ask_budget_context"
        disabled={false}
        onSend={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: /keep pixie.s favorite/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /compare top two/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check ready stays/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });
});
