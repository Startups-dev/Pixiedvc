"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { ensureGuestAgreementForBooking } from "@/server/contracts";

export async function continueReadyStayToAgreement(input: {
  readyStayId: string;
  lockSessionId: string;
  bookingId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new Error("Booking is temporarily unavailable.");
  }

  const { data: stay } = await adminClient
    .from("ready_stays")
    .select("id, owner_id, rental_id, resort_id, check_in, check_out, points, room_type, guest_price_per_point_cents, status")
    .eq("id", input.readyStayId)
    .eq("status", "active")
    .maybeSingle();

  if (!stay) {
    throw new Error("Ready Stay is no longer active.");
  }

  const { data: bookingRequest } = await adminClient
    .from("booking_requests")
    .select("id, renter_id")
    .eq("id", input.bookingId)
    .eq("renter_id", user.id)
    .maybeSingle();

  if (!bookingRequest) {
    throw new Error("Booking package not found.");
  }

  await adminClient
    .from("booking_requests")
    .update({
      primary_resort_id: stay.resort_id,
      primary_room: stay.room_type,
      check_in: stay.check_in,
      check_out: stay.check_out,
      total_points: stay.points,
      guest_rate_per_point_cents: stay.guest_price_per_point_cents,
      guest_total_cents: Number(stay.points ?? 0) * Number(stay.guest_price_per_point_cents ?? 0),
      renter_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.bookingId)
    .or(`renter_id.eq.${user.id},renter_id.is.null`);

  await adminClient
    .from("ready_stays")
    .update({
      booking_request_id: input.bookingId,
      lock_session_id: input.bookingId,
      locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.readyStayId)
    .eq("status", "active");

  let { data: ownerRecord } = await adminClient
    .from("owners")
    .select("id, user_id")
    .eq("id", stay.owner_id)
    .maybeSingle();

  if (!ownerRecord) {
    const { data: fallbackOwnerRecord } = await adminClient
      .from("owners")
      .select("id, user_id")
      .eq("user_id", stay.owner_id)
      .maybeSingle();
    ownerRecord = fallbackOwnerRecord ?? null;
  }

  if (!ownerRecord) {
    throw new Error("Owner record not found.");
  }

  const contract = await ensureGuestAgreementForBooking({
    supabase: adminClient,
    ownerId: ownerRecord.id,
    bookingRequestId: input.bookingId,
    rentalId: stay.rental_id,
  });

  if (contract?.contractId) {
    const { data: existingContract } = await adminClient
      .from("contracts")
      .select("snapshot")
      .eq("id", contract.contractId)
      .maybeSingle();

    const snapshot = ((existingContract?.snapshot as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >;
    const metadata = (snapshot.metadata as Record<string, unknown> | undefined) ?? {};

    await adminClient
      .from("contracts")
      .update({
        snapshot: {
          ...snapshot,
          metadata: {
            ...metadata,
            ready_stay: true,
          },
        },
      })
      .eq("id", contract.contractId);
  }

  if (!contract?.guestAcceptToken) {
    throw new Error("Agreement could not be created.");
  }

  return {
    guestAcceptToken: contract.guestAcceptToken,
    agreementPath: `/ready-stays/${input.readyStayId}/agreement?lock=${encodeURIComponent(input.lockSessionId)}`,
  };
}

export async function saveReadyStayTravelerDetails(input: {
  bookingId: string;
  title?: string;
  firstName: string;
  middleInitial?: string;
  lastName: string;
  suffix?: string;
  email: string;
  confirmEmail: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  marketingSource?: string;
  notes?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  if (input.email !== input.confirmEmail) {
    throw new Error("Emails do not match");
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new Error("Booking is temporarily unavailable.");
  }

  const payload = {
    lead_guest_name: [input.title, input.firstName, input.middleInitial, input.lastName, input.suffix]
      .filter(Boolean)
      .join(" ")
      .trim(),
    lead_guest_title: input.title?.trim() || null,
    lead_guest_middle_initial: input.middleInitial?.trim() || null,
    lead_guest_suffix: input.suffix?.trim() || null,
    lead_guest_email: input.email,
    lead_guest_phone: input.phone,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2 ?? null,
    city: input.city,
    state: input.state,
    postal_code: input.postalCode,
    country: input.country,
    marketing_source: input.marketingSource ?? null,
    comments: input.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await adminClient
    .from("booking_requests")
    .update(payload)
    .eq("id", input.bookingId)
    .eq("renter_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveReadyStayGuestRoster(input: {
  bookingId: string;
  guests: {
    title?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    ageCategory: "adult" | "youth";
    age?: number | null;
  }[];
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new Error("Booking is temporarily unavailable.");
  }

  const filtered = input.guests.filter((guest) => guest.firstName.trim() && guest.lastName.trim());
  const missingChildAge = filtered.find(
    (guest) => guest.ageCategory === "youth" && (!guest.age || guest.age <= 0),
  );
  if (missingChildAge) {
    throw new Error("Please enter the age for each child guest.");
  }

  const adults = filtered.filter((guest) => guest.ageCategory === "adult").length;
  const youths = filtered.filter((guest) => guest.ageCategory === "youth").length;

  const { error: updateError } = await adminClient
    .from("booking_requests")
    .update({ adults, youths, updated_at: new Date().toISOString() })
    .eq("id", input.bookingId)
    .eq("renter_id", user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await adminClient.from("booking_request_guests").delete().eq("booking_id", input.bookingId);

  if (filtered.length) {
    const rows = filtered.map((guest) => ({
      booking_id: input.bookingId,
      title: guest.title ?? null,
      first_name: guest.firstName,
      last_name: guest.lastName,
      email: guest.email ?? null,
      phone: guest.phone ?? null,
      age_category: guest.ageCategory,
      age: guest.age ?? null,
    }));
    const { error } = await adminClient.from("booking_request_guests").insert(rows);
    if (error) {
      throw new Error(error.message);
    }
  }
}
