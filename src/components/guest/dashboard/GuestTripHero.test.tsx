import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GuestTripHero from "@/components/guest/dashboard/GuestTripHero";
import GuestTopBar from "@/components/guest/shell/GuestTopBar";
import { ConfirmationCopy } from "@/app/my-trip/[tripId]/TripDetailsClient";
import type { GuestTripHeroViewModel } from "@/lib/guest/hero-view-model";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    unoptimized,
  }: {
    src: string;
    alt: string;
    className?: string;
    unoptimized?: boolean;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} data-unoptimized={unoptimized ? "true" : undefined} />
  ),
}));

const heroTrip: GuestTripHeroViewModel = {
  guestName: "Helena",
  tripId: "trip-1",
  tripType: "custom_request",
  resortName: "Beach Club Villas",
  resortImageUrl:
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/beach-club-villa/BCV2.png",
  resortImageAlt: "Beach Club Villas resort",
  roomType: "Deluxe Studio",
  checkIn: "2026-10-10",
  checkOut: "2026-10-17",
  nights: 7,
  dateRangeLabel: "October 10 - October 17, 2026",
  partySummary: "2 adults · 2 children",
  countdown: {
    value: "63 days",
    context: "until check-in",
    accessibleLabel: "63 days until check-in",
  },
  countdownLabel: "63 days until check-in",
  statusLabel: "Your reservation is taking shape",
  primaryAction: null,
};

describe("GuestTripHero", () => {
  it("renders the guest hero with one h1 and trusted trip details", () => {
    render(<GuestTripHero trip={heroTrip} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Beach Club Villas",
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Welcome back, Helena.")).toBeInTheDocument();
    expect(screen.getByText("October 10 - October 17, 2026")).toBeInTheDocument();
    expect(screen.getByText("7 nights · Deluxe Studio · 2 adults · 2 children")).toBeInTheDocument();
    expect(screen.getByText("63 days")).toBeInTheDocument();
    expect(screen.getByText("until check-in")).toBeInTheDocument();
    expect(screen.getByLabelText("63 days until check-in")).toBeInTheDocument();
    expect(screen.getByAltText("Beach Club Villas resort")).toHaveAttribute("data-unoptimized", "true");
  });

  it("does not render raw status enums or owner financial language", () => {
    const { container } = render(<GuestTripHero trip={heroTrip} />);

    expect(container).not.toHaveTextContent("pending_owner");
    expect(container).not.toHaveTextContent("owner payout");
    expect(container).not.toHaveTextContent("platform margin");
  });

  it("renders the primary action only when trusted", () => {
    const { rerender } = render(<GuestTripHero trip={heroTrip} />);
    expect(screen.queryByRole("link", { name: "Review details" })).not.toBeInTheDocument();

    rerender(
      <GuestTripHero
        trip={{
          ...heroTrip,
          primaryAction: {
            label: "Link your reservation",
            href: "/guides/link-to-disney-experience",
          },
        }}
      />,
    );
    expect(screen.getByRole("link", { name: "Link your reservation" })).toHaveAttribute(
      "href",
      "/guides/link-to-disney-experience",
    );
  });

  it("keeps reduced-motion-safe hero motion classes", () => {
    const { container } = render(<GuestTripHero trip={heroTrip} />);

    expect(container.querySelector(".motion-safe\\:animate-\\[guest-image-settle_900ms_ease-out_both\\]")).toBeTruthy();
  });
});

describe("ConfirmationCopy", () => {
  it("renders available confirmation numbers as copyable reservation text", () => {
    render(<ConfirmationCopy confirmationNumber="ABC123" />);

    expect(screen.getByRole("button", { name: "Copy confirmation number" })).toHaveTextContent("ABC123");
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("does not render a copy action when confirmation is pending", () => {
    render(<ConfirmationCopy confirmationNumber={null} />);

    expect(screen.getByRole("button", { name: "Pending" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });
});

describe("GuestTopBar", () => {
  it("renders real navigation links without placeholder routes", () => {
    render(<GuestTopBar currentTripId="trip-1" trips={[{ id: "trip-1", resortName: "Beach Club Villas", dateRangeLabel: "October 2026", href: "/my-trip/trip-1" }]} />);

    expect(screen.getByRole("navigation", { name: "Guest trip navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /HANNA DVC/i })).toHaveAttribute("href", "/my-trip");
    expect(screen.getByRole("link", { name: "Plan with Hara" })).toHaveAttribute("href", "/hara");
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/support");
    expect(screen.queryByRole("link", { name: "My Vacation" })).not.toBeInTheDocument();
    expect(screen.queryByText("Payments")).not.toBeInTheDocument();
    expect(screen.queryByText("Documents")).not.toBeInTheDocument();
  });

  it("shows the trip switcher only when multiple trips exist", () => {
    const { rerender } = render(
      <GuestTopBar
        currentTripId="trip-1"
        trips={[{ id: "trip-1", resortName: "Beach Club Villas", dateRangeLabel: "October 2026", href: "/my-trip/trip-1" }]}
      />,
    );
    expect(screen.queryByText("Your trips")).not.toBeInTheDocument();

    rerender(
      <GuestTopBar
        currentTripId="trip-1"
        trips={[
          { id: "trip-1", resortName: "Beach Club Villas", dateRangeLabel: "October 2026", href: "/my-trip/trip-1" },
          { id: "trip-2", resortName: "Riviera Resort", dateRangeLabel: "December 2026", href: "/my-trip/trip-2" },
        ]}
      />,
    );

    expect(screen.getByText("Your trips")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Riviera Resort/ })).toHaveAttribute(
      "href",
      "/my-trip/trip-2",
    );
  });
});
