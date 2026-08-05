import { resolveResortImage } from "@/lib/resort-image";
import { getGuestTripStatusLabel } from "@/lib/guest/status-labels";

export type GuestTripHeroViewModel = {
  guestName: string | null;
  tripId: string;
  tripType: "custom_request" | "ready_stay";
  resortName: string | null;
  resortImageUrl: string | null;
  resortImageAlt: string;
  roomType: string | null;
  checkIn: string | null;
  checkOut: string | null;
  nights: number | null;
  dateRangeLabel: string | null;
  partySummary: string | null;
  countdown: {
    value: string;
    context: string;
    accessibleLabel: string;
  } | null;
  countdownLabel: string | null;
  statusLabel: string;
  primaryAction: {
    label: string;
    href: string;
  } | null;
};

type ResortRecord = {
  name?: string | null;
  slug?: string | null;
  calculator_code?: string | null;
};

export type GuestTripHeroInput = {
  guestName?: string | null;
  profileDisplayName?: string | null;
  profileFullName?: string | null;
  metadataDisplayName?: string | null;
  metadataFullName?: string | null;
  metadataName?: string | null;
  email?: string | null;
  tripId: string;
  tripType?: "custom_request" | "ready_stay";
  resort?: ResortRecord | null;
  roomType?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  adults?: number | null;
  youths?: number | null;
  status?: string | null;
  transferConfirmed?: boolean;
  confirmationNumber?: string | null;
  now?: Date;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export function buildGuestTripHeroViewModel(input: GuestTripHeroInput): GuestTripHeroViewModel {
  const resortName = clean(input.resort?.name) ?? "Your Disney villa stay";
  const image = resolveGuestTripResortImage(input.resort ?? null);
  const nights = deriveNights(input.checkIn, input.checkOut);
  const partySummary = formatPartySummary(input.adults, input.youths);
  const countdown = getCountdownPresentation(input.checkIn, input.now);
  const countdownLabel = countdown?.accessibleLabel ?? null;
  const statusLabel = getGuestTripStatusLabel({
    status: input.status,
    transferConfirmed: input.transferConfirmed,
    confirmationNumber: input.confirmationNumber,
    checkOut: input.checkOut,
    now: input.now,
  });

  return {
    guestName: resolveGuestDisplayName(input),
    tripId: input.tripId,
    tripType: input.tripType ?? "custom_request",
    resortName,
    resortImageUrl: image.url,
    resortImageAlt: `${resortName} resort`,
    roomType: clean(input.roomType),
    checkIn: input.checkIn ?? null,
    checkOut: input.checkOut ?? null,
    nights,
    dateRangeLabel: formatDateRange(input.checkIn, input.checkOut),
    partySummary,
    countdown,
    countdownLabel,
    statusLabel,
    primaryAction: getPrimaryAction({
      tripId: input.tripId,
      transferConfirmed: input.transferConfirmed,
      confirmationNumber: input.confirmationNumber,
    }),
  };
}

export function resolveGuestTripResortImage(resort: ResortRecord | null) {
  return resolveResortImage({
    resortCode: resort?.calculator_code ?? null,
    resortSlug: resort?.slug ?? null,
    imageIndex: 2,
  });
}

export function deriveNights(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return null;
  const start = parseUtcDate(checkIn);
  const end = parseUtcDate(checkOut);
  if (!start || !end) return null;
  const diff = end.getTime() - start.getTime();
  if (diff <= 0) return null;
  return Math.round(diff / 86_400_000);
}

export function getCountdownLabel(checkIn?: string | null, now = new Date()) {
  return getCountdownPresentation(checkIn, now)?.accessibleLabel ?? null;
}

export function getCountdownPresentation(checkIn?: string | null, now = new Date()) {
  if (!checkIn) return null;
  const start = parseUtcDate(checkIn);
  if (!start) return null;
  const today = startOfUtcDay(now);
  const diffDays = Math.round((start.getTime() - today.getTime()) / 86_400_000);

  if (diffDays > 1) {
    return {
      value: `${diffDays} days`,
      context: "until check-in",
      accessibleLabel: `${diffDays} days until check-in`,
    };
  }
  if (diffDays === 1) {
    return {
      value: "Tomorrow",
      context: "your vacation begins",
      accessibleLabel: "Your vacation begins tomorrow",
    };
  }
  if (diffDays === 0) {
    return {
      value: "Today",
      context: "welcome to your vacation",
      accessibleLabel: "Welcome to your vacation",
    };
  }
  return {
    value: "Complete",
    context: "this trip has ended",
    accessibleLabel: "This trip has ended",
  };
}

export function formatDateRange(checkIn?: string | null, checkOut?: string | null) {
  const start = checkIn ? parseUtcDate(checkIn) : null;
  const end = checkOut ? parseUtcDate(checkOut) : null;
  if (!start && !end) return null;
  if (start && end) {
    if (start.getUTCFullYear() === end.getUTCFullYear()) {
      return `${compactDateFormatter.format(start)} - ${dateFormatter.format(end)}`;
    }
    return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`;
  }
  return dateFormatter.format((start ?? end)!);
}

function getPrimaryAction(input: {
  tripId: string;
  transferConfirmed?: boolean;
  confirmationNumber?: string | null;
}): GuestTripHeroViewModel["primaryAction"] {
  if (input.transferConfirmed && input.confirmationNumber) {
    return {
      label: "Link your reservation",
      href: "/guides/link-to-disney-experience",
    };
  }

  return null;
}

function formatPartySummary(adults?: number | null, youths?: number | null) {
  if (adults == null && youths == null) return null;
  const adultCount = Math.max(0, adults ?? 0);
  const youthCount = Math.max(0, youths ?? 0);
  const parts = [];
  if (adultCount) parts.push(`${adultCount} ${adultCount === 1 ? "adult" : "adults"}`);
  if (youthCount) parts.push(`${youthCount} ${youthCount === 1 ? "child" : "children"}`);
  return parts.length ? parts.join(" · ") : null;
}

export function resolveGuestDisplayName(input: {
  profileDisplayName?: string | null;
  profileFullName?: string | null;
  metadataDisplayName?: string | null;
  metadataFullName?: string | null;
  metadataName?: string | null;
  email?: string | null;
  guestName?: string | null;
}) {
  const candidates = [
    input.profileDisplayName,
    input.profileFullName,
    input.metadataDisplayName,
    input.metadataFullName,
    input.metadataName,
    emailPrefix(input.email),
    input.guestName,
  ];

  for (const candidate of candidates) {
    const name = normalizeGuestName(candidate);
    if (name) return name;
  }

  return null;
}

function normalizeGuestName(value?: string | null) {
  const normalized = clean(value);
  if (!normalized) return null;
  if (isBlockedName(normalized)) return null;
  const parts = normalized.split(/\s+/).filter((part) => !isHonorific(part));
  const firstName = parts[0];
  if (!firstName || isBlockedName(firstName)) return null;
  return firstName || null;
}

function clean(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function emailPrefix(value?: string | null) {
  const email = clean(value);
  const prefix = email?.split("@")[0];
  return prefix?.replace(/[._+-]+/g, " ") ?? null;
}

function isBlockedName(value: string) {
  const normalized = value.trim().replace(/\.+$/g, "").toLowerCase();
  return !normalized || ["mr", "mrs", "ms", "miss", "guest", "null", "undefined", "unknown"].includes(normalized);
}

function isHonorific(value: string) {
  const normalized = value.trim().replace(/\.+$/g, "").toLowerCase();
  return ["mr", "mrs", "ms", "miss", "dr", "sir", "madam"].includes(normalized);
}

function parseUtcDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
