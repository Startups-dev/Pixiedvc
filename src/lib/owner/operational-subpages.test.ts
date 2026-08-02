import { describe, expect, it } from "vitest";

import type { OwnerMatchRow, PayoutLedgerRow, RentalRow } from "@/lib/owner-data";
import {
  buildOwnerMatchListItems,
  buildOwnerPayoutListItems,
  buildOwnerRentalListItems,
  filterOwnerMatchItems,
  filterOwnerPayoutItems,
  filterOwnerRentalItems,
  getOwnerRentalFilterFromStatus,
} from "@/lib/owner/operational-subpages";

function payout(overrides: Partial<PayoutLedgerRow>): PayoutLedgerRow {
  return {
    id: overrides.id ?? "payout-1",
    rental_id: overrides.rental_id ?? "rental-1",
    owner_user_id: overrides.owner_user_id ?? "owner-user",
    stage: overrides.stage ?? 70,
    amount_cents: overrides.amount_cents ?? 12345,
    status: overrides.status ?? "pending",
    eligible_at: overrides.eligible_at ?? "2026-08-01T00:00:00.000Z",
    released_at: overrides.released_at ?? null,
    created_at: overrides.created_at ?? "2026-07-01T00:00:00.000Z",
  };
}

function rental(overrides: Partial<RentalRow>): RentalRow {
  return {
    id: overrides.id ?? "rental-1",
    owner_user_id: "owner-user",
    guest_user_id: overrides.guest_user_id ?? "guest-user",
    resort_code: overrides.resort_code ?? "BCV",
    room_type: overrides.room_type ?? "studio",
    check_in: overrides.check_in ?? "2026-10-10",
    check_out: overrides.check_out ?? "2026-10-17",
    points_required: overrides.points_required ?? 120,
    rental_amount_cents: overrides.rental_amount_cents ?? 100000,
    status: overrides.status ?? "needs_dvc_booking",
    created_at: overrides.created_at ?? "2026-07-01T00:00:00.000Z",
    booking_package: overrides.booking_package ?? null,
    lead_guest_name: overrides.lead_guest_name ?? "Private Guest",
    lead_guest_email: overrides.lead_guest_email ?? "guest@example.com",
    lead_guest_phone: overrides.lead_guest_phone ?? "555-111-2222",
    lead_guest_address: overrides.lead_guest_address ?? { line1: "Hidden" },
    party_size: overrides.party_size ?? 4,
    adults: overrides.adults ?? 2,
    youths: overrides.youths ?? 2,
    special_needs: overrides.special_needs ?? true,
    special_needs_notes: overrides.special_needs_notes ?? "Private accessibility note",
    rental_milestones: overrides.rental_milestones ?? [],
  };
}

function match(overrides: Partial<OwnerMatchRow>): OwnerMatchRow {
  return {
    id: overrides.id ?? "match-1",
    status: overrides.status ?? "pending_owner",
    points_reserved: overrides.points_reserved ?? 120,
    created_at: overrides.created_at ?? "2026-07-01T00:00:00.000Z",
    expires_at: overrides.expires_at ?? "2026-07-03T00:00:00.000Z",
    rental_id: overrides.rental_id ?? null,
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
      requires_accessibility: true,
      comments: "Private guest comments",
      deposit_due: 100,
      deposit_paid: 100,
      deposit_currency: "USD",
      primary_resort: { id: "resort-1", name: "Beach Club Villas", slug: "beach-club-villas", calculator_code: "BCV" },
    },
  };
}

describe("owner operational subpage view models", () => {
  it("maps payout statuses without raw enum labels and keeps ledger cents authoritative", () => {
    const items = buildOwnerPayoutListItems([
      payout({ id: "pending", status: "pending", amount_cents: 12345 }),
      payout({ id: "eligible", status: "eligible", amount_cents: 20000 }),
      payout({ id: "released", status: "released", amount_cents: 30000, released_at: "2026-08-05T00:00:00.000Z" }),
      payout({ id: "failed", status: "failed", amount_cents: 40000 }),
    ]);

    expect(items.map((item) => item.statusLabel)).toEqual(["Pending", "Ready for payout", "Paid", "Payment issue"]);
    expect(items[0].amountCents).toBe(12345);
    expect(items[0].amountLabel).toBe("$123.45");
    expect(JSON.stringify(items)).not.toContain("guest_total");
  });

  it("filters payouts by verified status groups", () => {
    const items = buildOwnerPayoutListItems([
      payout({ id: "pending", status: "pending" }),
      payout({ id: "released", status: "released" }),
    ]);

    expect(filterOwnerPayoutItems(items, "pending").map((item) => item.id)).toEqual(["pending"]);
    expect(filterOwnerPayoutItems(items, "released").map((item) => item.id)).toEqual(["released"]);
    expect(filterOwnerPayoutItems(items, "all")).toHaveLength(2);
  });

  it("redacts rental guest PII and normalizes active/completed/cancelled groups", () => {
    const items = buildOwnerRentalListItems([
      rental({ id: "active", status: "needs_dvc_booking" }),
      rental({ id: "completed", status: "paid_balance" }),
      rental({ id: "cancelled", status: "cancelled" }),
    ]);

    expect(items.map((item) => item.group)).toEqual(["active", "completed", "cancelled"]);
    expect(items[0].nextActionLabel).toBe("Book reservation");
    const serialized = JSON.stringify(items);
    expect(serialized).not.toContain("guest@example.com");
    expect(serialized).not.toContain("555-");
    expect(serialized).not.toContain("Private accessibility note");
    expect(serialized).not.toContain("Private Guest");
  });

  it("filters rental groups and preserves old status query compatibility", () => {
    const items = buildOwnerRentalListItems([
      rental({ id: "active", status: "booked" }),
      rental({ id: "completed", status: "completed" }),
      rental({ id: "cancelled", status: "cancelled" }),
    ]);

    expect(filterOwnerRentalItems(items, "active").map((item) => item.id)).toEqual(["active"]);
    expect(filterOwnerRentalItems(items, "completed").map((item) => item.id)).toEqual(["completed"]);
    expect(filterOwnerRentalItems(items, "cancelled").map((item) => item.id)).toEqual(["cancelled"]);
    expect(getOwnerRentalFilterFromStatus("needs_dvc_booking")).toBe("active");
    expect(getOwnerRentalFilterFromStatus("paid_balance")).toBe("completed");
  });

  it("maps match statuses and links accepted matches to rentals when available", () => {
    const items = buildOwnerMatchListItems(
      [
        match({ id: "awaiting", status: "pending_owner" }),
        match({ id: "accepted", status: "accepted" }),
        match({ id: "declined", status: "declined" }),
        match({ id: "booked", status: "booked" }),
      ],
      new Map([["accepted", "rental-accepted"]]),
    );

    expect(items.map((item) => item.statusLabel)).toEqual([
      "Awaiting your response",
      "Reservation created",
      "Declined",
      "Reservation created",
    ]);
    expect(items[1].detailHref).toBe("/owner/rentals/rental-accepted");
    expect(items[1].actionLabel).toBe("View reservation");
    expect(filterOwnerMatchItems(items, "awaiting").map((item) => item.id)).toEqual(["awaiting"]);
    expect(filterOwnerMatchItems(items, "accepted").map((item) => item.id)).toEqual(["accepted", "booked"]);
  });

  it("redacts match guest contact information from list items", () => {
    const items = buildOwnerMatchListItems([match({ id: "match-private" })]);
    const serialized = JSON.stringify(items);

    expect(serialized).not.toContain("guest@example.com");
    expect(serialized).not.toContain("555-");
    expect(serialized).not.toContain("Private guest comments");
    expect(serialized).not.toContain("Private Guest");
    expect(items[0].matchLabel).toBe("Beach Club Villas");
  });
}
);
