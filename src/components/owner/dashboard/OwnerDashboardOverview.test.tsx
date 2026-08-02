// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OwnerDashboardOverview from "@/components/owner/dashboard/OwnerDashboardOverview";
import type { OwnerDashboardViewModel } from "@/lib/owner/dashboard-view-model";

vi.mock("@/components/owner/shell/OwnerStatusBadge", () => ({
  default: () => <span>Verified owner</span>,
}));

const viewModel: OwnerDashboardViewModel = {
  owner: {
    displayName: "Helena",
    statusLabel: "Verified owner",
  },
  metrics: {
    totalEarned: {
      kind: "money",
      state: "available",
      valueCents: 70000,
      displayValue: "$700.00",
      helper: "1 ledger row",
    },
    pendingPayout: {
      kind: "money",
      state: "zero",
      valueCents: 0,
      displayValue: "$0.00",
      helper: "No payouts are currently pending.",
    },
    activeReservations: {
      kind: "count",
      state: "available",
      value: 1,
      displayValue: "1",
      helper: "Currently in progress",
    },
    confirmedStays: {
      kind: "count",
      state: "available",
      value: 1,
      displayValue: "1",
      helper: "Disney confirmation received",
    },
  },
  attentionItems: [],
  recentPayouts: [],
  reservationPipeline: [],
  recentActivity: [],
  dataStatus: {
    generatedAt: "2026-08-02T00:00:00.000Z",
    partial: false,
    warnings: [],
  },
};

describe("OwnerDashboardOverview", () => {
  it("renders the Phase B KPI cards and empty states", () => {
    render(<OwnerDashboardOverview viewModel={viewModel} />);

    expect(screen.getByRole("heading", { name: "Owner Earnings" })).toBeInTheDocument();
    expect(screen.getByText("Total earned")).toBeInTheDocument();
    expect(screen.getByText("Pending payout")).toBeInTheDocument();
    expect(screen.getByText("Active reservations")).toBeInTheDocument();
    expect(screen.getByText("Confirmed stays")).toBeInTheDocument();
    expect(screen.getByText("You're all caught up")).toBeInTheDocument();
    expect(screen.getByText("No payouts have been released yet.")).toBeInTheDocument();
    expect(screen.getByText("No active reservations.")).toBeInTheDocument();
  });

  it("does not render raw workflow enums", () => {
    render(<OwnerDashboardOverview viewModel={viewModel} />);

    expect(screen.queryByText("pending_owner")).not.toBeInTheDocument();
    expect(screen.queryByText("booked_pending_agreement")).not.toBeInTheDocument();
  });
});
