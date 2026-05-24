import { getAppUrl } from "@/lib/app-url";
import {
  sendAbandonedGuestBookingRequestEmail,
  sendBookingConfirmationEmail,
  sendConciergeHandoffNotification,
  sendContractGuestAgreementEmail,
  sendContractGuestAgreementReminderEmail,
  sendContractOwnerAgreementEmail,
  sendContractOwnerAgreementReminderEmail,
  sendGuestAgreementSignedEmail,
  sendOwnerAgreementSignedEmail,
  sendOwnerMatchEmail,
  sendOwnerMatchReminderEmail,
  sendReadyStayLinkReadyEmail,
  sendReadyStayBookingPackageToOwner,
  sendReadyStayRejectedEmail,
} from "@/lib/email";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const RETRY_COOLDOWN_MS = 15_000;
const MAX_RETRY_COUNT = 5;

type OutboundEmailRow = {
  id: string;
  template_key: string;
  recipient_email: string;
  recipient_user_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  subject: string;
  status: "pending" | "sent" | "failed";
  provider: string;
  provider_message_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  sent_at: string | null;
  failed_at: string | null;
  retry_count: number;
  last_retry_at: string | null;
};

type RetryResult =
  | { ok: true; row: OutboundEmailRow }
  | { ok: false; status: number; error: string; row?: OutboundEmailRow | null };

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function coerceMetadata(row: OutboundEmailRow) {
  return (row.metadata ?? {}) as Record<string, unknown>;
}

async function loadOutboundEmail(id: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return { admin: null, row: null as OutboundEmailRow | null };

  const { data } = await admin
    .from("outbound_emails")
    .select(
      "id, template_key, recipient_email, recipient_user_id, related_entity_type, related_entity_id, subject, status, provider, provider_message_id, error_message, metadata, created_at, sent_at, failed_at, retry_count, last_retry_at",
    )
    .eq("id", id)
    .maybeSingle();

  return { admin, row: (data ?? null) as OutboundEmailRow | null };
}

async function markRetryStarted(admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, row: OutboundEmailRow) {
  const nowIso = new Date().toISOString();
  const nextRetryCount = (row.retry_count ?? 0) + 1;
  const { data } = await admin
    .from("outbound_emails")
    .update({
      status: "pending",
      retry_count: nextRetryCount,
      last_retry_at: nowIso,
      error_message: null,
    })
    .eq("id", row.id)
    .eq("status", "failed")
    .select(
      "id, template_key, recipient_email, recipient_user_id, related_entity_type, related_entity_id, subject, status, provider, provider_message_id, error_message, metadata, created_at, sent_at, failed_at, retry_count, last_retry_at",
    )
    .maybeSingle();

  return (data ?? null) as OutboundEmailRow | null;
}

async function refetchRow(admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, id: string) {
  const { data } = await admin
    .from("outbound_emails")
    .select(
      "id, template_key, recipient_email, recipient_user_id, related_entity_type, related_entity_id, subject, status, provider, provider_message_id, error_message, metadata, created_at, sent_at, failed_at, retry_count, last_retry_at",
    )
    .eq("id", id)
    .maybeSingle();

  return (data ?? null) as OutboundEmailRow | null;
}

async function retryGuestBookingConfirmation(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const bookingId = readString(metadata.bookingId) ?? row.related_entity_id;
  if (!bookingId) throw new Error("missing_booking_id");

  const { data: booking } = await admin
    .from("booking_requests")
    .select(
      "id, renter_id, lead_guest_email, lead_guest_name, check_in, check_out, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking?.lead_guest_email) throw new Error("booking_or_guest_email_missing");

  await sendBookingConfirmationEmail({
    to: row.recipient_email,
    name: booking.lead_guest_name ?? undefined,
    resortName: booking.primary_resort?.name ?? undefined,
    checkIn: booking.check_in ?? undefined,
    checkOut: booking.check_out ?? undefined,
    templateKey: row.template_key,
    recipientUserId: booking.renter_id ?? row.recipient_user_id,
    relatedEntityType: "booking_request",
    relatedEntityId: bookingId,
    metadata: { bookingId },
    outboundEmailLogId: row.id,
  });
}

async function retryAbandonedGuestBookingRequest(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const bookingId = readString(metadata.bookingId) ?? row.related_entity_id;
  if (!bookingId) throw new Error("missing_booking_id");

  const { data: booking } = await admin
    .from("booking_requests")
    .select(
      "id, renter_id, status, lead_guest_name, lead_guest_email, check_in, check_out, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking?.lead_guest_email || booking.status !== "draft") {
    throw new Error("booking_not_recoverable");
  }

  await sendAbandonedGuestBookingRequestEmail({
    to: row.recipient_email,
    guestName: booking.lead_guest_name ?? undefined,
    resortName: booking.primary_resort?.name ?? undefined,
    checkIn: booking.check_in ?? undefined,
    checkOut: booking.check_out ?? undefined,
    resumeUrl: getAppUrl("/stay-builder", "abandoned booking request recovery link"),
    templateKey: row.template_key,
    recipientUserId: booking.renter_id ?? row.recipient_user_id,
    relatedEntityType: "booking_request",
    relatedEntityId: bookingId,
    metadata: { bookingId },
    outboundEmailLogId: row.id,
  });
}

async function retryOwnerMatchWaiting(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const bookingId = readString(metadata.bookingId);
  const matchId = readString(metadata.matchId) ?? row.related_entity_id;
  const ownerId = readString(metadata.ownerId);
  if (!bookingId || !matchId) throw new Error("missing_match_metadata");

  const { data: booking } = await admin
    .from("booking_requests")
    .select(
      "id, total_points, check_in, check_out, lead_guest_name, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) throw new Error("booking_not_found");

  let ownerName: string | null = null;
  if (ownerId) {
    const { data: owner } = await admin.from("owners").select("display_name").eq("id", ownerId).maybeSingle();
    ownerName = owner?.display_name ?? null;
  }

  await sendOwnerMatchEmail({
    to: row.recipient_email,
    ownerName: ownerName ?? undefined,
    guestName: booking.lead_guest_name ?? undefined,
    resortName: booking.primary_resort?.name ?? undefined,
    checkIn: booking.check_in ?? undefined,
    checkOut: booking.check_out ?? undefined,
    points: booking.total_points ?? undefined,
    acceptUrl: getAppUrl(`/api/matches/owner/accept?matchId=${matchId}`, "owner match accept link"),
    declineUrl: getAppUrl(`/api/matches/owner/decline?matchId=${matchId}`, "owner match decline link"),
    templateKey: row.template_key,
    relatedEntityType: "booking_match",
    relatedEntityId: matchId,
    metadata: {
      bookingId,
      matchId,
      ownerId,
    },
    outboundEmailLogId: row.id,
  });
}

async function retryOwnerMatchWaitingReminder(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const bookingId = readString(metadata.bookingId);
  const matchId = readString(metadata.matchId) ?? row.related_entity_id;
  const ownerId = readString(metadata.ownerId);
  if (!bookingId || !matchId) throw new Error("missing_match_metadata");

  const { data: match } = await admin
    .from("booking_matches")
    .select("id, status, responded_at")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || match.status !== "pending_owner" || match.responded_at) {
    throw new Error("match_not_recoverable");
  }

  const { data: booking } = await admin
    .from("booking_requests")
    .select(
      "id, status, availability_status, total_points, check_in, check_out, lead_guest_name, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.status !== "pending_owner" || (booking.availability_status && booking.availability_status !== "confirmed")) {
    throw new Error("booking_not_recoverable");
  }

  let ownerName: string | null = null;
  if (ownerId) {
    const { data: owner } = await admin.from("owners").select("display_name").eq("id", ownerId).maybeSingle();
    ownerName = owner?.display_name ?? null;
  }

  await sendOwnerMatchReminderEmail({
    to: row.recipient_email,
    ownerName: ownerName ?? undefined,
    guestName: booking.lead_guest_name ?? undefined,
    resortName: booking.primary_resort?.name ?? undefined,
    checkIn: booking.check_in ?? undefined,
    checkOut: booking.check_out ?? undefined,
    points: booking.total_points ?? undefined,
    acceptUrl: getAppUrl(`/api/matches/owner/accept?matchId=${matchId}`, "owner match reminder accept link"),
    declineUrl: getAppUrl(`/api/matches/owner/decline?matchId=${matchId}`, "owner match reminder decline link"),
    templateKey: row.template_key,
    relatedEntityType: "booking_match",
    relatedEntityId: matchId,
    metadata: {
      bookingId,
      matchId,
      ownerId,
      reminderHours: readNumber(metadata.reminderHours),
    },
    outboundEmailLogId: row.id,
  });
}

async function retryOwnerAgreementSigned(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const contractId = readNumber(metadata.contractId);
  if (!contractId) throw new Error("missing_contract_id");

  const { data: contract } = await admin
    .from("contracts")
    .select("id, booking_request_id, snapshot")
    .eq("id", contractId)
    .maybeSingle();

  const snapshot = (contract?.snapshot ?? {}) as Record<string, unknown>;
  const ownerEmail = readString(snapshot.ownerEmail);
  if (!ownerEmail) throw new Error("owner_email_missing");

  await sendOwnerAgreementSignedEmail({
    to: row.recipient_email,
    ownerName: readString(snapshot.ownerName) ?? undefined,
    guestName: readString(snapshot.renterName) ?? undefined,
    resortName: readString(snapshot.resortName) ?? undefined,
    checkIn: readString(snapshot.checkIn) ?? undefined,
    checkOut: readString(snapshot.checkOut) ?? undefined,
    rentalUrl: readString(snapshot.rentalId)
      ? getAppUrl(`/owner/rentals/${readString(snapshot.rentalId)}`, "owner signed agreement rental link")
      : null,
    templateKey: row.template_key,
    relatedEntityType: "contract",
    metadata: {
      contractId,
      bookingId: readString(metadata.bookingId),
      rentalId: readString(snapshot.rentalId),
    },
    outboundEmailLogId: row.id,
  });
}

async function retryGuestAgreementSigned(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const contractId = readNumber(metadata.contractId);
  if (!contractId) throw new Error("missing_contract_id");

  const { data: contract } = await admin
    .from("contracts")
    .select("id, guest_accept_token, snapshot")
    .eq("id", contractId)
    .maybeSingle();

  const snapshot = (contract?.snapshot ?? {}) as Record<string, unknown>;
  const parties = (snapshot.parties ?? {}) as Record<string, unknown>;
  const guestParty = (parties.guest ?? {}) as Record<string, unknown>;
  const guestEmail = readString(guestParty.email) ?? readString(snapshot.guestEmail);
  if (!guestEmail) throw new Error("guest_email_missing");

  await sendGuestAgreementSignedEmail({
    to: row.recipient_email,
    guestName: readString(snapshot.renterName) ?? undefined,
    resortName: readString(snapshot.resortName) ?? undefined,
    checkIn: readString(snapshot.checkIn) ?? undefined,
    checkOut: readString(snapshot.checkOut) ?? undefined,
    agreementUrl: contract?.guest_accept_token
      ? getAppUrl(`/contracts/${contract.guest_accept_token}`, "guest signed agreement link")
      : null,
    templateKey: row.template_key,
    relatedEntityType: "contract",
    metadata: {
      contractId,
      bookingId: readString(metadata.bookingId),
    },
    outboundEmailLogId: row.id,
  });
}

async function retryReadyStayBookingPackage(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const bookingId = readString(metadata.bookingId);
  const readyStayId = readString(metadata.readyStayId) ?? row.related_entity_id;
  if (!bookingId || !readyStayId) throw new Error("missing_ready_stay_metadata");

  const { data: readyStay } = await admin
    .from("ready_stays")
    .select("id, owner_id, check_in, check_out, points, room_type, resorts(name)")
    .eq("id", readyStayId)
    .maybeSingle();

  const { data: booking } = await admin
    .from("booking_requests")
    .select(
      "id, lead_guest_name, lead_guest_email, lead_guest_phone, requires_accessibility, comments, total_points, primary_room",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!readyStay || !booking) throw new Error("ready_stay_or_booking_missing");

  const { data: ownerProfile } = await admin.from("profiles").select("id, display_name").eq("id", readyStay.owner_id).maybeSingle();
  const { data: guestRows } = await admin
    .from("booking_request_guests")
    .select("first_name, last_name, age_category, age, email, phone")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  await sendReadyStayBookingPackageToOwner({
    to: row.recipient_email,
    ownerName: ownerProfile?.display_name ?? "Owner",
    resortName: readyStay.resorts?.name ?? null,
    roomType: readyStay.room_type ?? booking.primary_room ?? null,
    checkIn: readyStay.check_in ?? null,
    checkOut: readyStay.check_out ?? null,
    points: Number(readyStay.points ?? booking.total_points ?? 0) || null,
    guestName: booking.lead_guest_name ?? null,
    guestEmail: booking.lead_guest_email ?? null,
    guestPhone: booking.lead_guest_phone ?? null,
    accessibilityRequired: Boolean(booking.requires_accessibility),
    notes: booking.comments ?? null,
    guests:
      (guestRows ?? []).map((guest) => ({
        name: [guest.first_name, guest.last_name].filter(Boolean).join(" ").trim(),
        ageCategory: guest.age_category ?? null,
        age: guest.age ?? null,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
      })) ?? [],
    transferUrl: getAppUrl("/owner/ready-stays", "ready stay transfer link"),
    templateKey: row.template_key,
    recipientUserId: readyStay.owner_id,
    relatedEntityType: "ready_stay",
    relatedEntityId: readyStayId,
    metadata: {
      bookingId,
      readyStayId,
    },
    outboundEmailLogId: row.id,
  });
}

async function retryReadyStayLinkReady(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const bookingId = readString(metadata.bookingId) ?? row.related_entity_id;
  if (!bookingId) throw new Error("missing_booking_id");

  const { data: booking } = await admin
    .from("booking_requests")
    .select("id, renter_id, lead_guest_email, lead_guest_name, disney_confirmation_number")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking?.lead_guest_email || !booking.disney_confirmation_number) {
    throw new Error("booking_confirmation_not_ready");
  }

  const tripLink = `/my-trip/${bookingId}`;
  const tripLinkAbsolute = getAppUrl(tripLink, "ready stay guest trip link");

  await sendReadyStayLinkReadyEmail({
    to: row.recipient_email,
    guestName: booking.lead_guest_name ?? null,
    confirmationNumber: booking.disney_confirmation_number,
    tripUrl: tripLinkAbsolute ?? tripLink,
    templateKey: row.template_key,
    recipientUserId: booking.renter_id,
    relatedEntityType: "booking_request",
    relatedEntityId: bookingId,
    metadata: { bookingId },
    outboundEmailLogId: row.id,
  });
}

async function retryReadyStayRejected(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const readyStayId = readString(metadata.readyStayId) ?? row.related_entity_id;
  if (!readyStayId) throw new Error("missing_ready_stay_id");

  const { data: readyStay } = await admin
    .from("ready_stays")
    .select("id, owner_id, room_type, check_in, check_out, verification_review_notes, resorts(name)")
    .eq("id", readyStayId)
    .maybeSingle();
  const { data: ownerProfile } = readyStay?.owner_id
    ? await admin.from("profiles").select("id, display_name").eq("id", readyStay.owner_id).maybeSingle()
    : { data: null };

  if (!readyStay) throw new Error("ready_stay_not_found");
  const resortName = readyStay.resorts?.name ?? "your Ready Stay";
  const dates =
    readyStay.check_in && readyStay.check_out
      ? `${new Date(readyStay.check_in).toLocaleDateString()} - ${new Date(readyStay.check_out).toLocaleDateString()}`
      : "your submitted dates";
  const reason = readyStay.verification_review_notes?.trim();
  if (!reason) throw new Error("missing_rejection_reason");

  await sendReadyStayRejectedEmail({
    to: row.recipient_email,
    ownerName: ownerProfile?.display_name ?? "PixieDVC owner",
    resortName,
    roomType: readyStay.room_type ?? null,
    dates,
    reason,
    templateKey: row.template_key,
    recipientUserId: readyStay.owner_id,
    relatedEntityType: "ready_stay",
    relatedEntityId: readyStay.id,
    metadata: { readyStayId: readyStay.id },
    outboundEmailLogId: row.id,
  });
}

async function retryContractOwnerAgreement(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const contractId = readNumber(metadata.contractId);
  if (!contractId) throw new Error("missing_contract_id");

  const { data: contract } = await admin
    .from("contracts")
    .select("id, owner_id, owner_accept_token, snapshot")
    .eq("id", contractId)
    .maybeSingle();

  const snapshot = (contract?.snapshot ?? {}) as Record<string, unknown>;
  if (!contract) throw new Error("contract_not_found");

  const summary = (snapshot.summary ?? {}) as Record<string, unknown>;
  const parties = (snapshot.parties ?? {}) as Record<string, unknown>;
  const guest = (parties.guest ?? {}) as Record<string, unknown>;
  const owner = (parties.owner ?? {}) as Record<string, unknown>;

  await sendContractOwnerAgreementEmail({
    to: row.recipient_email,
    ownerName: readString(owner.fullName) ?? undefined,
    guestName: readString(guest.fullName) ?? undefined,
    resortName: readString(summary.resortName) ?? undefined,
    roomType: readString(summary.accommodationType) ?? undefined,
    checkIn: readString(summary.checkIn) ?? undefined,
    checkOut: readString(summary.checkOut) ?? undefined,
    points: readNumber(summary.pointsRented) ?? undefined,
    totalUsd: formatCurrency(readNumber(summary.totalPayableByGuestCents)),
    agreementUrl: contract.owner_accept_token
      ? getAppUrl(`/contracts/${contract.owner_accept_token}`, "contract owner accept link")
      : null,
    templateKey: row.template_key,
    relatedEntityType: "contract",
    relatedEntityId: String(contractId),
    metadata: {
      contractId,
      bookingId: readString(metadata.bookingId),
      ownerId: readString(metadata.ownerId),
    },
    outboundEmailLogId: row.id,
  });
}

async function retryContractOwnerAgreementReminder(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const contractId = readNumber(metadata.contractId);
  if (!contractId) throw new Error("missing_contract_id");

  const { data: contract } = await admin
    .from("contracts")
    .select("id, owner_id, status, owner_accept_token, owner_accepted_at, snapshot")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract || contract.status !== "sent" || contract.owner_accepted_at || !contract.owner_accept_token) {
    throw new Error("contract_not_recoverable");
  }

  const snapshot = (contract.snapshot ?? {}) as Record<string, unknown>;
  const summary = (snapshot.summary ?? {}) as Record<string, unknown>;
  const parties = (snapshot.parties ?? {}) as Record<string, unknown>;
  const guest = (parties.guest ?? {}) as Record<string, unknown>;
  const owner = (parties.owner ?? {}) as Record<string, unknown>;

  await sendContractOwnerAgreementReminderEmail({
    to: row.recipient_email,
    ownerName: readString(owner.fullName) ?? readString(snapshot.ownerName) ?? undefined,
    guestName: readString(guest.fullName) ?? undefined,
    resortName: readString(summary.resortName) ?? undefined,
    roomType: readString(summary.accommodationType) ?? undefined,
    checkIn: readString(summary.checkIn) ?? undefined,
    checkOut: readString(summary.checkOut) ?? undefined,
    points: readNumber(summary.pointsRented) ?? undefined,
    totalUsd: formatCurrency(readNumber(summary.totalPayableByGuestCents)),
    agreementUrl: getAppUrl(`/contracts/${contract.owner_accept_token}`, "contract owner reminder link"),
    templateKey: row.template_key,
    relatedEntityType: "contract",
    metadata: {
      contractId,
      bookingId: readString(metadata.bookingId),
      ownerId: readString(metadata.ownerId),
      recipientRole: "owner",
    },
    outboundEmailLogId: row.id,
  });
}

async function retryContractGuestAgreement(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const contractId = readNumber(metadata.contractId);
  if (!contractId) throw new Error("missing_contract_id");

  const { data: contract } = await admin
    .from("contracts")
    .select("id, guest_accept_token, snapshot")
    .eq("id", contractId)
    .maybeSingle();

  const snapshot = (contract?.snapshot ?? {}) as Record<string, unknown>;
  if (!contract) throw new Error("contract_not_found");

  const summary = (snapshot.summary ?? {}) as Record<string, unknown>;
  const parties = (snapshot.parties ?? {}) as Record<string, unknown>;
  const guest = (parties.guest ?? {}) as Record<string, unknown>;

  await sendContractGuestAgreementEmail({
    to: row.recipient_email,
    guestName: readString(guest.fullName) ?? undefined,
    resortName: readString(summary.resortName) ?? undefined,
    roomType: readString(summary.accommodationType) ?? undefined,
    checkIn: readString(summary.checkIn) ?? undefined,
    checkOut: readString(summary.checkOut) ?? undefined,
    points: readNumber(summary.pointsRented) ?? undefined,
    totalUsd: formatCurrency(readNumber(summary.totalPayableByGuestCents)),
    paidNowUsd: formatCurrency(readNumber(summary.paidNowCents)),
    agreementUrl: contract.guest_accept_token
      ? getAppUrl(`/contracts/${contract.guest_accept_token}`, "contract guest accept link")
      : null,
    templateKey: row.template_key,
    relatedEntityType: "contract",
    relatedEntityId: String(contractId),
    metadata: {
      contractId,
      bookingId: readString(metadata.bookingId),
      ownerId: readString(metadata.ownerId),
    },
    outboundEmailLogId: row.id,
  });
}

async function retryContractGuestAgreementReminder(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const metadata = coerceMetadata(row);
  const contractId = readNumber(metadata.contractId);
  if (!contractId) throw new Error("missing_contract_id");

  const { data: contract } = await admin
    .from("contracts")
    .select("id, status, guest_accept_token, guest_accepted_at, snapshot")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract || contract.status !== "sent" || contract.guest_accepted_at || !contract.guest_accept_token) {
    throw new Error("contract_not_recoverable");
  }

  const snapshot = (contract.snapshot ?? {}) as Record<string, unknown>;
  const summary = (snapshot.summary ?? {}) as Record<string, unknown>;
  const parties = (snapshot.parties ?? {}) as Record<string, unknown>;
  const guest = (parties.guest ?? {}) as Record<string, unknown>;
  const guestEmail = readString(guest.email) ?? readString(snapshot.guestEmail) ?? readString(snapshot.renterEmail);
  if (!guestEmail) throw new Error("guest_email_missing");

  await sendContractGuestAgreementReminderEmail({
    to: row.recipient_email,
    guestName: readString(guest.fullName) ?? readString(snapshot.renterName) ?? undefined,
    resortName: readString(summary.resortName) ?? undefined,
    roomType: readString(summary.accommodationType) ?? undefined,
    checkIn: readString(summary.checkIn) ?? undefined,
    checkOut: readString(summary.checkOut) ?? undefined,
    points: readNumber(summary.pointsRented) ?? undefined,
    totalUsd: formatCurrency(readNumber(summary.totalPayableByGuestCents)),
    paidNowUsd: formatCurrency(readNumber(summary.paidNowCents)),
    agreementUrl: getAppUrl(`/contracts/${contract.guest_accept_token}`, "contract guest reminder link"),
    templateKey: row.template_key,
    relatedEntityType: "contract",
    metadata: {
      contractId,
      bookingId: readString(metadata.bookingId),
      ownerId: readString(metadata.ownerId),
      recipientRole: "guest",
    },
    outboundEmailLogId: row.id,
  });
}

async function retryConciergeNotification(row: OutboundEmailRow) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("service_role_missing");
  const conversationId = row.related_entity_id;
  if (!conversationId) throw new Error("missing_conversation_id");

  const { data: conversation } = await admin
    .from("support_conversations")
    .select("id, guest_email")
    .eq("id", conversationId)
    .maybeSingle();
  const { data: lastGuestMessage } = await admin
    .from("support_messages")
    .select("content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) throw new Error("conversation_not_found");

  await sendConciergeHandoffNotification({
    conversationId,
    email: conversation.guest_email ?? row.recipient_email,
    message: lastGuestMessage?.content ?? null,
    source: row.template_key === "support_escalation" ? "escalate" : "handoff",
    templateKey: row.template_key,
    relatedEntityType: "support_conversation",
    relatedEntityId: conversationId,
    outboundEmailLogId: row.id,
    metadata: {
      source: row.template_key === "support_escalation" ? "escalate" : "handoff",
    },
  });
}

async function dispatchRetry(row: OutboundEmailRow) {
  switch (row.template_key) {
    case "abandoned_guest_booking_request":
      return retryAbandonedGuestBookingRequest(row);
    case "guest_booking_confirmation":
      return retryGuestBookingConfirmation(row);
    case "owner_match_waiting":
      return retryOwnerMatchWaiting(row);
    case "owner_match_waiting_reminder":
      return retryOwnerMatchWaitingReminder(row);
    case "contract_owner_agreement":
      return retryContractOwnerAgreement(row);
    case "contract_owner_agreement_reminder":
      return retryContractOwnerAgreementReminder(row);
    case "contract_guest_agreement":
      return retryContractGuestAgreement(row);
    case "contract_guest_agreement_reminder":
      return retryContractGuestAgreementReminder(row);
    case "owner_agreement_signed":
      return retryOwnerAgreementSigned(row);
    case "guest_agreement_signed":
      return retryGuestAgreementSigned(row);
    case "ready_stay_booking_package":
      return retryReadyStayBookingPackage(row);
    case "ready_stay_link_ready":
      return retryReadyStayLinkReady(row);
    case "ready_stay_rejected":
      return retryReadyStayRejected(row);
    case "concierge_handoff":
    case "support_escalation":
      return retryConciergeNotification(row);
    default:
      throw new Error(`unsupported_template:${row.template_key}`);
  }
}

function formatCurrency(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

export async function retryOutboundEmail(id: string): Promise<RetryResult> {
  const { admin, row } = await loadOutboundEmail(id);
  if (!admin) {
    return { ok: false, status: 500, error: "Missing service role key.", row: null };
  }
  if (!row) {
    return { ok: false, status: 404, error: "Outbound email log not found.", row: null };
  }
  if (row.status !== "failed") {
    return { ok: false, status: 400, error: "Only failed emails can be retried.", row };
  }
  if ((row.retry_count ?? 0) >= MAX_RETRY_COUNT) {
    return { ok: false, status: 400, error: "Retry limit reached for this email.", row };
  }
  if (row.last_retry_at) {
    const elapsedMs = Date.now() - new Date(row.last_retry_at).getTime();
    if (Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs < RETRY_COOLDOWN_MS) {
      return { ok: false, status: 429, error: "Please wait a few seconds before retrying again.", row };
    }
  }

  const pendingRow = await markRetryStarted(admin, row);
  if (!pendingRow) {
    return { ok: false, status: 409, error: "This email is already being retried or was updated.", row };
  }

  try {
    await dispatchRetry(pendingRow);
  } catch (error) {
    await admin
      .from("outbound_emails")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "Unknown retry error",
      })
      .eq("id", pendingRow.id);
  }

  const refreshed = await refetchRow(admin, pendingRow.id);
  if (!refreshed) {
    return { ok: false, status: 500, error: "Email log disappeared during retry.", row: null };
  }

  if (refreshed.status !== "sent") {
    return {
      ok: false,
      status: 422,
      error: refreshed.error_message ?? "Retry failed.",
      row: refreshed,
    };
  }

  return { ok: true, row: refreshed };
}
