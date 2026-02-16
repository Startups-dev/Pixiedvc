import type { SupabaseClient } from "@supabase/supabase-js";
import { getActivePromotion } from "@/lib/pricing-promotions";

export function getGuestPerksDiscountPct(completedBookingCount: number) {
  if (completedBookingCount <= 1) return 0;
  if (completedBookingCount === 2) return 10;
  if (completedBookingCount === 3) return 20;
  if (completedBookingCount === 4) return 30;
  return 40;
}

export function isGuestPerksEnrolled(profile: { guest_rewards_enrolled_at?: string | null } | null) {
  return Boolean(profile?.guest_rewards_enrolled_at);
}

async function getGuestEnrollmentFlag(adminClient: SupabaseClient) {
  const { data, error } = await adminClient
    .from("app_settings")
    .select("value")
    .eq("key", "promotions_guest_enrollment_enabled")
    .maybeSingle();

  if (error) {
    return { enabled: true, error };
  }

  const value = (data?.value ?? null) as { enabled?: boolean } | null;
  return { enabled: value?.enabled ?? true, error: null };
}

export async function maybeEnrollGuestRewardsForBooking(params: {
  adminClient: SupabaseClient;
  bookingRequestId: string;
}) {
  const { adminClient, bookingRequestId } = params;

  const { data: booking, error: bookingError } = await adminClient
    .from("booking_requests")
    .select("id, renter_id")
    .eq("id", bookingRequestId)
    .maybeSingle();

  if (bookingError || !booking?.renter_id) {
    return { enrolled: false, error: bookingError ?? null };
  }

  const { enabled, error: flagError } = await getGuestEnrollmentFlag(adminClient);
  if (flagError) {
    return { enrolled: false, error: flagError };
  }

  if (!enabled) {
    console.info("[guest-rewards] enrollment blocked (flag off)", {
      booking_request_id: bookingRequestId,
    });
    return { enrolled: false, error: null };
  }

  const { data: activePromotion, error: promoError } = await getActivePromotion({ adminClient });
  if (promoError) {
    return { enrolled: false, error: promoError };
  }

  if (!activePromotion) {
    console.info("[guest-rewards] enrollment blocked (no active promotion)", {
      booking_request_id: bookingRequestId,
    });
    return { enrolled: false, error: null };
  }

  const { data: updated, error } = await adminClient
    .from("profiles")
    .update({ guest_rewards_enrolled_at: new Date().toISOString() })
    .eq("id", booking.renter_id)
    .is("guest_rewards_enrolled_at", null)
    .select("guest_rewards_enrolled_at")
    .maybeSingle();

  if (error) {
    return { enrolled: false, error };
  }

  return { enrolled: Boolean(updated?.guest_rewards_enrolled_at), error: null };
}

export async function countCompletedGuestBookings(params: {
  adminClient: SupabaseClient;
  renterId: string;
}) {
  const { adminClient, renterId } = params;

  const { data: rentals, error: rentalsError } = await adminClient
    .from("rentals")
    .select("id")
    .eq("guest_user_id", renterId);

  if (rentalsError) {
    return { count: 0, error: rentalsError };
  }

  const rentalIds = (rentals ?? []).map((row) => row.id).filter(Boolean);
  if (rentalIds.length === 0) {
    return { count: 0, error: null };
  }

  const { count, error } = await adminClient
    .from("rental_milestones")
    .select("rental_id", { count: "exact", head: true })
    .eq("code", "check_out")
    .eq("status", "completed")
    .in("rental_id", rentalIds);

  if (error) {
    return { count: 0, error };
  }

  return { count: count ?? 0, error: null };
}
