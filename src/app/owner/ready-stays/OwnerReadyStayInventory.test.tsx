// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OwnerReadyStayInventory from "./OwnerReadyStayInventory";
import type { OwnerReadyStayListItem } from "@/lib/owner/secondary-subpages";

function readyStay(overrides: Partial<OwnerReadyStayListItem> = {}): OwnerReadyStayListItem {
  return {
    id: overrides.id ?? "stay-1",
    resortLabel: overrides.resortLabel ?? "Bay Lake Tower",
    roomLabel: overrides.roomLabel ?? "Deluxe Studio - Lake View",
    dateLabel: overrides.dateLabel ?? "Sep 1, 2026 - Sep 3, 2026",
    pointsLabel: overrides.pointsLabel ?? "32 pts",
    ownerRateLabel: overrides.ownerRateLabel ?? "$23",
    estimatedOwnerPayoutLabel: overrides.estimatedOwnerPayoutLabel ?? "$736",
    statusLabel: overrides.statusLabel ?? "Active",
    displayStatusLabel: overrides.displayStatusLabel ?? "LIVE",
    displayStatusDescription: overrides.displayStatusDescription ?? "Visible to guests",
    displayStatusTone: overrides.displayStatusTone ?? "live",
    proofLabel: overrides.proofLabel ?? "Received",
    updatedAtLabel: overrides.updatedAtLabel ?? "Aug 20, 2026",
    group: overrides.group ?? "active",
    detailHref: overrides.detailHref ?? "/owner/ready-stays/stay-1",
    imageUrl:
      overrides.imageUrl ??
      "https://hannadvc.test/storage/v1/object/public/resorts/bay-lake-tower/BTC1.png",
    imageAlt: overrides.imageAlt ?? "Bay Lake Tower resort",
  };
}

describe("OwnerReadyStayInventory", () => {
  it("renders active Ready Stays as visual reservation cards instead of a primary table", () => {
    render(
      <OwnerReadyStayInventory
        items={[readyStay()]}
        activeCount={1}
        pendingReviewCount={0}
        potentialPayoutLabel="$736"
      />,
    );

    expect(screen.getByRole("heading", { name: "Your Ready Stays" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+ List a Ready Stay" })).toHaveAttribute(
      "href",
      "/owner/dashboard?tab=listings&mode=add",
    );
    expect(screen.getByText("Bay Lake Tower")).toBeInTheDocument();
    expect(screen.getByText("Deluxe Studio - Lake View")).toBeInTheDocument();
    expect(screen.getByText("Sep 1, 2026 - Sep 3, 2026")).toBeInTheDocument();
    expect(screen.getByText("32 pts")).toBeInTheDocument();
    expect(screen.getAllByText("$736")).toHaveLength(2);
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("Visible to guests")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bay Lake Tower resort" })).toHaveAttribute(
      "src",
      expect.stringContaining("/storage/v1/object/public/resorts/bay-lake-tower/BTC1.png"),
    );
    expect(screen.getByRole("link", { name: "View listing" })).toHaveAttribute(
      "href",
      "/owner/ready-stays/stay-1",
    );
    expect(screen.getByRole("link", { name: "Manage" })).toHaveAttribute("href", "/owner/ready-stays/stay-1");

    const primaryInventory = screen.getByTestId("ready-stay-card-list");
    expect(within(primaryInventory).queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders IN REVIEW for submitted draft listings", () => {
    render(
      <OwnerReadyStayInventory
        items={[
          readyStay({
            id: "stay-review",
            displayStatusLabel: "IN REVIEW",
            displayStatusDescription: "We're verifying your reservation.",
            displayStatusTone: "review",
            group: "action_required",
          }),
        ]}
        activeCount={0}
        pendingReviewCount={1}
        potentialPayoutLabel="$736"
      />,
    );

    expect(screen.getByText("IN REVIEW")).toBeInTheDocument();
    expect(screen.getByText("We're verifying your reservation.")).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders the zero-listing empty state with the listing CTA", () => {
    render(
      <OwnerReadyStayInventory
        items={[]}
        activeCount={0}
        pendingReviewCount={0}
        potentialPayoutLabel="Unavailable"
      />,
    );

    expect(screen.getByText("No Ready Stays yet")).toBeInTheDocument();
    expect(screen.getByText("Have a confirmed DVC reservation you no longer need? List it for Hanna review.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Disney Vacation Club resort" })).toHaveAttribute(
      "src",
      expect.stringContaining("/storage/v1/object/public/resorts/saratoga-springs-resort/SSR1.png"),
    );
    expect(screen.getAllByRole("link", { name: "+ List a Ready Stay" })).toHaveLength(2);
  });
});
