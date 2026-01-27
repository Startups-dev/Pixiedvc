import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getMilestoneStatus } from "@/lib/owner-portal";
import type { RequestCookies } from "next/dist/compiled/@edge-runtime/cookies";

export type OwnerProfile = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  payout_email: string | null;
  verification: string | null;
  profile_display_name: string | null;
};

export type OwnerMembership = {
  id: string;
  owner_id: string;
  resort_id: string | null;
  home_resort: string | null;
  use_year: string | null;
  use_year_start: string | null;
  use_year_end: string | null;
  contract_year: number | null;
  points_owned: number | null;
  points_available: number | null;
  points_reserved: number | null;
  points_rented: number | null;
  points_expiration_date: string | null;
  created_at?: string | null;
  resort: { name: string; slug: string; calculator_code: string | null } | null;
};

export type RentalRow = {
  id: string;
  owner_user_id: string;
  guest_user_id: string | null;
  resort_code: string;
  room_type: string | null;
  check_in: string | null;
  check_out: string | null;
  points_required: number | null;
  rental_amount_cents: number | null;
  owner_base_rate_per_point_cents?: number | null;
  owner_premium_per_point_cents?: number | null;
  owner_rate_per_point_cents?: number | null;
  owner_total_cents?: number | null;
  owner_home_resort_premium_applied?: boolean | null;
  status: string;
  created_at: string;
  booking_package?: Record<string, unknown> | null;
  lead_guest_name?: string | null;
  lead_guest_email?: string | null;
  lead_guest_phone?: string | null;
  lead_guest_address?: Record<string, unknown> | null;
  party_size?: number | null;
  adults?: number | null;
  youths?: number | null;
  special_needs?: boolean | null;
  special_needs_notes?: string | null;
  guest_display_name?: string | null;
  rental_milestones?: { code: string; status: string; occurred_at: string | null }[];
};

export type RentalDocumentRow = {
  id: string;
  type: string;
  storage_path: string;
  uploaded_by_user_id: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
  signed_url?: string | null;
};

export type PayoutLedgerRow = {
  id: string;
  rental_id: string;
  owner_user_id: string;
  stage: number;
  amount_cents: number;
  status: string;
  eligible_at: string | null;
  released_at: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type RentalExceptionRow = {
  id: string;
  rental_id: string;
  owner_user_id: string;
  type: string;
  message: string | null;
  status: string;
  created_at: string;
};

export type BookingRequestGuestRow = {
  id: string;
  booking_id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  age_category: string | null;
  age: number | null;
  created_at: string;
};

export type OwnerMatchRow = {
  id: string;
  status: string;
  points_reserved: number | null;
  created_at: string;
  expires_at: string | null;
  owner_base_rate_per_point_cents?: number | null;
  owner_premium_per_point_cents?: number | null;
  owner_rate_per_point_cents?: number | null;
  owner_total_cents?: number | null;
  owner_home_resort_premium_applied?: boolean | null;
  rental_id?: string | null;
  booking: {
    id: string;
    check_in: string | null;
    check_out: string | null;
    total_points: number | null;
    guest_total_cents?: number | null;
    guest_rate_per_point_cents?: number | null;
    primary_room: string | null;
    primary_view: string | null;
    lead_guest_name: string | null;
    lead_guest_email: string | null;
    lead_guest_phone: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    adults: number | null;
    youths: number | null;
    requires_accessibility: boolean | null;
    comments: string | null;
    deposit_due: number | null;
    deposit_paid: number | null;
    deposit_currency: string | null;
    primary_resort: { id: string; name: string | null; slug: string | null; calculator_code: string | null } | null;
  } | null;
};

async function getOwnerIdentity(userId: string, cookieStore?: RequestCookies) {
  const adminClient = getSupabaseAdminClient();
  const supabase = adminClient ?? (await getServerClient(cookieStore));
  const { data: owner } = await supabase
    .from("owners")
    .select("id, user_id")
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle();
  return { owner, supabase, adminClient };
}

async function getServerClient(cookieStore?: RequestCookies) {
  return createSupabaseServerClient();
}

export async function getOwnerProfile(userId: string, cookieStore?: RequestCookies) {
  const supabase = await getServerClient(cookieStore);
  const { data } = await supabase
    .from("owners")
    .select("id, user_id, display_name, payout_email, verification, profiles:profiles(display_name)")
    .or(`id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    user_id: data.user_id ?? null,
    display_name: data.display_name ?? null,
    payout_email: data.payout_email ?? null,
    verification: data.verification ?? null,
    profile_display_name: data.profiles?.display_name ?? null,
  } satisfies OwnerProfile;
}

export async function getOwnerMemberships(userId: string, cookieStore?: RequestCookies) {
  const { owner, supabase, adminClient } = await getOwnerIdentity(userId, cookieStore);
  if (!owner) return [];

  const client = adminClient ?? supabase;
  const { data } = await client
    .from("owner_memberships")
    .select(
      "id, owner_id, resort_id, home_resort, use_year, use_year_start, use_year_end, contract_year, points_owned, points_available, points_reserved, points_rented, points_expiration_date, created_at, resort:resorts(name, slug, calculator_code)",
    )
    .eq("owner_id", owner.id)
    .order("created_at", { ascending: true });

  return (data ?? []) as OwnerMembership[];
}

export async function getOwnerRentals(userId: string, cookieStore?: RequestCookies) {
  const supabase = await getServerClient(cookieStore);
  const { data } = await supabase
    .from("rentals")
    .select(
      "*, rental_milestones(code, status, occurred_at)",
    )
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });

  const rentals = (data ?? []) as RentalRow[];
  const guestIds = Array.from(
    new Set(rentals.map((rental) => rental.guest_user_id).filter((id): id is string => Boolean(id))),
  );

  if (!guestIds.length) {
    return rentals;
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return rentals;
  }

  const { data: guestProfiles } = await adminClient
    .from("profiles")
    .select("id, display_name, email")
    .in("id", guestIds);

  const guestLookup = new Map(
    (guestProfiles ?? []).map((profile) => [
      profile.id as string,
      profile.display_name ?? profile.email ?? null,
    ]),
  );

  return rentals.map((rental) => ({
    ...rental,
    guest_display_name: rental.guest_user_id ? guestLookup.get(rental.guest_user_id) ?? null : null,
  }));
}

export async function getOwnerRentalDetail(userId: string, rentalId: string, cookieStore?: RequestCookies) {
  const supabase = await getServerClient(cookieStore);
  const { data } = await supabase
    .from("rentals")
    .select(
      "*, rental_milestones(code, status, occurred_at, meta), rental_documents(id, type, storage_path, uploaded_by_user_id, created_at, meta), payout_ledger(id, rental_id, owner_user_id, stage, amount_cents, status, eligible_at, released_at, created_at), rental_exceptions(id, rental_id, owner_user_id, type, message, status, created_at)",
    )
    .eq("owner_user_id", userId)
    .eq("id", rentalId)
    .maybeSingle();

  if (!data) return null;

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { ...data, guest_display_name: null };
  }

  let enrichedData = { ...data };
  const bookingPackage = (data.booking_package ?? {}) as Record<string, unknown>;
  const needsBookingPackage =
    !data.booking_package ||
    Object.keys(bookingPackage).length === 0 ||
    (!data.lead_guest_name && !data.lead_guest_email && !data.lead_guest_phone);

  if (needsBookingPackage && data.match_id) {
    const { data: match } = await adminClient
      .from("booking_matches")
      .select("booking_id")
      .eq("id", data.match_id)
      .maybeSingle();

    if (match?.booking_id) {
      const { data: booking } = await adminClient
        .from("booking_requests")
        .select(
          "id, renter_id, check_in, check_out, primary_room, primary_view, total_points, max_price_per_point, est_cash, guest_total_cents, guest_rate_per_point_cents, adults, youths, requires_accessibility, comments, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, address_line2, city, state, postal_code, country, deposit_due, deposit_paid, deposit_currency, primary_resort:resorts!booking_requests_primary_resort_id_fkey(slug, calculator_code, name)",
        )
        .eq("id", match.booking_id)
        .maybeSingle();

      const resortMeta = booking?.primary_resort ?? null;
      if (booking) {
        const bookingPayload = {
          booking_request_id: booking.id,
          resort_name: resortMeta?.name ?? null,
          resort_code: resortMeta?.calculator_code ?? resortMeta?.slug ?? null,
          room_type: booking.primary_room ?? null,
          room_view: booking.primary_view ?? null,
          check_in: booking.check_in ?? null,
          check_out: booking.check_out ?? null,
          points_required: booking.total_points ?? null,
          lead_guest_name: booking.lead_guest_name ?? null,
          lead_guest_email: booking.lead_guest_email ?? null,
          lead_guest_phone: booking.lead_guest_phone ?? null,
          lead_guest_address: {
            line1: booking.address_line1 ?? null,
            line2: booking.address_line2 ?? null,
            city: booking.city ?? null,
            state: booking.state ?? null,
            postal: booking.postal_code ?? null,
            country: booking.country ?? null,
          },
          party_size:
            typeof booking.adults === "number" && typeof booking.youths === "number"
              ? booking.adults + booking.youths
              : null,
          adults: booking.adults ?? null,
          youths: booking.youths ?? null,
          requires_accessibility: booking.requires_accessibility ?? false,
          comments: booking.comments ?? null,
          deposit_due: booking.deposit_due ?? null,
          deposit_paid: booking.deposit_paid ?? null,
          deposit_currency: booking.deposit_currency ?? "USD",
          max_price_per_point: booking.max_price_per_point ?? null,
          est_cash: booking.est_cash ?? null,
          guest_total_cents: booking.guest_total_cents ?? null,
          guest_rate_per_point_cents: booking.guest_rate_per_point_cents ?? null,
        };

        enrichedData = {
          ...enrichedData,
          booking_package: bookingPayload,
          lead_guest_name: enrichedData.lead_guest_name ?? booking.lead_guest_name ?? null,
          lead_guest_email: enrichedData.lead_guest_email ?? booking.lead_guest_email ?? null,
          lead_guest_phone: enrichedData.lead_guest_phone ?? booking.lead_guest_phone ?? null,
          lead_guest_address: enrichedData.lead_guest_address ?? bookingPayload.lead_guest_address,
          party_size: enrichedData.party_size ?? bookingPayload.party_size,
          adults: enrichedData.adults ?? booking.adults ?? null,
          youths: enrichedData.youths ?? booking.youths ?? null,
          special_needs: enrichedData.special_needs ?? booking.requires_accessibility ?? false,
          special_needs_notes: enrichedData.special_needs_notes ?? booking.comments ?? null,
        };
      }
    }
  }

  if (!enrichedData.guest_user_id) {
    return { ...enrichedData, guest_display_name: null };
  }

  const { data: guestProfile } = await adminClient
    .from("profiles")
    .select("id, display_name, email")
    .eq("id", data.guest_user_id)
    .maybeSingle();

  return {
    ...enrichedData,
    guest_display_name: guestProfile?.display_name ?? guestProfile?.email ?? null,
  };
}

export async function getOwnerPayouts(userId: string, cookieStore?: RequestCookies) {
  const supabase = await getServerClient(cookieStore);
  const { data } = await supabase
    .from("payout_ledger")
    .select("id, rental_id, owner_user_id, stage, amount_cents, status, eligible_at, released_at, created_at")
    .eq("owner_user_id", userId)
    .order("eligible_at", { ascending: false });

  return (data ?? []) as PayoutLedgerRow[];
}

export async function getOwnerMatches(userId: string, cookieStore?: RequestCookies) {
  const { owner, supabase, adminClient } = await getOwnerIdentity(userId, cookieStore);
  if (!owner) return [];

  const client = adminClient ?? supabase;
  const { data } = await client
    .from("booking_matches")
    .select(
      `
        id,
        status,
        points_reserved,
        created_at,
        expires_at,
        owner_base_rate_per_point_cents,
        owner_premium_per_point_cents,
        owner_rate_per_point_cents,
        owner_total_cents,
        owner_home_resort_premium_applied,
        booking:booking_requests(
          id,
          check_in,
          check_out,
          total_points,
          guest_total_cents,
          guest_rate_per_point_cents,
          primary_room,
          primary_view,
          lead_guest_name,
          lead_guest_email,
          lead_guest_phone,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country,
          adults,
          youths,
          requires_accessibility,
          comments,
          deposit_due,
          deposit_paid,
          deposit_currency,
          primary_resort:resorts!booking_requests_primary_resort_id_fkey(id, name, slug, calculator_code)
        )
      `,
    )
    .eq("owner_id", owner.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as OwnerMatchRow[];
}

export async function getOwnerMatchDetail(userId: string, matchId: string, cookieStore?: RequestCookies) {
  const { owner, supabase, adminClient } = await getOwnerIdentity(userId, cookieStore);
  if (!owner) return null;

  const client = adminClient ?? supabase;
  const { data: match } = await client
    .from("booking_matches")
    .select(
      `
        id,
        status,
        points_reserved,
        created_at,
        expires_at,
        owner_base_rate_per_point_cents,
        owner_premium_per_point_cents,
        owner_rate_per_point_cents,
        owner_total_cents,
        owner_home_resort_premium_applied,
        booking:booking_requests(
          id,
          check_in,
          check_out,
          total_points,
          guest_total_cents,
          guest_rate_per_point_cents,
          primary_room,
          primary_view,
          lead_guest_name,
          lead_guest_email,
          lead_guest_phone,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country,
          adults,
          youths,
          requires_accessibility,
          comments,
          deposit_due,
          deposit_paid,
          deposit_currency,
          primary_resort:resorts!booking_requests_primary_resort_id_fkey(id, name, slug, calculator_code)
        )
      `,
    )
    .eq("id", matchId)
    .eq("owner_id", owner.id)
    .maybeSingle();

  if (!match) return null;

  const { data: rental } = await client
    .from("rentals")
    .select("id")
    .eq("match_id", matchId)
    .maybeSingle();

  (match as OwnerMatchRow).rental_id = rental?.id ?? null;

  const bookingId = (match as OwnerMatchRow).booking?.id;
  if (!bookingId) {
    return { match: match as OwnerMatchRow, guests: [] as BookingRequestGuestRow[] };
  }

  const { data: guests } = await client
    .from("booking_request_guests")
    .select("id, booking_id, title, first_name, last_name, email, phone, age_category, age, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  return { match: match as OwnerMatchRow, guests: (guests ?? []) as BookingRequestGuestRow[] };
}

export async function getOwnerNotifications(userId: string, cookieStore?: RequestCookies) {
  const supabase = await getServerClient(cookieStore);
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []) as NotificationRow[];
}

export async function getRentalDocumentUrls(
  documents: RentalDocumentRow[],
  expiresInSeconds = 3600,
  cookieStore?: RequestCookies,
) {
  if (!documents.length) return documents;
  const supabase = await getServerClient(cookieStore);

  const signed = await Promise.all(
    documents.map(async (doc) => {
      if (!doc.storage_path) return { ...doc, signed_url: null };
      const { data } = await supabase
        .storage
        .from("rental-docs")
        .createSignedUrl(doc.storage_path, expiresInSeconds);
      return { ...doc, signed_url: data?.signedUrl ?? null };
    }),
  );

  return signed;
}

export function getDisplayName(owner: OwnerProfile | null, fallbackEmail: string | null) {
  return owner?.display_name ?? owner?.profile_display_name ?? fallbackEmail ?? "Owner";
}

export function getPointsSummary(memberships: OwnerMembership[]) {
  return memberships.reduce(
    (acc, membership) => {
      const available = membership.points_available ?? 0;
      const reserved = membership.points_reserved ?? 0;
      const rented = membership.points_rented ?? 0;
      acc.available += Math.max(available - reserved - rented, 0);
      acc.reserved += reserved;
      acc.rented += rented;
      return acc;
    },
    { available: 0, reserved: 0, rented: 0 },
  );
}

export function getNextExpiringMembership(memberships: OwnerMembership[]) {
  const withDates = memberships
    .filter((membership) => membership.points_expiration_date)
    .map((membership) => ({
      ...membership,
      expiry: new Date(membership.points_expiration_date as string).getTime(),
    }))
    .filter((membership) => !Number.isNaN(membership.expiry));

  if (!withDates.length) return null;
  return withDates.sort((a, b) => a.expiry - b.expiry)[0];
}

export async function ensurePointsExpiringNotification(userId: string, memberships: OwnerMembership[]) {
  const expiring = memberships.filter((membership) => {
    if (!membership.points_expiration_date) return false;
    const expiry = new Date(membership.points_expiration_date).getTime();
    if (Number.isNaN(expiry)) return false;
    const daysLeft = (expiry - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 45;
  });

  if (!expiring.length) return;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return;

  const { data: existing } = await adminClient
    .from("notifications")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("type", "points_expiring")
    .is("read_at", null)
    .limit(1);

  if (existing && existing.length > 0) return;

  const next = expiring[0];
  const dateLabel = next.points_expiration_date ? new Date(next.points_expiration_date).toLocaleDateString() : "soon";

  await adminClient
    .from("notifications")
    .insert({
      user_id: userId,
      type: "points_expiring",
      title: "Points expiring soon",
      body: `Your ${next.resort?.name ?? "membership"} points expire on ${dateLabel}.`,
      link: "/owner/dashboard",
    });
}

export async function ensureApprovalNotifications(userId: string, rentals: RentalRow[]) {
  const needsApproval = rentals.some(
    (rental) => getMilestoneStatus("owner_approved", (rental.rental_milestones ?? []) as any) !== "completed",
  );

  if (!needsApproval) return;
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return;

  const { data: existing } = await adminClient
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "approval_needed")
    .is("read_at", null)
    .limit(1);

  if (existing && existing.length > 0) return;

  await adminClient
    .from("notifications")
    .insert({
      user_id: userId,
      type: "approval_needed",
      title: "Approval needed",
      body: "A booking package is waiting for your approval.",
      link: "/owner/rentals",
    });
}
