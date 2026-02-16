import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveCalculatorCode } from "@/lib/resort-calculator";
import { computeOwnerPayout } from "@/lib/pricing";
import {
  countCompletedGuestBookings,
  getGuestPerksDiscountPct,
  isGuestPerksEnrolled,
} from "@/lib/guest-rewards";
import {
  applyOwnerBonusWithMargin,
  getOwnerPreferredBonusCents,
  getOwnerPreferredTier,
  isOwnerRewardsEnrolled,
  sumOwnerCompletedPoints,
} from "@/lib/owner-rewards";
import { getActivePromotion } from "@/lib/pricing-promotions";

type EnsureRentalResult = {
  rentalId: string;
  checkIn: string | null;
  ownerUserId: string;
  rentalAmountCents: number | null;
};

const RENTAL_PAYLOAD_KEYS = new Set([
  "owner_user_id",
  "guest_user_id",
  "resort_code",
  "room_type",
  "check_in",
  "check_out",
  "points_required",
  "rental_amount_cents",
  "status",
  "booking_package",
  "match_id",
  "owner_id",
  "guest_id",
  "adults",
  "youths",
  "dvc_confirmation_number",
  "disney_confirmation_number",
  "lead_guest_name",
  "lead_guest_email",
  "lead_guest_phone",
  "lead_guest_address",
]);

function pickAllowedColumns<T extends Record<string, unknown>>(payload: T) {
  const filtered: Record<string, unknown> = {};
  const removed: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (RENTAL_PAYLOAD_KEYS.has(key)) {
      filtered[key] = value;
    } else {
      removed.push(key);
    }
  }
  return { filtered, removed };
}

export async function ensureRentalForMatch(params: {
  adminClient: SupabaseClient;
  matchId: string;
}): Promise<EnsureRentalResult> {
  const { adminClient, matchId } = params;

  const { data: match } = await adminClient
    .from("booking_matches")
    .select(
      "id, booking_id, owner_id, owner_membership_id, owner_base_rate_per_point_cents, owner_premium_per_point_cents, owner_rate_per_point_cents, owner_total_cents, owner_home_resort_premium_applied",
    )
    .eq("id", matchId)
    .maybeSingle();

  if (!match) {
    throw new Error("match_not_found");
  }

  const { data: booking } = await adminClient
    .from("booking_requests")
    .select(
      "id, renter_id, check_in, check_out, nights, primary_resort_id, primary_room, primary_view, total_points, max_price_per_point, est_cash, guest_total_cents, guest_total_cents_original, guest_total_cents_final, guest_rate_per_point_cents, adults, youths, requires_accessibility, comments, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, address_line2, city, state, postal_code, country, deposit_due, deposit_paid, deposit_currency, guest_profile_complete_at, guest_agreement_accepted_at, primary_resort:resorts!booking_requests_primary_resort_id_fkey(slug, calculator_code, name)",
    )
    .eq("id", match.booking_id)
    .maybeSingle();

  if (!booking) {
    throw new Error("booking_not_found");
  }

  const { data: ownerRow, error: ownerErr } = await adminClient
    .from("owners")
    .select("id, user_id")
    .eq("id", match.owner_id)
    .maybeSingle();

  if (ownerErr) {
    throw new Error(ownerErr.message);
  }

  const resolvedOwnerUserId = ownerRow?.user_id ?? match.owner_id ?? null;
  if (!resolvedOwnerUserId) {
    throw new Error(`owner_user_id_missing owner_id=${match.owner_id} match_id=${match.id}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.debug("[ensureRentalForMatch] owner resolution", {
      match_id: match.id,
      owner_id: match.owner_id,
      owner_user_id: resolvedOwnerUserId,
    });
  }

  const resortMeta = booking.primary_resort ?? null;
  const resortCode =
    resolveCalculatorCode({
      slug: resortMeta?.slug ?? null,
      calculator_code: resortMeta?.calculator_code ?? null,
    }) ?? resortMeta?.slug ?? "TBD";

  let guestTotalCents =
    typeof booking.guest_total_cents === "number" ? booking.guest_total_cents : null;
  let guestRatePerPointCents =
    typeof booking.guest_rate_per_point_cents === "number"
      ? booking.guest_rate_per_point_cents
      : null;

  const bookingPackage = {
    booking_request_id: booking.id,
    resort_name: resortMeta?.name ?? null,
    resort_slug: resortMeta?.slug ?? null,
    resort_code: resortCode,
    room_type: booking.primary_room ?? null,
    room_view: booking.primary_view ?? null,
    check_in: booking.check_in ?? null,
    check_out: booking.check_out ?? null,
    nights: booking.nights ?? null,
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
    guest_total_cents: guestTotalCents ?? null,
    guest_rate_per_point_cents: guestRatePerPointCents ?? null,
  };

  let membershipResortId: string | null = null;
  if (match.owner_membership_id) {
    const { data: membership } = await adminClient
      .from("owner_memberships")
      .select("resort_id")
      .eq("id", match.owner_membership_id)
      .maybeSingle();
    membershipResortId = membership?.resort_id ?? null;
  }

  const ownerPayout = computeOwnerPayout({
    totalPoints: booking.total_points,
    matchedMembershipResortId: membershipResortId,
    bookingResortId: booking.primary_resort_id ?? null,
  });

  let owner_total_cents =
    typeof match.owner_total_cents === "number"
      ? match.owner_total_cents
      : ownerPayout.owner_total_cents;
  let ownerRatePerPointCents = ownerPayout.owner_rate_per_point_cents;
  let ownerBaseRateCents = ownerPayout.owner_base_rate_per_point_cents;
  let ownerPremiumCents = ownerPayout.owner_premium_per_point_cents;
  let ownerPremiumApplied = ownerPayout.owner_home_resort_premium_applied;
  let ownerBonusCandidate = 0;
  let ownerRewardsPoints = 0;
  let ownerRewardsTier: ReturnType<typeof getOwnerPreferredTier> | null = null;

  if (resolvedOwnerUserId) {
    const { data: ownerProfile, error: ownerProfileError } = await adminClient
      .from("profiles")
      .select("id, owner_rewards_enrolled_at")
      .eq("id", resolvedOwnerUserId)
      .maybeSingle();

    if (ownerProfileError) {
      console.error("[owner-rewards] failed to load owner profile", {
        code: ownerProfileError.code,
        message: ownerProfileError.message,
        details: ownerProfileError.details,
        hint: ownerProfileError.hint,
        owner_user_id: resolvedOwnerUserId,
      });
    }

    if (isOwnerRewardsEnrolled(ownerProfile)) {
      const { points, error: pointsError } = await sumOwnerCompletedPoints({
        adminClient,
        ownerUserId: resolvedOwnerUserId,
      });

      if (pointsError) {
        console.error("[owner-rewards] failed to sum completed points", {
          code: pointsError.code,
          message: pointsError.message,
          details: pointsError.details,
          hint: pointsError.hint,
          owner_user_id: resolvedOwnerUserId,
        });
      }

      ownerRewardsPoints = points;
      ownerRewardsTier = getOwnerPreferredTier(points);
      ownerBonusCandidate = getOwnerPreferredBonusCents(points);
    }
  }

  const guestTotalCentsBeforePerks =
    typeof guestTotalCents === "number" && guestTotalCents > 0 ? guestTotalCents : null;

  if (
    typeof owner_total_cents === "number" &&
    owner_total_cents > 0 &&
    typeof guestTotalCents === "number" &&
    guestTotalCents > 0 &&
    booking.guest_total_cents_final === null
  ) {
    if (!booking.renter_id) {
      console.warn("[pricing] missing renter id for guest perks", {
        booking_request_id: booking.id,
      });
    } else {
      const { data: guestProfile, error: guestProfileError } = await adminClient
      .from("profiles")
      .select("id, guest_rewards_enrolled_at")
      .eq("id", booking.renter_id)
      .maybeSingle();

    if (guestProfileError) {
      console.error("[pricing] failed to load guest rewards profile", {
        code: guestProfileError.code,
        message: guestProfileError.message,
        details: guestProfileError.details,
        hint: guestProfileError.hint,
        booking_request_id: booking.id,
      });
    }

      if (guestProfileError) {
        console.error("[pricing] failed to load guest rewards profile", {
          code: guestProfileError.code,
          message: guestProfileError.message,
          details: guestProfileError.details,
          hint: guestProfileError.hint,
          booking_request_id: booking.id,
        });
      }

      if (isGuestPerksEnrolled(guestProfile)) {
        const { count, error: countError } = await countCompletedGuestBookings({
          adminClient,
          renterId: booking.renter_id,
        });

        if (countError) {
          console.error("[pricing] failed to count completed bookings", {
            code: countError.code,
            message: countError.message,
            details: countError.details,
            hint: countError.hint,
            booking_request_id: booking.id,
          });
        }

        const discountPct = getGuestPerksDiscountPct(count);
        const pixieFeeCents = guestTotalCents - owner_total_cents;
        if (discountPct > 0 && pixieFeeCents > 0) {
          const discountedPixieFee = Math.round(pixieFeeCents * (1 - discountPct / 100));
          const newGuestTotal = owner_total_cents + discountedPixieFee;
          const pointsTotal = typeof booking.total_points === "number" ? booking.total_points : null;
          const newRate =
            typeof pointsTotal === "number" && pointsTotal > 0
              ? Math.round(newGuestTotal / pointsTotal)
              : null;

          const { error: updateError } = await adminClient
            .from("booking_requests")
            .update({
              guest_total_cents_original: booking.guest_total_cents_original ?? guestTotalCents,
              guest_total_cents_final: newGuestTotal,
              guest_total_cents: newGuestTotal,
              guest_rate_per_point_cents: newRate ?? guestRatePerPointCents,
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);

          if (updateError) {
            console.error("[pricing] failed to apply guest perks", {
              code: updateError.code,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              booking_request_id: booking.id,
            });
          } else {
            guestTotalCents = newGuestTotal;
            guestRatePerPointCents = newRate ?? guestRatePerPointCents;
            bookingPackage.guest_total_cents = newGuestTotal;
            bookingPackage.guest_rate_per_point_cents = newRate ?? guestRatePerPointCents;
            console.info("[pricing] guest perks applied", {
              booking_request_id: booking.id,
              pixie_fee_original: pixieFeeCents,
              discount_pct: discountPct,
              guest_total_final: newGuestTotal,
            });
          }
        }
      }
    }
  }

  if (ownerBonusCandidate > 0) {
    const totalPoints = Number(booking.total_points ?? 0);
    if (Number.isFinite(totalPoints) && totalPoints > 0) {
      const { data: activePromotion, error: promoError } = await getActivePromotion({
        adminClient,
      });

      if (promoError) {
        console.error("[owner-rewards] failed to load pricing promotion", {
          code: (promoError as { code?: string }).code,
          message: promoError.message,
        });
      }

      const pointsTotal = totalPoints;
      const currentGuestRate =
        typeof guestRatePerPointCents === "number" && guestRatePerPointCents > 0
          ? guestRatePerPointCents
          : typeof guestTotalCents === "number" && guestTotalCents > 0
            ? Math.round(guestTotalCents / pointsTotal)
            : null;

      let appliedBonus = ownerBonusCandidate;
      if (activePromotion && currentGuestRate !== null) {
        const guestRewardPerPointRaw =
          guestTotalCentsBeforePerks !== null && typeof guestTotalCents === "number"
            ? Math.max(Math.round((guestTotalCentsBeforePerks - guestTotalCents) / pointsTotal), 0)
            : 0;
        const guestRewardPerPoint = Math.min(
          guestRewardPerPointRaw,
          activePromotion.guest_max_reward_per_point_cents,
        );
        const spreadPerPoint = currentGuestRate - ownerPayout.owner_rate_per_point_cents;
        appliedBonus = applyOwnerBonusWithMargin({
          owner_bonus_candidate_cents: ownerBonusCandidate,
          owner_max_bonus_cents: activePromotion.owner_max_bonus_per_point_cents,
          guest_reward_per_point_cents: guestRewardPerPoint,
          spread_per_point_cents: spreadPerPoint,
          min_spread_per_point_cents: activePromotion.min_spread_per_point_cents,
        });
      }

      if (appliedBonus > 0) {
        ownerBaseRateCents = ownerPayout.owner_base_rate_per_point_cents;
        ownerPremiumCents = ownerPayout.owner_premium_per_point_cents;
        ownerPremiumApplied = ownerPayout.owner_home_resort_premium_applied;
        ownerRatePerPointCents = ownerPayout.owner_rate_per_point_cents + appliedBonus;
        owner_total_cents = pointsTotal * ownerRatePerPointCents;

        const { error: matchUpdateError } = await adminClient
          .from("booking_matches")
          .update({
            owner_base_rate_per_point_cents: ownerBaseRateCents,
            owner_premium_per_point_cents: ownerPremiumCents,
            owner_rate_per_point_cents: ownerRatePerPointCents,
            owner_total_cents,
            owner_home_resort_premium_applied: ownerPremiumApplied,
            updated_at: new Date().toISOString(),
          })
          .eq("id", match.id);

        if (matchUpdateError) {
          console.error("[owner-rewards] failed to update match payout", {
            code: matchUpdateError.code,
            message: matchUpdateError.message,
            details: matchUpdateError.details,
            hint: matchUpdateError.hint,
            match_id: match.id,
          });
        }

        console.info("[owner-rewards] bonus applied", {
          owner_user_id: resolvedOwnerUserId,
          owner_membership_id: match.owner_membership_id ?? null,
          tier: ownerRewardsTier ?? getOwnerPreferredTier(ownerRewardsPoints),
          bonus_cents_per_point: appliedBonus,
          owner_total_cents,
        });
      }
    }
  }

  const fullPayload = {
    match_id: match.id,
    owner_id: match.owner_id,
    guest_id: booking.renter_id ?? null,
    owner_user_id: resolvedOwnerUserId,
    guest_user_id: booking.renter_id ?? null,
    resort_code: resortCode,
    room_type: booking.primary_room ?? null,
    check_in: booking.check_in ?? null,
    check_out: booking.check_out ?? null,
    points_required: booking.total_points ?? null,
    rental_amount_cents:
      typeof owner_total_cents === "number" && owner_total_cents > 0 ? owner_total_cents : null,
    status: "needs_dvc_booking",
    booking_package: bookingPackage,
    adults: booking.adults ?? null,
    youths: booking.youths ?? null,
    dvc_confirmation_number: null,
    disney_confirmation_number: null,
    lead_guest_name: booking.lead_guest_name ?? null,
    lead_guest_email: booking.lead_guest_email ?? null,
    lead_guest_phone: booking.lead_guest_phone ?? null,
    lead_guest_address: bookingPackage.lead_guest_address,
  };

  const { filtered: rentalPayload, removed } = pickAllowedColumns(fullPayload);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[ensureRentalForMatch] rental payload", {
      removed,
      payloadKeys: Object.keys(rentalPayload),
    });
  }

  const { data: existingRental } = await adminClient
    .from("rentals")
    .select("id, check_in, owner_user_id, rental_amount_cents")
    .eq("match_id", match.id)
    .maybeSingle();

  let rentalRow = existingRental ?? null;
  if (!rentalRow) {
    const { data: insertedRental, error: rentalError } = await adminClient
      .from("rentals")
      .insert(rentalPayload)
      .select("id, check_in, owner_user_id, rental_amount_cents")
      .single();

    if (rentalError || !insertedRental) {
      const message = rentalError?.message ?? "rental_create_failed";
      throw new Error(message);
    }
    rentalRow = insertedRental;

    const guestVerified = Boolean(
      booking.guest_profile_complete_at && booking.guest_agreement_accepted_at,
    );
    const paymentVerified =
      typeof booking.deposit_paid === "number" &&
      typeof booking.deposit_due === "number" &&
      booking.deposit_due > 0 &&
      booking.deposit_paid >= booking.deposit_due;
    const nowIso = new Date().toISOString();
    await adminClient.from("rental_milestones").insert([
      { rental_id: rentalRow.id, code: "matched", status: "completed", occurred_at: nowIso },
      {
        rental_id: rentalRow.id,
        code: "guest_verified",
        status: guestVerified ? "completed" : "pending",
        occurred_at: guestVerified ? nowIso : null,
      },
      {
        rental_id: rentalRow.id,
        code: "payment_verified",
        status: paymentVerified ? "completed" : "pending",
        occurred_at: paymentVerified ? nowIso : null,
      },
      { rental_id: rentalRow.id, code: "booking_package_sent", status: "completed", occurred_at: nowIso },
      { rental_id: rentalRow.id, code: "agreement_sent", status: "pending", occurred_at: null },
      { rental_id: rentalRow.id, code: "owner_approved", status: "pending", occurred_at: null },
      { rental_id: rentalRow.id, code: "owner_booked", status: "pending", occurred_at: null },
      { rental_id: rentalRow.id, code: "check_in", status: "pending", occurred_at: null },
      { rental_id: rentalRow.id, code: "check_out", status: "pending", occurred_at: null },
    ]);
  } else {
    await adminClient.from("rentals").update(rentalPayload).eq("id", rentalRow.id);
  }

  return {
    rentalId: rentalRow.id,
    checkIn: rentalRow.check_in ?? null,
    ownerUserId: rentalRow.owner_user_id,
    rentalAmountCents: rentalRow.rental_amount_cents ?? null,
  };
}
