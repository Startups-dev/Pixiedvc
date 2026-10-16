import type { SupabaseClient } from "@supabase/supabase-js";

import { getActiveFoundingOwnerBonusCents, type FoundingOwnerBonusFields } from "@/lib/founding-owner-bonus";
import { getActivePromotion } from "@/lib/pricing-promotions";

export function computeReadyStayOwnerPayout(params: {
  points: number;
  standardRateCents: number;
  owner: FoundingOwnerBonusFields | null;
  soldAt: Date;
}) {
  const { points, standardRateCents, owner, soldAt } = params;
  if (!Number.isInteger(points) || points <= 0 || !Number.isInteger(standardRateCents) || standardRateCents <= 0) {
    throw new Error("invalid_ready_stay_payout_inputs");
  }
  const bonusCents = getActiveFoundingOwnerBonusCents(owner, soldAt);
  const rateCents = standardRateCents + bonusCents;
  return { standardRateCents, bonusCents, rateCents, totalCents: points * rateCents };
}

export async function lockReadyStayOwnerPayout(params: {
  adminClient: SupabaseClient;
  readyStayId: string;
  bookingId: string;
  soldAt: Date;
}) {
  const { adminClient, readyStayId, bookingId, soldAt } = params;
  const { data: stay, error: stayError } = await adminClient.from("ready_stays")
    .select("id, owner_id, rental_id, points, owner_price_per_point_cents, guest_price_per_point_cents, booking_request_id, sold_booking_request_id")
    .eq("id", readyStayId).maybeSingle();
  if (stayError) throw new Error(stayError.message);
  if (!stay || !stay.rental_id) throw new Error("ready_stay_rental_missing");
  const linkedBookingId = stay.sold_booking_request_id ?? stay.booking_request_id;
  if (linkedBookingId && linkedBookingId !== bookingId) throw new Error("ready_stay_booking_mismatch");

  let { data: owner, error: ownerError } = await adminClient.from("owners")
    .select("id, founding_owner_bonus_cents_per_point, founding_owner_bonus_started_at, founding_owner_bonus_expires_at")
    .eq("user_id", stay.owner_id).maybeSingle();
  if (ownerError) throw new Error(ownerError.message);
  if (!owner) {
    ({ data: owner, error: ownerError } = await adminClient.from("owners")
      .select("id, founding_owner_bonus_cents_per_point, founding_owner_bonus_started_at, founding_owner_bonus_expires_at")
      .eq("id", stay.owner_id).maybeSingle());
    if (ownerError) throw new Error(ownerError.message);
  }

  const payout = computeReadyStayOwnerPayout({
    points: Number(stay.points),
    standardRateCents: Number(stay.owner_price_per_point_cents),
    owner,
    soldAt,
  });
  const { data: rental, error: rentalError } = await adminClient.from("rentals")
    .select("id, match_id, rental_amount_cents")
    .eq("id", stay.rental_id).maybeSingle();
  if (rentalError) throw new Error(rentalError.message);
  if (!rental || rental.match_id) throw new Error("ready_stay_rental_mismatch");
  if (rental.rental_amount_cents != null) {
    if (rental.rental_amount_cents !== payout.totalCents) {
      console.warn("[founding-owner] existing Ready Stay payout differs", {
        ready_stay_id: stay.id, rental_id: rental.id,
        stored_cents: rental.rental_amount_cents, calculated_cents: payout.totalCents,
      });
    }
    return rental.rental_amount_cents;
  }

  const { data: updated, error: updateError } = await adminClient.from("rentals")
    .update({
      owner_base_rate_per_point_cents: payout.standardRateCents,
      owner_premium_per_point_cents: 0,
      owner_home_resort_premium_applied: false,
      owner_rate_per_point_cents: payout.rateCents,
      owner_total_cents: payout.totalCents,
      rental_amount_cents: payout.totalCents,
    })
    .eq("id", rental.id).is("rental_amount_cents", null)
    .select("id").maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!updated) throw new Error("ready_stay_payout_concurrent_update");
  const guestRate = Number(stay.guest_price_per_point_cents);
  const { data: marginPromotion } = await getActivePromotion({ adminClient });
  const minSpreadCents = marginPromotion?.min_spread_per_point_cents ?? 0;
  const spreadCents = guestRate - payout.rateCents;
  if (Number.isFinite(guestRate) && spreadCents < minSpreadCents) {
    console.warn("[founding-owner] Ready Stay margin shortfall", {
      ready_stay_id: stay.id,
      spread_cents_per_point: spreadCents,
      minimum_spread_cents_per_point: minSpreadCents,
      shortfall_cents_per_point: minSpreadCents - spreadCents,
      founding_bonus_cents_per_point: payout.bonusCents,
    });
  }
  return payout.totalCents;
}
