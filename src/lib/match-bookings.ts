import type { SupabaseClient } from '@supabase/supabase-js';

import { computeOwnerPayout } from '@/lib/pricing';
import { sendOwnerMatchEmail } from '@/lib/email';

function addYearsISO(dateStr: string, years: number) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}

function computeUseYearEnd(useYearStart: string) {
  const start = new Date(useYearStart);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

type BookingRow = {
  id: string;
  primary_resort_id: string | null;
  total_points: number | null;
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  availability_status?: string | null;
  deposit_due: number | null;
  deposit_paid: number | null;
  guest_total_cents?: number | null;
  guest_rate_per_point_cents?: number | null;
  primary_resort?: {
    name: string | null;
    calculator_code?: string | null;
    is_resale_restricted_resort?: boolean | null;
  } | null;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  booking_matches?: { status: string | null }[] | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  payout_email?: string | null;
};

type OwnerRow = {
  id: string;
  verification: string | null;
  payout_email?: string | null;
  profiles: ProfileRow | ProfileRow[] | null;
};

type MembershipRow = {
  id: number;
  owner_id: string;
  resort_id: string;
  home_resort?: string | null;
  matching_mode?: string | null;
  allow_standard_rate_fallback?: boolean | null;
  use_year_start?: string | null;
  use_year_end?: string | null;
  points_owned?: number | null;
  points_rented?: number | null;
  points_available: number | null;
  points_reserved?: number | null;
  banked_assumed_at?: string | null;
  expired_assumed_at?: string | null;
  banked_points_amount?: number | null;
  borrowing_enabled?: boolean | null;
  max_points_to_borrow?: number | null;
  purchase_channel?: string | null;
  acquired_at?: string | null;
  owner?: OwnerRow | null;
};

export type MatchCandidateEvaluation = {
  membership_id: number;
  owner_id: string;
  resort_id: string;
  home_resort: string | null;
  use_year_start: string | null;
  use_year_end: string | null;
  points_available: number;
  points_reserved: number;
  points_ok: boolean;
  rejectReasons: string[];
};

export type EvaluatedBooking = {
  bookingId: string;
  status: string | null;
  required_resort_id: string | null;
  total_points: number | null;
  deposit_ok: boolean;
  candidatesFound: number;
  candidatesEvaluated: MatchCandidateEvaluation[];
  candidateRejectionCounts?: Record<string, number>;
  finalDecision: 'matched' | 'skipped';
  skipReasons: string[];
};

type MatchPlan = {
  bookingId: string;
  ownerId: string;
  ownerMembershipId: number;
  borrowMembershipId: number | null;
  ownerEmail: string;
  ownerName: string;
  pointsReserved: number;
  pointsReservedCurrent: number;
  pointsReservedBorrowed: number;
  expiresAt: string;
  ownerPayout: ReturnType<typeof computeOwnerPayout>;
  booking: BookingRow;
};

export type MatchRunResult = {
  ok: boolean;
  matchesCreated: number;
  matchIds: string[];
  matchResults: Array<{
    bookingId: string;
    matchId: string;
  }>;
  dryRun: boolean;
  eligibleBookings: string[];
  evaluatedBookings: EvaluatedBooking[];
  errors: Array<{
    bookingId: string;
    step: string;
    message: string;
    details?: unknown;
  }>;
};

const DEFAULT_LIMIT = 20;

function normalizeProfile(owner: OwnerRow | null) {
  if (!owner) return null;
  const profiles = owner.profiles;
  return Array.isArray(profiles) ? profiles[0] : profiles;
}

function hasPendingOwnerMatch(booking: BookingRow) {
  return (booking.booking_matches ?? []).some(
    (match) => match.status === 'pending_owner',
  );
}

function computeDepositOk(booking: BookingRow) {
  if (typeof booking.deposit_due !== 'number' || typeof booking.deposit_paid !== 'number') {
    return false;
  }
  return booking.deposit_paid >= booking.deposit_due;
}

function parseLimit(value: string | null) {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(parsed), 1), 50);
}

export async function evaluateMatchBookings(options: {
  client: SupabaseClient;
  bookingId?: string | null;
  limit?: number;
  now?: Date;
}) {
  const { client, bookingId, limit = DEFAULT_LIMIT } = options;

  let bookingQuery = client
    .from('booking_requests')
    .select(
      `
        id,
        primary_resort_id,
        total_points,
        status,
        check_in,
        check_out,
        availability_status,
        deposit_due,
        deposit_paid,
        guest_total_cents,
        guest_rate_per_point_cents,
        lead_guest_name,
        lead_guest_email,
        primary_resort:resorts!booking_requests_primary_resort_id_fkey(name, calculator_code, is_resale_restricted_resort),
        booking_matches(status)
      `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (bookingId) {
    bookingQuery = bookingQuery.eq('id', bookingId);
  } else {
    bookingQuery = bookingQuery.in('status', ['pending_match', 'submitted']);
  }

  const { data: bookings, error: bookingError } = await bookingQuery;
  if (bookingError) {
    console.error('[matcher] failed to load booking requests', {
      code: bookingError.code,
      message: bookingError.message,
      details: bookingError.details,
      hint: bookingError.hint,
    });
    return {
      eligibleBookings: [] as string[],
      evaluatedBookings: [] as EvaluatedBooking[],
      matchPlans: [] as MatchPlan[],
      errors: [
        {
          bookingId: bookingId ?? 'all',
          step: 'load_bookings',
          message: bookingError.message,
        },
      ],
    };
  }

  const evaluatedBookings: EvaluatedBooking[] = [];
  const matchPlans: MatchPlan[] = [];
  const eligibleBookings: string[] = [];
  const errors: MatchRunResult['errors'] = [];

  const matchableStatuses = new Set(['pending_match', 'submitted']);

  for (const booking of (bookings ?? []) as BookingRow[]) {
    const skipReasons: string[] = [];
    const candidatesEvaluated: MatchCandidateEvaluation[] = [];
    const candidateRejectionCounts: Record<string, number> = {};
    const depositOk = computeDepositOk(booking);

    if (!matchableStatuses.has(booking.status)) {
      skipReasons.push('booking_status_not_pending_match');
    }
    if (!booking.primary_resort_id) {
      skipReasons.push('missing_primary_resort_id');
    }
    if (!booking.total_points || booking.total_points <= 0) {
      skipReasons.push('missing_total_points');
    }
    if (!booking.check_in || !booking.check_out) {
      skipReasons.push('missing_dates');
    }
    if (hasPendingOwnerMatch(booking)) {
      skipReasons.push('already_pending_owner');
    }

    const baseIneligibleReasons = new Set([
      'booking_status_not_pending_match',
      'missing_primary_resort_id',
      'missing_total_points',
      'missing_dates',
    ]);
    const bookingEligible =
      skipReasons.filter((reason) => baseIneligibleReasons.has(reason)).length === 0;
    if (bookingEligible) {
      eligibleBookings.push(booking.id);
    }

    const evaluated: EvaluatedBooking = {
      bookingId: booking.id,
      status: booking.status,
      required_resort_id: booking.primary_resort_id,
      total_points: booking.total_points,
      deposit_ok: depositOk,
      candidatesFound: 0,
      candidatesEvaluated,
      finalDecision: 'skipped',
      skipReasons: Array.from(new Set(skipReasons)),
    };

    if (skipReasons.length > 0) {
      evaluatedBookings.push(evaluated);
      continue;
    }

    if (!booking.primary_resort_id || !booking.total_points || !booking.check_in || !booking.check_out) {
      evaluatedBookings.push(evaluated);
      continue;
    }

    const resortCode = booking.primary_resort?.calculator_code ?? null;
    const isResaleRestrictedResort = Boolean(booking.primary_resort?.is_resale_restricted_resort);
    const checkInDate = new Date(booking.check_in);
    const today = (options.now ?? new Date());
    const daysOut = Math.floor((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const withinSevenMonths = Number.isFinite(daysOut) ? daysOut <= 210 : false;
    const withinPremiumWindow = Number.isFinite(daysOut) ? daysOut > 210 && daysOut <= 335 : false;
    let membershipQuery = client
      .from('owner_memberships')
      .select(
        `
        id,
        owner_id,
        resort_id,
        home_resort,
        use_year_start,
        use_year_end,
        points_owned,
        points_rented,
        points_available,
        points_reserved,
        banked_assumed_at,
        expired_assumed_at,
        banked_points_amount,
        borrowing_enabled,
        max_points_to_borrow,
        matching_mode,
        allow_standard_rate_fallback,
        purchase_channel,
        acquired_at,
        owner:owners (
          id,
          verification,
          payout_email,
          profiles:profiles!owners_user_id_fkey (
            id,
            email,
            display_name,
            payout_email
          )
        )
      `,
      )
      .is('banked_assumed_at', null)
      .is('expired_assumed_at', null)
      .limit(200);

    if (!withinSevenMonths) {
      if (resortCode) {
        membershipQuery = membershipQuery.or(
          `resort_id.eq.${booking.primary_resort_id},home_resort.eq.${resortCode}`,
        );
      } else {
        membershipQuery = membershipQuery.eq('resort_id', booking.primary_resort_id);
      }
    }

    const { data: memberships, error: membershipError } = await membershipQuery;
    if (membershipError) {
      errors.push({
        bookingId: booking.id,
        step: 'load_memberships',
        message: membershipError.message,
      });
      evaluated.skipReasons.push('membership_query_failed');
      evaluatedBookings.push(evaluated);
      continue;
    }

    const membershipRows = (memberships ?? []) as MembershipRow[];
    evaluated.candidatesFound = membershipRows.length;

    if (membershipRows.length === 0) {
      evaluated.skipReasons.push('no_membership_for_resort');
      evaluatedBookings.push(evaluated);
      continue;
    }

    const membershipMap = new Map(
      membershipRows.map((row) => [
        `${row.owner_id}:${row.resort_id}:${row.use_year_start ?? 'none'}`,
        row,
      ]),
    );

    const ownerIds = Array.from(new Set(membershipRows.map((row) => row.owner_id)));
    const verificationMap = new Map<string, string | null>();
    if (ownerIds.length > 0) {
      const { data: verifications, error: verificationError } = await client
        .from('owner_verifications')
        .select('owner_id,status')
        .in('owner_id', ownerIds);

      if (verificationError) {
        errors.push({
          bookingId: booking.id,
          step: 'load_owner_verifications',
          message: verificationError.message,
        });
      } else {
        for (const row of verifications ?? []) {
          verificationMap.set(row.owner_id, row.status);
        }
      }
    }

    const rewardsStatsMap = new Map<
      string,
      { lifetime_points_rented: number | null; tier: string | null }
    >();
    if (ownerIds.length > 0) {
      const { data: statsRows, error: statsError } = await client
        .from('owner_rewards_stats')
        .select('owner_id, lifetime_points_rented, tier')
        .in('owner_id', ownerIds);

      if (statsError) {
        errors.push({
          bookingId: booking.id,
          step: 'load_owner_rewards_stats',
          message: statsError.message,
        });
      } else {
        for (const row of statsRows ?? []) {
          rewardsStatsMap.set(row.owner_id, {
            lifetime_points_rented: row.lifetime_points_rented ?? null,
            tier: row.tier ?? null,
          });
        }
      }
    }

    const lastMatchMap = new Map<string, string | null>();
    if (ownerIds.length > 0) {
      const { data: lastMatches, error: lastMatchError } = await client
        .from('booking_matches')
        .select('owner_id, created_at')
        .in('owner_id', ownerIds);

      if (lastMatchError) {
        errors.push({
          bookingId: booking.id,
          step: 'load_owner_last_match',
          message: lastMatchError.message,
        });
      } else {
        for (const row of lastMatches ?? []) {
          const existing = lastMatchMap.get(row.owner_id);
          if (!existing || new Date(row.created_at) > new Date(existing)) {
            lastMatchMap.set(row.owner_id, row.created_at);
          }
        }
      }
    }

    const checkOutDate = new Date(booking.check_out);

    let bestCandidate: {
      membership: MembershipRow;
      nextMembership: MembershipRow | null;
      ownerProfile: ProfileRow;
      reserveCurrent: number;
      reserveBorrowed: number;
      score: number;
      useEndScore: number;
    } | null = null;

    for (const membership of membershipRows) {
      const rejectReasons: string[] = [];
      const owner = membership.owner ?? null;
      const profile = normalizeProfile(owner);
      const matchingMode = membership.matching_mode ?? 'premium_only';
      const allowStandardFallback = membership.allow_standard_rate_fallback ?? false;
      const matchesHomeResort =
        membership.resort_id === booking.primary_resort_id ||
        (resortCode &&
          typeof membership.home_resort === 'string' &&
          membership.home_resort.toUpperCase() === resortCode.toUpperCase());
      const premiumEligible = withinPremiumWindow && matchesHomeResort;

      if (!withinSevenMonths) {
        if (membership.resort_id !== booking.primary_resort_id) {
          rejectReasons.push('home_resort_required');
        }
      }

      if (matchingMode === 'premium_only' && !premiumEligible) {
        rejectReasons.push('premium_window_only');
      }

      if (matchingMode === 'premium_then_standard' && !premiumEligible && !allowStandardFallback) {
        rejectReasons.push('standard_matching_disabled');
      }

      const resaleRestricted =
        membership.purchase_channel === 'resale' &&
        membership.acquired_at &&
        new Date(membership.acquired_at) >= new Date('2019-01-19') &&
        isResaleRestrictedResort;
      if (resaleRestricted) {
        rejectReasons.push('restricted_resale_resort');
      }

      const verificationStatus = verificationMap.get(membership.owner_id) ?? null;
      const ownerVerified =
        verificationStatus === 'approved' || owner?.verification === 'verified';
      if (!ownerVerified) {
        rejectReasons.push('owner_not_verified');
      }

      const payoutEmail =
        profile?.payout_email ?? owner?.payout_email ?? profile?.email ?? null;
      if (!payoutEmail) {
        rejectReasons.push('owner_missing_email');
      }

      if (!membership.use_year_start) {
        rejectReasons.push('use_year_start_missing');
      } else if (booking.check_in && booking.check_out) {
        const useStart = new Date(membership.use_year_start);
        const useEndISO = membership.use_year_end ?? computeUseYearEnd(membership.use_year_start);
        const useEnd = useEndISO ? new Date(useEndISO) : null;
        if (useEnd && (checkInDate < useStart || checkOutDate > useEnd)) {
          rejectReasons.push('stay_outside_use_year');
        }
      }

      const rawAvailable =
        (membership.points_available ?? 0) -
        (membership.banked_points_amount ?? 0) -
        (membership.points_rented ?? 0) -
        (membership.points_reserved ?? 0);
      if (rawAvailable < 0 && process.env.NODE_ENV !== 'production') {
        console.warn('[matcher] membership over-allocated', {
          membership_id: membership.id,
          owner_id: membership.owner_id,
          raw_available: rawAvailable,
        });
      }
      const effectiveAvailable = Math.max(rawAvailable, 0);
      const currentAvailable = effectiveAvailable;
      let nextMembership: MembershipRow | null = null;
      let borrowable = 0;
      if (membership.borrowing_enabled && membership.use_year_start) {
        const nextUseYearStart = addYearsISO(membership.use_year_start, 1);
        const nextKey = nextUseYearStart
          ? `${membership.owner_id}:${membership.resort_id}:${nextUseYearStart}`
          : `${membership.owner_id}:${membership.resort_id}:none`;
        const candidateNext = membershipMap.get(nextKey) ?? null;
        if (candidateNext) {
          const nextAvailable = Math.max(
            (candidateNext.points_available ?? 0) -
              (candidateNext.banked_points_amount ?? 0) -
              (candidateNext.points_rented ?? 0) -
              (candidateNext.points_reserved ?? 0),
            0,
          );
          const maxBorrow = Math.max(membership.max_points_to_borrow ?? 0, 0);
          borrowable = Math.min(maxBorrow, nextAvailable);
          nextMembership = candidateNext;
        }
      }

      const totalUsable = currentAvailable + borrowable;
      const pointsOk = totalUsable >= booking.total_points;
      if (!pointsOk) {
        rejectReasons.push('insufficient_points');
      }

      candidatesEvaluated.push({
        membership_id: membership.id,
        owner_id: membership.owner_id,
        resort_id: membership.resort_id,
        home_resort: membership.home_resort ?? null,
        use_year_start: membership.use_year_start ?? null,
        use_year_end: membership.use_year_end ?? null,
        points_available: effectiveAvailable,
        points_reserved: membership.points_reserved ?? 0,
        points_ok: pointsOk,
        rejectReasons,
      });

      if (rejectReasons.length > 0) {
        const [primaryReason] = rejectReasons;
        if (primaryReason) {
          candidateRejectionCounts[primaryReason] =
            (candidateRejectionCounts[primaryReason] ?? 0) + 1;
        }
        continue;
      }

      const reserveCurrent = Math.min(currentAvailable, booking.total_points);
      const reserveBorrowed = booking.total_points - reserveCurrent;
      const leftover = totalUsable - booking.total_points;
      const score =
        currentAvailable >= booking.total_points
          ? 1000 - (currentAvailable - booking.total_points)
          : 600 - reserveBorrowed * 2 - leftover;
      const scoreWithPreference = premiumEligible ? score + 150 : score;
      const rewardStats = rewardsStatsMap.get(membership.owner_id) ?? {
        lifetime_points_rented: null,
        tier: null,
      };
      const tier = rewardStats.tier ?? 'base';
      const rewardPenalty = (() => {
        switch (tier) {
          case 'tier1':
            return 10;
          case 'tier2':
            return 25;
          case 'tier3':
            return 45;
          case 'tier4':
            return 70;
          default:
            return 0;
        }
      })();
      const lastMatchAt = lastMatchMap.get(membership.owner_id) ?? null;
      const daysSinceMatch = lastMatchAt
        ? Math.floor(
            (today.getTime() - new Date(lastMatchAt).getTime()) / (1000 * 60 * 60 * 24),
          )
        : Number.POSITIVE_INFINITY;
      const fairnessBoost = Number.isFinite(daysSinceMatch) && daysSinceMatch > 21 ? 50 : 0;
      const finalScore = scoreWithPreference - rewardPenalty + fairnessBoost;
      const useEndISO = membership.use_year_end ?? computeUseYearEnd(membership.use_year_start ?? '');
      const useEndScore = useEndISO ? new Date(useEndISO).getTime() : Number.POSITIVE_INFINITY;

      if (
        !bestCandidate ||
        finalScore > bestCandidate.score ||
        (finalScore === bestCandidate.score && useEndScore < bestCandidate.useEndScore)
      ) {
        bestCandidate = {
          membership,
          nextMembership,
          ownerProfile: profile,
          reserveCurrent,
          reserveBorrowed,
          score: finalScore,
          useEndScore,
        };
      }
    }

    if (!bestCandidate) {
      if (!evaluated.skipReasons.includes('no_eligible_candidates')) {
        evaluated.skipReasons.push('no_eligible_candidates');
      }
      evaluated.candidateRejectionCounts =
        Object.keys(candidateRejectionCounts).length > 0 ? candidateRejectionCounts : undefined;
      evaluatedBookings.push(evaluated);
      continue;
    }

    {
      const rewardStats = rewardsStatsMap.get(bestCandidate.membership.owner_id) ?? {
        lifetime_points_rented: null,
        tier: null,
      };
      const tier = rewardStats.tier ?? 'base';
      const rewardPenalty = (() => {
        switch (tier) {
          case 'tier1':
            return 10;
          case 'tier2':
            return 25;
          case 'tier3':
            return 45;
          case 'tier4':
            return 70;
          default:
            return 0;
        }
      })();
      const lastMatchAt = lastMatchMap.get(bestCandidate.membership.owner_id) ?? null;
      const daysSinceMatch = lastMatchAt
        ? Math.floor(
            (today.getTime() - new Date(lastMatchAt).getTime()) / (1000 * 60 * 60 * 24),
          )
        : Number.POSITIVE_INFINITY;
      const fairnessBoost = Number.isFinite(daysSinceMatch) && daysSinceMatch > 21 ? 50 : 0;

      console.info('[matches] scoring_selected_owner', {
        bookingId: booking.id,
        ownerId: bestCandidate.membership.owner_id,
        baseScore: bestCandidate.score,
        premiumEligible: withinPremiumWindow &&
          (bestCandidate.membership.resort_id === booking.primary_resort_id ||
            (resortCode &&
              typeof bestCandidate.membership.home_resort === 'string' &&
              bestCandidate.membership.home_resort.toUpperCase() === resortCode.toUpperCase())),
        penalty: rewardPenalty,
        boost: fairnessBoost,
        finalScore: bestCandidate.score,
        tier,
        lifetime_points_rented: rewardStats.lifetime_points_rented ?? null,
      });
    }

    const ownerPayout = computeOwnerPayout({
      totalPoints: booking.total_points,
      matchedMembershipResortId: bestCandidate.membership.resort_id,
      bookingResortId: booking.primary_resort_id,
    });

    evaluated.finalDecision = 'matched';
    evaluatedBookings.push(evaluated);

    const payoutEmail =
      bestCandidate.ownerProfile.payout_email ??
      bestCandidate.ownerProfile.email ??
      bestCandidate.membership.owner?.payout_email ??
      '';

    matchPlans.push({
      bookingId: booking.id,
      ownerId: bestCandidate.membership.owner_id,
      ownerMembershipId: bestCandidate.membership.id,
      borrowMembershipId: bestCandidate.nextMembership?.id ?? null,
      ownerEmail: payoutEmail,
      ownerName: bestCandidate.ownerProfile.display_name ?? 'PixieDVC Owner',
      pointsReserved: booking.total_points,
      pointsReservedCurrent: bestCandidate.reserveCurrent,
      pointsReservedBorrowed: bestCandidate.reserveBorrowed,
      expiresAt: new Date((options.now ?? new Date()).getTime() + 60 * 60 * 1000).toISOString(),
      ownerPayout,
      booking,
    });
  }

  return {
    eligibleBookings,
    evaluatedBookings,
    matchPlans,
    errors,
  };
}

export async function runMatchBookings(options: {
  client: SupabaseClient;
  origin: string;
  dryRun?: boolean;
  bookingId?: string | null;
  limit?: number;
  now?: Date;
  sendEmails?: boolean;
}): Promise<MatchRunResult> {
  const {
    client,
    origin,
    dryRun = false,
    bookingId = null,
    limit = DEFAULT_LIMIT,
    now = new Date(),
    sendEmails = true,
  } = options;

  const evaluation = await evaluateMatchBookings({
    client,
    bookingId,
    limit,
    now,
  });

  const matchIds: string[] = [];
  const matchResults: MatchRunResult['matchResults'] = [];
  const errors: MatchRunResult['errors'] = [...evaluation.errors];
  const evaluatedBookings = [...evaluation.evaluatedBookings];
  const evaluatedMap = new Map(
    evaluatedBookings.map((booking, index) => [booking.bookingId, index]),
  );

  for (const booking of evaluatedBookings) {
    if (booking.finalDecision === 'skipped') {
      console.info('[matcher] skip booking', {
        booking_id: booking.bookingId,
        reasons: booking.skipReasons,
      });
    }
  }

  if (dryRun) {
    return {
      ok: errors.length === 0,
      matchesCreated: 0,
      matchIds,
      matchResults,
      dryRun,
      eligibleBookings: evaluation.eligibleBookings,
      evaluatedBookings,
      errors,
    };
  }

  for (const plan of evaluation.matchPlans) {
    const { data, error } = await client.rpc('apply_booking_match', {
      p_booking_id: plan.bookingId,
      p_owner_id: plan.ownerId,
      p_owner_membership_id: plan.ownerMembershipId,
      p_points_reserved: plan.pointsReserved,
      p_points_reserved_current: plan.pointsReservedCurrent,
      p_points_reserved_borrowed: plan.pointsReservedBorrowed,
      p_borrow_membership_id: plan.borrowMembershipId,
      p_expires_at: plan.expiresAt,
      p_owner_base_rate_per_point_cents: plan.ownerPayout.owner_base_rate_per_point_cents,
      p_owner_premium_per_point_cents: plan.ownerPayout.owner_premium_per_point_cents,
      p_owner_rate_per_point_cents: plan.ownerPayout.owner_rate_per_point_cents,
      p_owner_total_cents: plan.ownerPayout.owner_total_cents,
      p_owner_home_resort_premium_applied: plan.ownerPayout.owner_home_resort_premium_applied,
    });

    const matchId = typeof data === 'string' ? data : data?.id ?? null;

    if (error || !matchId) {
      errors.push({
        bookingId: plan.bookingId,
        step: 'create_match',
        message: error?.message ?? 'Failed to create match',
        details: error ?? null,
      });
      const index = evaluatedMap.get(plan.bookingId);
      if (index !== undefined) {
        evaluatedBookings[index] = {
          ...evaluatedBookings[index],
          finalDecision: 'skipped',
          skipReasons: Array.from(
            new Set([...evaluatedBookings[index].skipReasons, 'match_apply_failed']),
          ),
        };
      }
      continue;
    }

    matchIds.push(matchId);
    matchResults.push({ bookingId: plan.bookingId, matchId });

    if (sendEmails && plan.ownerEmail) {
      if (plan.booking.availability_status !== 'confirmed') {
        console.info('[matcher] owner package blocked by availability_status', {
          bookingId: plan.booking.id,
          availability_status: plan.booking.availability_status ?? null,
        });
        continue;
      }
      const acceptUrl = `${origin}/api/matches/owner/accept?matchId=${matchId}`;
      const declineUrl = `${origin}/api/matches/owner/decline?matchId=${matchId}`;

      try {
        await sendOwnerMatchEmail({
          to: plan.ownerEmail,
          ownerName: plan.ownerName,
          resortName: plan.booking.primary_resort?.name ?? 'your DVC resort',
          checkIn: plan.booking.check_in,
          checkOut: plan.booking.check_out,
          totalPoints: plan.booking.total_points,
          leadGuestName: plan.booking.lead_guest_name,
          leadGuestEmail: plan.booking.lead_guest_email,
          acceptUrl,
          declineUrl,
        });
      } catch (emailError) {
        console.error('Failed to send owner match email', emailError);
      }
    }
  }

  return {
    ok: errors.length === 0,
    matchesCreated: matchIds.length,
    matchIds,
    matchResults,
    dryRun,
    eligibleBookings: evaluation.eligibleBookings,
    evaluatedBookings,
    errors,
  };
}

export function parseMatchLimit(value: string | null) {
  return parseLimit(value);
}
