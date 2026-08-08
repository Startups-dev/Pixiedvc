export type GuestTripOperationAction = {
  label: string;
  href: string;
};

export type GuestTripOperationsViewModel = {
  tripId: string;
  tripType: "custom_request" | "ready_stay";
  attention: {
    key: string;
    title: string;
    description: string | null;
    actionLabel: string;
    actionHref: string;
    priority: number;
  } | null;
  reservation: {
    reference: string;
    statusLabel: string;
    statusDescription: string;
    resortName: string | null;
    roomCategory: string | null;
    view: string | null;
    buildingPreference: string | null;
    checkIn: string | null;
    checkOut: string | null;
    nights: number | null;
    travelPartyLabel: string | null;
    points: number | null;
    createdAt: string | null;
    updatedAt: string | null;
    ownerBookingDate: string | null;
    transferDate: string | null;
    disneyConfirmationStatus: string;
    disneyConfirmationNumber: string | null;
  };
  statusChecklist: Array<{
    key: string;
    label: string;
    state: "complete" | "current" | "upcoming";
    responsibility: "You" | "HannaDVC" | "The DVC owner" | "Disney";
    detail: string;
  }>;
  payment: {
    currency: string;
    totalCents: number | null;
    paidCents: number | null;
    remainingCents: number | null;
    nextDueCents: number | null;
    nextDueDate: string | null;
    statusLabel: string;
    schedule: Array<{
      key: string;
      label: string;
      amountCents: number | null;
      receivedCents: number;
      dueDate: string | null;
      statusLabel: string;
    }>;
    history: Array<{
      id: string;
      amountCents: number;
      paidAt: string | null;
      statusLabel: string;
      receiptHref: string | null;
    }>;
    action: GuestTripOperationAction | null;
    warnings: string[];
  };
  agreement: {
    statusLabel: string;
    sentAt: string | null;
    signedAt: string | null;
    agreementHref: string | null;
    action: GuestTripOperationAction | null;
  };
  travelers: {
    completed: boolean;
    statusLabel: string;
    totalTravelers: number | null;
    adults: number | null;
    children: number | null;
    names: string[];
    action: GuestTripOperationAction | null;
  };
  documents: Array<{
    id: string;
    label: string;
    typeLabel: string;
    statusLabel: string | null;
    createdAt: string | null;
    downloadHref: string | null;
  }>;
  partialDataWarnings: string[];
};

export type GuestTripOperationsBooking = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  primary_room?: string | null;
  primary_view?: string | null;
  building_preference?: string | null;
  total_points?: number | null;
  owner_transfer_confirmed_at?: string | null;
  disney_confirmation_number?: string | null;
  primary_resort?: { name?: string | null } | null;
  confirmed_resort?: { name?: string | null } | null;
  ownerBookingDate?: string | null;
  transferDate?: string | null;
  displayConfirmationNumber?: string | null;
  confirmationDisclosureAllowed?: boolean;
  guest_total_cents?: number | null;
  guest_total_cents_final?: number | null;
  deposit_due?: number | null;
  deposit_paid?: number | null;
  deposit_currency?: string | null;
  guest_profile_complete_at?: string | null;
  guest_agreement_accepted_at?: string | null;
  adults?: number | null;
  youths?: number | null;
};

export type GuestTripOperationsContract = {
  id: number | string;
  status?: string | null;
  sent_at?: string | null;
  guest_accept_token?: string | null;
  guest_accepted_at?: string | null;
  signed_at?: string | null;
  snapshot?: Record<string, unknown> | null;
};

export type GuestTripOperationsTransaction = {
  id: string;
  direction?: string | null;
  txn_type?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  status?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

export type GuestTripOperationsTraveler = {
  first_name?: string | null;
  last_name?: string | null;
  age_category?: string | null;
};

export type GuestTripOperationsDocument = {
  id: string;
  type?: string | null;
  created_at?: string | null;
  meta?: Record<string, unknown> | null;
};

export type BuildGuestTripOperationsInput = {
  tripId: string;
  tripType: "custom_request" | "ready_stay";
  booking: GuestTripOperationsBooking;
  contract?: GuestTripOperationsContract | null;
  transactions?: GuestTripOperationsTransaction[] | null;
  travelers?: GuestTripOperationsTraveler[] | null;
  documents?: GuestTripOperationsDocument[] | null;
  paymentDataUnavailable?: boolean;
};

const PAID_TRANSACTION_STATUSES = new Set(["succeeded", "paid"]);
const FAILED_TRANSACTION_STATUSES = new Set(["failed"]);
const GUEST_PAYMENT_TYPES = new Set(["deposit", "booking", "checkin"]);
const AGREEMENT_SIGNABLE_STATUSES = new Set(["sent", "pending_payment"]);
const AGREEMENT_SIGNED_STATUSES = new Set(["accepted", "active"]);

export function buildGuestTripOperationsViewModel(
  input: BuildGuestTripOperationsInput,
): GuestTripOperationsViewModel {
  const totalCents = resolveTrustedTotalCents(input.booking, input.contract);
  const paymentWarnings: string[] = [];
  const incomingTransactions = (input.transactions ?? []).filter(
    isGuestPaymentTransaction,
  );
  const paidFromTransactions = sumPaidTransactions(incomingTransactions);
  const legacyDepositPaidCents = incomingTransactions.some(
    (row) => normalized(row.txn_type) === "deposit" && isPaid(row.status),
  )
    ? 0
    : dollarsToCents(input.booking.deposit_paid);
  const paidCents = input.paymentDataUnavailable
    ? null
    : paidFromTransactions + legacyDepositPaidCents;
  const remainingCents =
    typeof totalCents === "number" && typeof paidCents === "number"
      ? Math.max(totalCents - paidCents, 0)
      : null;

  if (input.paymentDataUnavailable) {
    paymentWarnings.push("Payment ledger could not be loaded.");
  }
  if (totalCents == null) {
    paymentWarnings.push("Total trip cost is not available yet.");
  }

  const history = incomingTransactions
    .slice()
    .sort(compareTransactionDatesDesc)
    .slice(0, 4)
    .map((transaction) => ({
      id: transaction.id,
      amountCents: Math.max(0, Math.round(transaction.amount_cents ?? 0)),
      paidAt: transaction.paid_at ?? transaction.created_at ?? null,
      statusLabel: getGuestPaymentStatusLabel(transaction.status),
      receiptHref: null,
    }));

  if (legacyDepositPaidCents > 0) {
    history.unshift({
      id: `${input.tripId}-legacy-deposit`,
      amountCents: legacyDepositPaidCents,
      paidAt: null,
      statusLabel: "Paid",
      receiptHref: null,
    });
  }

  const hasFailedPayment = incomingTransactions.some((transaction) =>
    isFailed(transaction.status),
  );
  const agreement = buildAgreementSummary(input.contract);
  const travelers = buildTravelerSummary(input.booking, input.travelers ?? []);
  const schedule = buildPaymentSchedule({
    booking: input.booking,
    totalCents,
    transactions: incomingTransactions,
    paidTransactions: incomingTransactions.filter((row) => isPaid(row.status)),
    legacyDepositPaidCents,
  });
  const payment = {
    currency: resolveCurrency(
      input.booking,
      input.contract,
      incomingTransactions,
    ),
    totalCents,
    paidCents,
    remainingCents,
    nextDueCents: remainingCents && remainingCents > 0 ? remainingCents : null,
    nextDueDate:
      schedule.find(
        (row) => row.statusLabel !== "Received" && row.amountCents !== null,
      )?.dueDate ?? null,
    statusLabel: getPaymentSummaryLabel({
      totalCents,
      paidCents,
      remainingCents,
      hasFailedPayment,
      unavailable: input.paymentDataUnavailable,
    }),
    schedule,
    history,
    action: null,
    warnings: paymentWarnings,
  };

  const documents = buildDocuments({
    contract: input.contract,
    rentalDocuments: input.documents ?? [],
    paymentHistory: history,
  });

  const attention = pickAttention({
    payment,
    agreement,
    travelers,
    hasFailedPayment,
    tripId: input.tripId,
  });
  const partialDataWarnings = [...paymentWarnings];

  const reservation = buildReservationSummary({
    booking: input.booking,
    tripType: input.tripType,
  });
  const statusChecklist = buildStatusChecklist({
    reservation,
    payment,
    agreement,
    travelers,
    tripType: input.tripType,
  });

  return {
    tripId: input.tripId,
    tripType: input.tripType,
    reservation,
    statusChecklist,
    attention,
    payment,
    agreement,
    travelers,
    documents,
    partialDataWarnings,
  };
}

export function formatGuestTripReference(id: string) {
  const digits = id.replace(/\D/g, "");
  if (digits) {
    return `HDVC-${digits.slice(-4).padStart(5, "0")}`;
  }
  return `HDVC-${id.replace(/-/g, "").slice(-5).toUpperCase().padStart(5, "0")}`;
}

export function resolveTrustedTotalCents(
  booking: GuestTripOperationsBooking,
  contract?: GuestTripOperationsContract | null,
) {
  const finalTotal = positiveInteger(booking.guest_total_cents_final);
  if (finalTotal != null) return finalTotal;

  const storedTotal = positiveInteger(booking.guest_total_cents);
  if (storedTotal != null) return storedTotal;

  const snapshotTotal = positiveInteger(
    getSnapshotSummaryNumber(contract?.snapshot, "totalPayableByGuestCents"),
  );
  return snapshotTotal ?? null;
}

export function getGuestPaymentStatusLabel(status?: string | null) {
  switch (normalized(status)) {
    case "succeeded":
    case "paid":
      return "Paid";
    case "pending":
      return "Pending";
    case "failed":
      return "Payment issue";
    case "refunded":
      return "Refunded";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    default:
      return "Status unavailable";
  }
}

export function getGuestAgreementStatusLabel(
  status?: string | null,
  signedAt?: string | null,
) {
  const normalizedStatus = normalized(status);
  if (
    signedAt ||
    normalizedStatus === "accepted" ||
    normalizedStatus === "active"
  ) {
    return "Signed";
  }
  if (normalizedStatus === "sent" || normalizedStatus === "pending_payment") {
    return "Ready for signature";
  }
  if (normalizedStatus === "draft") {
    return "Agreement being prepared";
  }
  if (
    normalizedStatus === "void" ||
    normalizedStatus === "cancelled" ||
    normalizedStatus === "rejected"
  ) {
    return "Agreement unavailable";
  }
  return "Agreement being prepared";
}

export function getGuestDocumentTypeLabel(type?: string | null) {
  switch (normalized(type)) {
    case "agreement_pdf":
      return "Agreement";
    case "disney_confirmation_email":
      return "Disney confirmation";
    case "invoice":
      return "Invoice";
    case "booking_package":
      return "Booking package";
    case "receipt":
      return "Receipt";
    case "other":
      return "Trip document";
    default:
      return "Trip document";
  }
}

function buildAgreementSummary(contract?: GuestTripOperationsContract | null) {
  const signedAt = contract?.guest_accepted_at ?? contract?.signed_at ?? null;
  const sentAt = contract?.sent_at ?? null;
  const statusLabel = getGuestAgreementStatusLabel(contract?.status, signedAt);
  const token = clean(contract?.guest_accept_token);
  const agreementHref = token ? `/contracts/${token}` : null;
  const signable = AGREEMENT_SIGNABLE_STATUSES.has(
    normalized(contract?.status),
  );
  const signed =
    Boolean(signedAt) ||
    AGREEMENT_SIGNED_STATUSES.has(normalized(contract?.status));

  return {
    statusLabel,
    sentAt,
    signedAt,
    agreementHref,
    action:
      agreementHref && signable && !signed
        ? { label: "Review and sign agreement", href: agreementHref }
        : agreementHref
          ? { label: "View agreement", href: agreementHref }
          : null,
  };
}

function buildTravelerSummary(
  booking: GuestTripOperationsBooking,
  travelers: GuestTripOperationsTraveler[],
) {
  const names = travelers.map(formatTravelerName).filter(Boolean).slice(0, 6);
  const completed = Boolean(booking.guest_profile_complete_at);
  const adultCount = numberOrNull(booking.adults);
  const childCount = numberOrNull(booking.youths);
  const totalTravelers =
    adultCount == null && childCount == null
      ? null
      : Math.max(0, adultCount ?? 0) + Math.max(0, childCount ?? 0);

  return {
    completed,
    statusLabel: completed
      ? "Complete"
      : names.length > 0
        ? "Partially completed"
        : "Traveler details needed",
    totalTravelers,
    adults: adultCount,
    children: childCount,
    names,
    action: completed
      ? {
          label: "Review traveler details",
          href: `/guest/requests/${booking.id}#guest-details`,
        }
      : {
          label: "Complete traveler details",
          href: `/guest/requests/${booking.id}#guest-details`,
        },
  };
}

function buildDocuments(input: {
  contract?: GuestTripOperationsContract | null;
  rentalDocuments: GuestTripOperationsDocument[];
  paymentHistory: GuestTripOperationsViewModel["payment"]["history"];
}) {
  const rows: GuestTripOperationsViewModel["documents"] = [];
  const agreement = buildAgreementSummary(input.contract);
  if (agreement.agreementHref) {
    rows.push({
      id: `agreement-${input.contract?.id ?? "current"}`,
      label:
        agreement.statusLabel === "Signed"
          ? "Signed agreement"
          : "Rental agreement",
      typeLabel: "Agreement",
      statusLabel: agreement.statusLabel,
      createdAt: agreement.signedAt,
      downloadHref: agreement.agreementHref,
    });
  }

  for (const document of input.rentalDocuments) {
    rows.push({
      id: document.id,
      label: getDocumentLabel(document),
      typeLabel: getGuestDocumentTypeLabel(document.type),
      statusLabel: "Available",
      createdAt: document.created_at ?? null,
      downloadHref: null,
    });
  }

  for (const payment of input.paymentHistory.filter((row) => row.receiptHref)) {
    rows.push({
      id: `receipt-${payment.id}`,
      label: "Payment receipt",
      typeLabel: "Receipt",
      statusLabel: payment.statusLabel,
      createdAt: payment.paidAt,
      downloadHref: payment.receiptHref,
    });
  }

  return rows.slice(0, 8);
}

function buildReservationSummary(input: {
  booking: GuestTripOperationsBooking;
  tripType: "custom_request" | "ready_stay";
}): GuestTripOperationsViewModel["reservation"] {
  const booking = input.booking;
  const transferred =
    Boolean(booking.owner_transfer_confirmed_at) ||
    normalized(booking.status) === "transferred";
  const booked =
    Boolean(booking.ownerBookingDate) ||
    transferred ||
    Boolean(booking.displayConfirmationNumber);
  const resortName =
    booking.confirmed_resort?.name ?? booking.primary_resort?.name ?? null;
  const statusLabel = transferred
    ? "Your reservation has been transferred"
    : booked
      ? "Your Disney confirmation is being finalized"
      : normalized(booking.status) === "matched"
        ? "Your reservation is being booked"
        : "HannaDVC is matching your request";
  const disneyConfirmationNumber = booking.confirmationDisclosureAllowed
    ? clean(booking.displayConfirmationNumber)
    : null;
  return {
    reference: formatGuestTripReference(booking.id),
    statusLabel,
    statusDescription: transferred
      ? "The owner transfer has been recorded for this trip."
      : booked
        ? "Your reservation details are secured and the Disney confirmation will appear when disclosure is allowed."
        : "We will keep this page updated as your trip moves forward.",
    resortName,
    roomCategory: clean(booking.primary_room),
    view: clean(booking.primary_view),
    buildingPreference: clean(booking.building_preference),
    checkIn: booking.check_in ?? null,
    checkOut: booking.check_out ?? null,
    nights: nightsBetween(booking.check_in, booking.check_out),
    travelPartyLabel: partyLabel(booking.adults, booking.youths),
    points: numberOrNull(booking.total_points),
    createdAt: booking.created_at ?? null,
    updatedAt: booking.updated_at ?? booking.created_at ?? null,
    ownerBookingDate: booking.ownerBookingDate ?? null,
    transferDate:
      booking.transferDate ?? booking.owner_transfer_confirmed_at ?? null,
    disneyConfirmationStatus: disneyConfirmationNumber
      ? "Your Disney confirmation is ready"
      : transferred
        ? "Your Disney confirmation is being finalized"
        : "Available after transfer",
    disneyConfirmationNumber,
  };
}

function buildPaymentSchedule(input: {
  booking: GuestTripOperationsBooking;
  totalCents: number | null;
  transactions: GuestTripOperationsTransaction[];
  paidTransactions: GuestTripOperationsTransaction[];
  legacyDepositPaidCents: number;
}): GuestTripOperationsViewModel["payment"]["schedule"] {
  if (input.totalCents == null) return [];
  const depositCents = dollarsToCents(input.booking.deposit_due);
  const depositReceived =
    sumPaidTransactions(
      input.paidTransactions.filter(
        (row) => normalized(row.txn_type) === "deposit",
      ),
    ) + input.legacyDepositPaidCents;
  const bookingReceived = sumPaidTransactions(
    input.paidTransactions.filter(
      (row) => normalized(row.txn_type) === "booking",
    ),
  );
  const checkinReceived = sumPaidTransactions(
    input.paidTransactions.filter(
      (row) => normalized(row.txn_type) === "checkin",
    ),
  );
  const hasCheckin = input.transactions.some(
    (row) => normalized(row.txn_type) === "checkin",
  );
  const remainingAfterDeposit = Math.max(input.totalCents - depositCents, 0);
  const rows = [
    {
      key: "deposit",
      label: "Deposit",
      amountCents: depositCents || null,
      receivedCents: depositReceived,
      dueDate: null,
    },
  ];
  if (hasCheckin) {
    rows.push({
      key: "installment-1",
      label: "Installment",
      amountCents: bookingReceived || null,
      receivedCents: bookingReceived,
      dueDate: null,
    });
    rows.push({
      key: "installment-2",
      label: "Final installment",
      amountCents: Math.max(
        input.totalCents - depositCents - bookingReceived,
        0,
      ),
      receivedCents: checkinReceived,
      dueDate: input.booking.check_in ?? null,
    });
  } else {
    rows.push({
      key: "balance",
      label: "Remaining balance",
      amountCents: remainingAfterDeposit,
      receivedCents: bookingReceived,
      dueDate: null,
    });
  }
  return rows.map((row) => ({
    ...row,
    statusLabel:
      row.receivedCents > 0 &&
      row.amountCents !== null &&
      row.receivedCents >= row.amountCents
        ? "Received"
        : row.receivedCents > 0
          ? "Partially received"
          : "Due date not available yet",
  }));
}

function buildStatusChecklist(input: {
  reservation: GuestTripOperationsViewModel["reservation"];
  payment: GuestTripOperationsViewModel["payment"];
  agreement: GuestTripOperationsViewModel["agreement"];
  travelers: GuestTripOperationsViewModel["travelers"];
  tripType: "custom_request" | "ready_stay";
}): GuestTripOperationsViewModel["statusChecklist"] {
  const paidInFull = input.payment.remainingCents === 0;
  return [
    {
      key: "request",
      label:
        input.tripType === "ready_stay"
          ? "Reservation option found"
          : "Request received",
      state: "complete",
      responsibility: "HannaDVC",
      detail: "Your trip is in the HannaDVC guest portal.",
    },
    {
      key: "travelers",
      label: "Traveler details complete",
      state: input.travelers.completed ? "complete" : "current",
      responsibility: "You",
      detail: input.travelers.statusLabel,
    },
    {
      key: "agreement",
      label:
        input.agreement.statusLabel === "Signed"
          ? "Agreement signed"
          : "Agreement ready",
      state:
        input.agreement.statusLabel === "Signed"
          ? "complete"
          : input.agreement.agreementHref
            ? "current"
            : "upcoming",
      responsibility:
        input.agreement.agreementHref &&
        input.agreement.statusLabel !== "Signed"
          ? "You"
          : "HannaDVC",
      detail: input.agreement.statusLabel,
    },
    {
      key: "payment",
      label: paidInFull
        ? "Paid in full"
        : input.payment.paidCents && input.payment.paidCents > 0
          ? "Installment received"
          : "Deposit received",
      state: paidInFull
        ? "complete"
        : input.payment.paidCents && input.payment.paidCents > 0
          ? "complete"
          : "upcoming",
      responsibility: paidInFull ? "HannaDVC" : "You",
      detail: input.payment.statusLabel,
    },
    {
      key: "booking",
      label: input.reservation.ownerBookingDate
        ? "Reservation booked"
        : "Owner booking in progress",
      state: input.reservation.ownerBookingDate ? "complete" : "upcoming",
      responsibility: "The DVC owner",
      detail: input.reservation.statusLabel,
    },
    {
      key: "confirmation",
      label: input.reservation.disneyConfirmationNumber
        ? "Disney confirmation ready"
        : "Transfer in progress",
      state: input.reservation.disneyConfirmationNumber
        ? "complete"
        : "upcoming",
      responsibility: input.reservation.transferDate
        ? "Disney"
        : "The DVC owner",
      detail: input.reservation.disneyConfirmationStatus,
    },
  ];
}

function pickAttention(input: {
  payment: GuestTripOperationsViewModel["payment"];
  agreement: GuestTripOperationsViewModel["agreement"];
  travelers: GuestTripOperationsViewModel["travelers"];
  hasFailedPayment: boolean;
  tripId: string;
}) {
  if (input.hasFailedPayment) {
    return {
      key: "payment-failed",
      title: "Payment needs review",
      description:
        "A recent payment did not complete. Your concierge team can help you review the next step.",
      actionLabel: "Contact support",
      actionHref: "/support",
      priority: 1,
    };
  }

  if (input.agreement.action?.label === "Review and sign agreement") {
    return {
      key: "agreement-signature",
      title: "Agreement needs your signature",
      description:
        "Review the rental agreement so your reservation can continue moving forward.",
      actionLabel: input.agreement.action.label,
      actionHref: input.agreement.action.href,
      priority: 2,
    };
  }

  if (
    input.payment.action &&
    input.payment.remainingCents &&
    input.payment.remainingCents > 0
  ) {
    return {
      key: "payment-due",
      title: "Payment is ready",
      description: "A secure payment step is available for this trip.",
      actionLabel: input.payment.action.label,
      actionHref: input.payment.action.href,
      priority: 3,
    };
  }

  if (!input.travelers.completed && input.travelers.action) {
    return {
      key: "traveler-details",
      title: "Traveler details needed",
      description:
        "Confirm the guests traveling so your reservation records stay accurate.",
      actionLabel: input.travelers.action.label,
      actionHref: input.travelers.action.href,
      priority: 4,
    };
  }

  return null;
}

function resolveCurrency(
  booking: GuestTripOperationsBooking,
  contract?: GuestTripOperationsContract | null,
  transactions: GuestTripOperationsTransaction[] = [],
) {
  const transactionCurrency = transactions.find((row) =>
    clean(row.currency),
  )?.currency;
  const snapshotCurrency = clean(
    getSnapshotSummaryString(contract?.snapshot, "currency"),
  );
  return (
    transactionCurrency ??
    snapshotCurrency ??
    booking.deposit_currency ??
    "USD"
  ).toUpperCase();
}

function getPaymentSummaryLabel(input: {
  totalCents: number | null;
  paidCents: number | null;
  remainingCents: number | null;
  hasFailedPayment: boolean;
  unavailable?: boolean;
}) {
  if (input.hasFailedPayment) return "Payment issue";
  if (
    input.unavailable ||
    input.totalCents == null ||
    input.paidCents == null
  ) {
    return "Payment details are not available yet";
  }
  if (input.remainingCents === 0) return "Paid in full";
  if (input.paidCents > 0) return "Payment received";
  return "No payment recorded yet";
}

function isGuestPaymentTransaction(
  transaction: GuestTripOperationsTransaction,
) {
  return (
    normalized(transaction.direction) === "in" &&
    GUEST_PAYMENT_TYPES.has(normalized(transaction.txn_type)) &&
    typeof transaction.amount_cents === "number"
  );
}

function sumPaidTransactions(transactions: GuestTripOperationsTransaction[]) {
  return transactions.reduce((total, transaction) => {
    if (!isPaid(transaction.status)) return total;
    return total + Math.max(0, Math.round(transaction.amount_cents ?? 0));
  }, 0);
}

function isPaid(status?: string | null) {
  return PAID_TRANSACTION_STATUSES.has(normalized(status));
}

function isFailed(status?: string | null) {
  return FAILED_TRANSACTION_STATUSES.has(normalized(status));
}

function compareTransactionDatesDesc(
  left: GuestTripOperationsTransaction,
  right: GuestTripOperationsTransaction,
) {
  const leftDate = Date.parse(left.paid_at ?? left.created_at ?? "");
  const rightDate = Date.parse(right.paid_at ?? right.created_at ?? "");
  return (
    (Number.isNaN(rightDate) ? 0 : rightDate) -
    (Number.isNaN(leftDate) ? 0 : leftDate)
  );
}

function getDocumentLabel(document: GuestTripOperationsDocument) {
  const originalName = document.meta?.original_name;
  if (typeof originalName === "string" && originalName.trim()) {
    return originalName.trim();
  }
  return getGuestDocumentTypeLabel(document.type);
}

function getSnapshotSummaryNumber(
  snapshot: Record<string, unknown> | null | undefined,
  key: string,
) {
  const summary = snapshot?.summary;
  if (!summary || typeof summary !== "object") return null;
  const value = (summary as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function getSnapshotSummaryString(
  snapshot: Record<string, unknown> | null | undefined,
  key: string,
) {
  const summary = snapshot?.summary;
  if (!summary || typeof summary !== "object") return null;
  const value = (summary as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function dollarsToCents(value?: number | null) {
  if (typeof value !== "number" || value <= 0) return 0;
  return Math.round(value * 100);
}

function positiveInteger(value?: number | null) {
  if (typeof value !== "number" || value <= 0) return null;
  return Math.round(value);
}

function nightsBetween(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return null;
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, Math.round((end - start) / 86400000));
}

function partyLabel(adults?: number | null, youths?: number | null) {
  const parts = [];
  if (typeof adults === "number" && adults > 0)
    parts.push(`${adults} ${adults === 1 ? "adult" : "adults"}`);
  if (typeof youths === "number" && youths > 0)
    parts.push(`${youths} ${youths === 1 ? "child" : "children"}`);
  return parts.length ? parts.join(" · ") : null;
}

function numberOrNull(value?: number | null) {
  return typeof value === "number" ? value : null;
}

function formatTravelerName(traveler: GuestTripOperationsTraveler) {
  return [clean(traveler.first_name), clean(traveler.last_name)]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalized(value?: string | null) {
  return clean(value)?.toLowerCase() ?? "";
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
