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
  payment: {
    currency: string;
    totalCents: number | null;
    paidCents: number | null;
    remainingCents: number | null;
    nextDueCents: number | null;
    nextDueDate: string | null;
    statusLabel: string;
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
  const incomingTransactions = (input.transactions ?? []).filter(isGuestPaymentTransaction);
  const paidFromTransactions = sumPaidTransactions(incomingTransactions);
  const legacyDepositPaidCents =
    incomingTransactions.some((row) => normalized(row.txn_type) === "deposit" && isPaid(row.status))
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

  const hasFailedPayment = incomingTransactions.some((transaction) => isFailed(transaction.status));
  const agreement = buildAgreementSummary(input.contract);
  const travelers = buildTravelerSummary(input.booking, input.travelers ?? []);
  const payment = {
    currency: resolveCurrency(input.booking, input.contract, incomingTransactions),
    totalCents,
    paidCents,
    remainingCents,
    nextDueCents: remainingCents && remainingCents > 0 ? remainingCents : null,
    nextDueDate: null,
    statusLabel: getPaymentSummaryLabel({
      totalCents,
      paidCents,
      remainingCents,
      hasFailedPayment,
      unavailable: input.paymentDataUnavailable,
    }),
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

  return {
    tripId: input.tripId,
    tripType: input.tripType,
    attention,
    payment,
    agreement,
    travelers,
    documents,
    partialDataWarnings,
  };
}

export function resolveTrustedTotalCents(
  booking: GuestTripOperationsBooking,
  contract?: GuestTripOperationsContract | null,
) {
  const finalTotal = positiveInteger(booking.guest_total_cents_final);
  if (finalTotal != null) return finalTotal;

  const storedTotal = positiveInteger(booking.guest_total_cents);
  if (storedTotal != null) return storedTotal;

  const snapshotTotal = positiveInteger(getSnapshotSummaryNumber(contract?.snapshot, "totalPayableByGuestCents"));
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

export function getGuestAgreementStatusLabel(status?: string | null, signedAt?: string | null) {
  const normalizedStatus = normalized(status);
  if (signedAt || normalizedStatus === "accepted" || normalizedStatus === "active") {
    return "Signed";
  }
  if (normalizedStatus === "sent" || normalizedStatus === "pending_payment") {
    return "Ready for signature";
  }
  if (normalizedStatus === "draft") {
    return "Agreement being prepared";
  }
  if (normalizedStatus === "void" || normalizedStatus === "cancelled" || normalizedStatus === "rejected") {
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
  const statusLabel = getGuestAgreementStatusLabel(contract?.status, signedAt);
  const token = clean(contract?.guest_accept_token);
  const agreementHref = token ? `/contracts/${token}` : null;
  const signable = AGREEMENT_SIGNABLE_STATUSES.has(normalized(contract?.status));
  const signed = Boolean(signedAt) || AGREEMENT_SIGNED_STATUSES.has(normalized(contract?.status));

  return {
    statusLabel,
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
    adultCount == null && childCount == null ? null : Math.max(0, adultCount ?? 0) + Math.max(0, childCount ?? 0);

  return {
    completed,
    statusLabel: completed ? "Complete" : names.length > 0 ? "Partially completed" : "Traveler details needed",
    totalTravelers,
    adults: adultCount,
    children: childCount,
    names,
    action: completed
      ? { label: "Review traveler details", href: `/guest/requests/${booking.id}#guest-details` }
      : { label: "Complete traveler details", href: `/guest/requests/${booking.id}#guest-details` },
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
      label: agreement.statusLabel === "Signed" ? "Signed agreement" : "Rental agreement",
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
      description: "A recent payment did not complete. Your concierge team can help you review the next step.",
      actionLabel: "Contact support",
      actionHref: "/support",
      priority: 1,
    };
  }

  if (input.agreement.action?.label === "Review and sign agreement") {
    return {
      key: "agreement-signature",
      title: "Agreement needs your signature",
      description: "Review the rental agreement so your reservation can continue moving forward.",
      actionLabel: input.agreement.action.label,
      actionHref: input.agreement.action.href,
      priority: 2,
    };
  }

  if (input.payment.action && input.payment.remainingCents && input.payment.remainingCents > 0) {
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
      description: "Confirm the guests traveling so your reservation records stay accurate.",
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
  const transactionCurrency = transactions.find((row) => clean(row.currency))?.currency;
  const snapshotCurrency = clean(getSnapshotSummaryString(contract?.snapshot, "currency"));
  return (transactionCurrency ?? snapshotCurrency ?? booking.deposit_currency ?? "USD").toUpperCase();
}

function getPaymentSummaryLabel(input: {
  totalCents: number | null;
  paidCents: number | null;
  remainingCents: number | null;
  hasFailedPayment: boolean;
  unavailable?: boolean;
}) {
  if (input.hasFailedPayment) return "Payment issue";
  if (input.unavailable || input.totalCents == null || input.paidCents == null) {
    return "Payment details are not available yet";
  }
  if (input.remainingCents === 0) return "Paid in full";
  if (input.paidCents > 0) return "Payment received";
  return "No payment recorded yet";
}

function isGuestPaymentTransaction(transaction: GuestTripOperationsTransaction) {
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
  return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
}

function getDocumentLabel(document: GuestTripOperationsDocument) {
  const originalName = document.meta?.original_name;
  if (typeof originalName === "string" && originalName.trim()) {
    return originalName.trim();
  }
  return getGuestDocumentTypeLabel(document.type);
}

function getSnapshotSummaryNumber(snapshot: Record<string, unknown> | null | undefined, key: string) {
  const summary = snapshot?.summary;
  if (!summary || typeof summary !== "object") return null;
  const value = (summary as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function getSnapshotSummaryString(snapshot: Record<string, unknown> | null | undefined, key: string) {
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

function numberOrNull(value?: number | null) {
  return typeof value === "number" ? value : null;
}

function formatTravelerName(traveler: GuestTripOperationsTraveler) {
  return [clean(traveler.first_name), clean(traveler.last_name)].filter(Boolean).join(" ").trim();
}

function normalized(value?: string | null) {
  return clean(value)?.toLowerCase() ?? "";
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
