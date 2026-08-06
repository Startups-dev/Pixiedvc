import { describe, expect, it } from "vitest";

import {
  buildGuestTripOperationsViewModel,
  getGuestAgreementStatusLabel,
  getGuestDocumentTypeLabel,
  getGuestPaymentStatusLabel,
  resolveTrustedTotalCents,
  type GuestTripOperationsContract,
} from "@/lib/guest/trip-operations-view-model";

const baseBooking = {
  id: "trip-1",
  guest_total_cents: 250000,
  guest_total_cents_final: null,
  deposit_due: 99,
  deposit_paid: null,
  deposit_currency: "USD",
  adults: 2,
  youths: 2,
};

describe("guest trip operations view model", () => {
  it("uses final stored total before original stored total or contract snapshot", () => {
    const contract: GuestTripOperationsContract = {
      id: 1,
      snapshot: { summary: { totalPayableByGuestCents: 200000 } },
    };

    expect(
      resolveTrustedTotalCents(
        { ...baseBooking, guest_total_cents_final: 240000 },
        contract,
      ),
    ).toBe(240000);
    expect(resolveTrustedTotalCents(baseBooking, contract)).toBe(250000);
    expect(
      resolveTrustedTotalCents(
        {
          ...baseBooking,
          guest_total_cents: null,
          guest_total_cents_final: null,
        },
        contract,
      ),
    ).toBe(200000);
  });

  it("does not recompute missing historical totals or render missing totals as zero", () => {
    const model = buildGuestTripOperationsViewModel({
      tripId: "trip-1",
      tripType: "custom_request",
      booking: {
        ...baseBooking,
        guest_total_cents: null,
        guest_total_cents_final: null,
      },
      transactions: [],
    });

    expect(model.payment.totalCents).toBeNull();
    expect(model.payment.remainingCents).toBeNull();
    expect(model.payment.statusLabel).toBe(
      "Payment details are not available yet",
    );
  });

  it("uses Ready Stay stored booking totals without recalculating listing price", () => {
    const model = buildGuestTripOperationsViewModel({
      tripId: "trip-1",
      tripType: "ready_stay",
      booking: { ...baseBooking, guest_total_cents: 180000 },
      transactions: [],
    });

    expect(model.payment.totalCents).toBe(180000);
  });

  it("counts only successful guest incoming payments as paid", () => {
    const model = buildGuestTripOperationsViewModel({
      tripId: "trip-1",
      tripType: "custom_request",
      booking: baseBooking,
      transactions: [
        {
          id: "paid-1",
          direction: "in",
          txn_type: "deposit",
          amount_cents: 9900,
          status: "succeeded",
          currency: "USD",
          paid_at: "2026-01-02T00:00:00Z",
        },
        {
          id: "failed-1",
          direction: "in",
          txn_type: "booking",
          amount_cents: 50000,
          status: "failed",
          currency: "USD",
          paid_at: "2026-01-03T00:00:00Z",
        },
        {
          id: "owner-1",
          direction: "out",
          txn_type: "owner_payout",
          amount_cents: 100000,
          status: "succeeded",
          currency: "USD",
        },
      ],
    });

    expect(model.payment.paidCents).toBe(9900);
    expect(model.payment.remainingCents).toBe(240100);
    expect(model.payment.statusLabel).toBe("Payment issue");
    expect(model.attention?.title).toBe("Payment needs review");
  });

  it("distinguishes legacy deposit paid from unavailable payment data", () => {
    const model = buildGuestTripOperationsViewModel({
      tripId: "trip-1",
      tripType: "custom_request",
      booking: { ...baseBooking, deposit_paid: 99 },
      transactions: [],
    });

    expect(model.payment.paidCents).toBe(9900);
    expect(model.payment.history[0]).toMatchObject({
      id: "trip-1-legacy-deposit",
      amountCents: 9900,
      statusLabel: "Paid",
    });
  });

  it("renders a two-payment schedule from trusted totals and deposit", () => {
    const model = buildGuestTripOperationsViewModel({
      tripId: "trip-1",
      tripType: "custom_request",
      booking: { ...baseBooking, deposit_due: 100, deposit_paid: 100 },
      transactions: [],
    });

    expect(model.payment.schedule).toEqual([
      expect.objectContaining({
        key: "deposit",
        amountCents: 10000,
        receivedCents: 10000,
        statusLabel: "Received",
      }),
      expect.objectContaining({
        key: "balance",
        amountCents: 240000,
        dueDate: null,
        statusLabel: "Due date not available yet",
      }),
    ]);
  });

  it("renders a three-payment schedule when booking and check-in installments exist", () => {
    const model = buildGuestTripOperationsViewModel({
      tripId: "trip-1",
      tripType: "custom_request",
      booking: { ...baseBooking, check_in: "2026-10-10", deposit_due: 100 },
      transactions: [
        {
          id: "deposit",
          direction: "in",
          txn_type: "deposit",
          amount_cents: 10000,
          status: "succeeded",
        },
        {
          id: "booking",
          direction: "in",
          txn_type: "booking",
          amount_cents: 140000,
          status: "succeeded",
        },
        {
          id: "checkin",
          direction: "in",
          txn_type: "checkin",
          amount_cents: 100000,
          status: "pending",
        },
      ],
    });

    expect(model.payment.schedule).toEqual([
      expect.objectContaining({
        key: "deposit",
        amountCents: 10000,
        receivedCents: 10000,
        statusLabel: "Received",
      }),
      expect.objectContaining({
        key: "installment-1",
        amountCents: 140000,
        receivedCents: 140000,
        statusLabel: "Received",
      }),
      expect.objectContaining({
        key: "installment-2",
        amountCents: 100000,
        receivedCents: 0,
        dueDate: "2026-10-10",
      }),
    ]);
    expect(model.payment.paidCents).toBe(150000);
  });

  it("surfaces agreement and traveler actions using existing routes", () => {
    const model = buildGuestTripOperationsViewModel({
      tripId: "trip-1",
      tripType: "custom_request",
      booking: baseBooking,
      contract: {
        id: 1,
        status: "sent",
        guest_accept_token: "token-1",
        guest_accepted_at: null,
      },
      travelers: [
        { first_name: "Helena", last_name: "Aranha", age_category: "adult" },
      ],
      transactions: [],
    });

    expect(model.agreement.statusLabel).toBe("Ready for signature");
    expect(model.agreement.action).toEqual({
      label: "Review and sign agreement",
      href: "/contracts/token-1",
    });
    expect(model.travelers.statusLabel).toBe("Partially completed");
    expect(model.travelers.names).toEqual(["Helena Aranha"]);
    expect(model.travelers.action?.href).toBe(
      "/guest/requests/trip-1#guest-details",
    );
    expect(model.attention?.title).toBe("Agreement needs your signature");
  });

  it("selects traveler attention only when higher priority trusted actions are absent", () => {
    const model = buildGuestTripOperationsViewModel({
      tripId: "trip-1",
      tripType: "custom_request",
      booking: baseBooking,
      transactions: [],
    });

    expect(model.attention).toMatchObject({
      title: "Traveler details needed",
      actionHref: "/guest/requests/trip-1#guest-details",
    });
    expect(JSON.stringify(model)).not.toContain("Action needed");
  });

  it("does not expose owner payout, platform margin, affiliate commission, or storage paths", () => {
    const model = buildGuestTripOperationsViewModel({
      tripId: "trip-1",
      tripType: "custom_request",
      booking: baseBooking,
      contract: {
        id: 1,
        status: "accepted",
        guest_accept_token: "guest-token",
        guest_accepted_at: "2026-01-02T00:00:00Z",
      },
      documents: [
        {
          id: "doc-1",
          type: "disney_confirmation_email",
          created_at: "2026-01-03T00:00:00Z",
          meta: {
            original_name: "confirmation.pdf",
            storage_path: "private/path.pdf",
          },
        },
      ],
      transactions: [],
    });

    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain("owner_payout");
    expect(serialized).not.toContain("platform margin");
    expect(serialized).not.toContain("affiliate commission");
    expect(serialized).not.toContain("private/path.pdf");
    expect(model.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "confirmation.pdf",
          typeLabel: "Disney confirmation",
          downloadHref: null,
        }),
      ]),
    );
  });

  it("normalizes observed status values and fails safely for unknowns", () => {
    expect(getGuestPaymentStatusLabel("succeeded")).toBe("Paid");
    expect(getGuestPaymentStatusLabel("failed")).toBe("Payment issue");
    expect(getGuestPaymentStatusLabel("pending")).toBe("Pending");
    expect(getGuestPaymentStatusLabel("refunded")).toBe("Refunded");
    expect(getGuestPaymentStatusLabel("raw_new_status")).toBe(
      "Status unavailable",
    );

    expect(getGuestAgreementStatusLabel("sent")).toBe("Ready for signature");
    expect(getGuestAgreementStatusLabel("accepted")).toBe("Signed");
    expect(getGuestAgreementStatusLabel("draft")).toBe(
      "Agreement being prepared",
    );
    expect(getGuestAgreementStatusLabel("raw_new_status")).toBe(
      "Agreement being prepared",
    );

    expect(getGuestDocumentTypeLabel("agreement_pdf")).toBe("Agreement");
    expect(getGuestDocumentTypeLabel("disney_confirmation_email")).toBe(
      "Disney confirmation",
    );
    expect(getGuestDocumentTypeLabel("raw_new_status")).toBe("Trip document");
  });
});
