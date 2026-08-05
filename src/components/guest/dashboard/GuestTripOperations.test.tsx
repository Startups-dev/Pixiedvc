import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GuestTripHero from "@/components/guest/dashboard/GuestTripHero";
import GuestTripOperations from "@/components/guest/dashboard/GuestTripOperations";
import type { GuestTripHeroViewModel } from "@/lib/guest/hero-view-model";
import type { GuestTripOperationsViewModel } from "@/lib/guest/trip-operations-view-model";

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

const heroTrip: GuestTripHeroViewModel = {
  guestName: "Helena",
  tripId: "trip-1",
  tripType: "custom_request",
  resortName: "Bay Lake Tower",
  resortImageUrl: "/resort.jpg",
  resortImageAlt: "Bay Lake Tower resort",
  roomType: "Deluxe Studio",
  checkIn: "2026-10-10",
  checkOut: "2026-10-17",
  nights: 7,
  dateRangeLabel: "October 10 - October 17, 2026",
  partySummary: "2 adults",
  countdown: null,
  countdownLabel: null,
  statusLabel: "Disney confirmation pending",
  primaryAction: null,
};

const operations: GuestTripOperationsViewModel = {
  tripId: "trip-1",
  tripType: "custom_request",
  attention: {
    key: "agreement-signature",
    title: "Agreement needs your signature",
    description: "Review the rental agreement so your reservation can continue moving forward.",
    actionLabel: "Review and sign agreement",
    actionHref: "/contracts/token-1",
    priority: 2,
  },
  payment: {
    currency: "USD",
    totalCents: 250000,
    paidCents: 9900,
    remainingCents: 240100,
    nextDueCents: 240100,
    nextDueDate: null,
    statusLabel: "Payment received",
    history: [
      {
        id: "payment-1",
        amountCents: 9900,
        paidAt: "2026-01-02T00:00:00Z",
        statusLabel: "Paid",
        receiptHref: null,
      },
    ],
    action: null,
    warnings: [],
  },
  agreement: {
    statusLabel: "Ready for signature",
    signedAt: null,
    agreementHref: "/contracts/token-1",
    action: {
      label: "Review and sign agreement",
      href: "/contracts/token-1",
    },
  },
  travelers: {
    completed: false,
    statusLabel: "Partially completed",
    totalTravelers: 2,
    adults: 2,
    children: 0,
    names: ["Helena Aranha", "Chris Santos"],
    action: {
      label: "Complete traveler details",
      href: "/guest/requests/trip-1#guest-details",
    },
  },
  documents: [
    {
      id: "agreement-1",
      label: "Rental agreement",
      typeLabel: "Agreement",
      statusLabel: "Ready for signature",
      createdAt: null,
      downloadHref: "/contracts/token-1",
    },
    {
      id: "doc-1",
      label: "Disney confirmation",
      typeLabel: "Disney confirmation",
      statusLabel: "Available",
      createdAt: "2026-01-03T00:00:00Z",
      downloadHref: null,
    },
  ],
  partialDataWarnings: [],
};

describe("GuestTripOperations", () => {
  it("renders practical trip sections without creating another h1", () => {
    render(
      <>
        <GuestTripHero trip={heroTrip} />
        <GuestTripOperations operations={operations} />
      </>,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Bay Lake Tower");
    expect(screen.getByRole("heading", { name: "Cost and payments" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Agreement" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Travelers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Trip documents" })).toBeInTheDocument();
  });

  it("renders trusted values, real actions, and no raw internal labels", () => {
    const { container } = render(<GuestTripOperations operations={operations} />);

    expect(screen.getByText("$2,500.00")).toBeInTheDocument();
    expect(screen.getAllByText("$2,401.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ready for signature").length).toBeGreaterThan(0);
    const agreementLinks = screen.getAllByRole("link", { name: "Review and sign agreement" });
    expect(agreementLinks[0]).toHaveAttribute("href", "/contracts/token-1");
    expect(screen.getByRole("link", { name: "Complete traveler details" })).toHaveAttribute(
      "href",
      "/guest/requests/trip-1#guest-details",
    );
    expect(container).not.toHaveTextContent("pending_payment");
    expect(container).not.toHaveTextContent("Action needed");
    expect(container).not.toHaveTextContent("owner payout");
    expect(container).not.toHaveTextContent("platform margin");
  });

  it("renders safe empty states for unavailable payments and documents", () => {
    render(
      <GuestTripOperations
        operations={{
          ...operations,
          attention: null,
          payment: {
            ...operations.payment,
            totalCents: null,
            paidCents: null,
            remainingCents: null,
            nextDueCents: null,
            statusLabel: "Payment details are not available yet",
            history: [],
            warnings: ["Total trip cost is not available yet."],
          },
          documents: [],
        }}
      />,
    );

    expect(screen.getByText("Nothing needs your attention right now. We will keep the next important trip step here.")).toBeInTheDocument();
    expect(screen.getAllByText("Not available yet").length).toBeGreaterThan(0);
    expect(screen.getByText("No payment history is available yet.")).toBeInTheDocument();
    expect(screen.getByText("No trip documents are available yet.")).toBeInTheDocument();
  });
});
