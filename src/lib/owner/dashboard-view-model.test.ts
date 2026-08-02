import { describe, expect, it } from "vitest";

import type { NotificationRow, OwnerMatchRow, OwnerProfile, PayoutLedgerRow } from "@/lib/owner-data";
import {
  buildOwnerDashboardViewModel,
  type OwnerDashboardRentalRow,
} from "@/lib/owner/dashboard-view-model";

const owner: OwnerProfile = {
  id: "owner-id",
  user_id: "owner-user",
  display_name: null,
  payout_email: "owner@example.com",
  verification: "verified",
  founding_owner_bonus_cents_per_point: null,
  founding_owner_bonus_started_at: null,
  founding_owner_bonus_expires_at: null,
  founding_owner_granted_at: null,
  founding_owner_promotion_id: null,
  profile_display_name: "Helena",
  profile_full_name: "Helena Santos",
};

function rental(overrides: Partial<OwnerDashboardRentalRow>): OwnerDashboardRentalRow {
  return {
    id: overrides.id ?? "rental-1",
    owner_user_id: "owner-user",
    guest_user_id: overrides.guest_user_id ?? "guest-user",
    resort_code: overrides.resort_code ?? "BCV",
    room_type: overrides.room_type ?? "studio",
    check_in: overrides.check_in ?? "2026-10-10",
    check_out: overrides.check_out ?? "2026-10-17",
    points_required: overrides.points_required ?? 100,
    rental_amount_cents: overrides.rental_amount_cents ?? 100000,
    status: overrides.status ?? "needs_dvc_booking",
    created_at: overrides.created_at ?? "2026-01-01T00:00:00.000Z",
    rental_milestones: overrides.rental_milestones ?? [],
    match_id: overrides.match_id ?? null,
    owner_id: overrides.owner_id ?? "owner-id",
    booking_request_id: overrides.booking_request_id ?? null,
    dvc_confirmation_number: overrides.dvc_confirmation_number ?? null,
    disney_confirmation_number: overrides.disney_confirmation_number ?? null,
    booking_package: overrides.booking_package ?? null,
    lead_guest_name: overrides.lead_guest_name ?? "Private Guest",
    lead_guest_email: overrides.lead_guest_email ?? "guest@example.com",
    lead_guest_phone: overrides.lead_guest_phone ?? "555-111-2222",
    lead_guest_address: overrides.lead_guest_address ?? { line1: "Hidden" },
    party_size: overrides.party_size ?? 4,
    adults: overrides.adults ?? 2,
    youths: overrides.youths ?? 2,
    special_needs: overrides.special_needs ?? false,
    special_needs_notes: overrides.special_needs_notes ?? "Private note",
  };
}

function payout(overrides: Partial<PayoutLedgerRow>): PayoutLedgerRow {
  return {
    id: overrides.id ?? "payout-1",
    rental_id: overrides.rental_id ?? "rental-1",
    owner_user_id: "owner-user",
    stage: overrides.stage ?? 70,
    amount_cents: overrides.amount_cents ?? 0,
    status: overrides.status ?? "pending",
    eligible_at: overrides.eligible_at ?? null,
    released_at: overrides.released_at ?? null,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00.000Z",
  };
}

function match(overrides: Partial<OwnerMatchRow>): OwnerMatchRow {
  return {
    id: overrides.id ?? "match-1",
    status: overrides.status ?? "pending_owner",
    points_reserved: overrides.points_reserved ?? 120,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00.000Z",
    expires_at: overrides.expires_at ?? null,
    booking: overrides.booking ?? {
      id: "booking-1",
      check_in: "2026-10-10",
      check_out: "2026-10-17",
      total_points: 120,
      primary_room: "studio",
      primary_view: null,
      lead_guest_name: "Private Guest",
      lead_guest_email: "guest@example.com",
      lead_guest_phone: "555-222-3333",
      address_line1: "Private",
      address_line2: null,
      city: "Orlando",
      state: "FL",
      postal_code: "32830",
      country: "US",
      adults: 2,
      youths: 2,
      requires_accessibility: false,
      comments: "Private guest comments",
      deposit_due: 100,
      deposit_paid: 100,
      deposit_currency: "USD",
      primary_resort: { id: "resort-1", name: "Beach Club Villas", slug: "beach-club-villas", calculator_code: "BCV" },
    },
  };
}

function notification(overrides: Partial<NotificationRow>): NotificationRow {
  return {
    id: overrides.id ?? "notification-1",
    type: overrides.type ?? "owner",
    title: overrides.title ?? "Payout released",
    body: overrides.body ?? "Private body should not be used by activity",
    link: overrides.link ?? "/owner/payouts",
    read_at: overrides.read_at ?? null,
    created_at: overrides.created_at ?? "2026-01-02T00:00:00.000Z",
  };
}

describe("buildOwnerDashboardViewModel", () => {
  it("builds trusted metrics from payout ledger and active workflows", () => {
    const viewModel = buildOwnerDashboardViewModel({
      owner,
      memberships: [],
      rentals: [
        rental({ id: "rental-1", status: "booked", dvc_confirmation_number: "ABC123" }),
        rental({ id: "rental-2", status: "cancelled" }),
      ],
      payouts: [
        payout({ id: "payout-released", rental_id: "rental-1", status: "released", amount_cents: 70000 }),
        payout({ id: "payout-pending", rental_id: "rental-1", status: "eligible", amount_cents: 30000 }),
      ],
      notifications: [],
      matches: [match({ id: "match-declined", status: "declined" })],
      generatedAt: "2026-08-02T00:00:00.000Z",
    });

    expect(viewModel.metrics.totalEarned.valueCents).toBe(70000);
    expect(viewModel.metrics.pendingPayout.valueCents).toBe(30000);
    expect(viewModel.metrics.activeReservations.value).toBe(1);
    expect(viewModel.metrics.confirmedStays.value).toBe(1);
  });

  it("does not double-count an accepted match that already has a rental", () => {
    const viewModel = buildOwnerDashboardViewModel({
      owner,
      memberships: [],
      rentals: [rental({ id: "rental-1", match_id: "match-1", status: "needs_dvc_booking" })],
      payouts: [],
      notifications: [],
      matches: [match({ id: "match-1", status: "accepted" })],
    });

    expect(viewModel.metrics.activeReservations.value).toBe(1);
    expect(viewModel.reservationPipeline).toHaveLength(1);
    expect(viewModel.reservationPipeline[0].id).toBe("rental:rental-1");
  });

  it("creates attention items for pending matches and missing confirmations", () => {
    const viewModel = buildOwnerDashboardViewModel({
      owner,
      memberships: [],
      rentals: [
        rental({
          id: "rental-1",
          status: "approved",
          rental_milestones: [{ code: "owner_approved", status: "completed", occurred_at: null }],
        }),
      ],
      payouts: [],
      notifications: [],
      matches: [match({ id: "match-1", status: "pending_owner" })],
    });

    expect(viewModel.attentionItems.map((item) => item.sourceType)).toEqual(["match", "rental"]);
  });

  it("redacts guest contact information and admin-style notes from the view model", () => {
    const viewModel = buildOwnerDashboardViewModel({
      owner,
      memberships: [],
      rentals: [rental({ id: "rental-1", status: "booked" })],
      payouts: [payout({ id: "payout-1", status: "released", amount_cents: 10000 })],
      notifications: [notification({ title: "Safe owner-facing title" })],
      matches: [match({ id: "match-1", status: "pending_owner" })],
      pendingReadyStayTransfers: [
        {
          id: "ready-stay-1",
          bookingId: "booking-1",
          resortName: "Beach Club Villas",
          checkIn: "2026-10-10",
          checkOut: "2026-10-17",
          points: 120,
        },
      ],
    });

    const serialized = JSON.stringify(viewModel);
    expect(serialized).not.toContain("guest@example.com");
    expect(serialized).not.toContain("555-");
    expect(serialized).not.toContain("Private guest comments");
    expect(serialized).not.toContain("Hidden");
    expect(serialized).not.toContain("Private note");
  });

  it("marks unknown payout data as partial instead of showing a false total", () => {
    const viewModel = buildOwnerDashboardViewModel({
      owner,
      memberships: [],
      rentals: [],
      payouts: [payout({ id: "payout-unknown", status: "scheduled", amount_cents: 40000 })],
      notifications: [],
      matches: [],
    });

    expect(viewModel.metrics.totalEarned.state).toBe("partial");
    expect(viewModel.dataStatus.partial).toBe(true);
    expect(viewModel.dataStatus.warnings[0]).toContain("unknown status");
  });
});
