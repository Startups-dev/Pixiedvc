export type GuestTripStatusLabel =
  | "Your reservation is taking shape"
  | "Agreement needs your signature"
  | "Traveler details needed"
  | "Disney confirmation pending"
  | "Reservation confirmed"
  | "Final details are being prepared"
  | "Your trip is ready"
  | "This trip has ended";

const CONFIRMED_STATUSES = new Set(["confirmed", "booked", "complete", "completed", "contract_signed"]);
const TRAVELER_DETAIL_STATUSES = new Set(["draft"]);
const PREPARING_STATUSES = new Set(["matched", "accepted", "paid", "signed"]);
const CANCELLED_STATUSES = new Set(["cancelled", "canceled", "expired", "declined"]);

export function getGuestTripStatusLabel(input: {
  status?: string | null;
  transferConfirmed?: boolean;
  confirmationNumber?: string | null;
  checkOut?: string | null;
  now?: Date;
}): GuestTripStatusLabel {
  const now = input.now ?? new Date();
  const rawStatus = (input.status ?? "").trim().toLowerCase();

  if (input.checkOut) {
    const checkOut = new Date(`${input.checkOut}T00:00:00Z`);
    if (!Number.isNaN(checkOut.getTime()) && startOfUtcDay(now).getTime() > checkOut.getTime()) {
      return "This trip has ended";
    }
  }

  if (input.transferConfirmed && input.confirmationNumber) {
    return "Your trip is ready";
  }

  if (CONFIRMED_STATUSES.has(rawStatus) || input.confirmationNumber) {
    return "Reservation confirmed";
  }

  if (rawStatus === "contract_sent") {
    return "Agreement needs your signature";
  }

  if (TRAVELER_DETAIL_STATUSES.has(rawStatus)) {
    return "Traveler details needed";
  }

  if (PREPARING_STATUSES.has(rawStatus)) {
    return "Disney confirmation pending";
  }

  if (CANCELLED_STATUSES.has(rawStatus)) {
    return "Final details are being prepared";
  }

  return "Your reservation is taking shape";
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
