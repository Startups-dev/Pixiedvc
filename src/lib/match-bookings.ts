import type { SupabaseClient } from '@supabase/supabase-js';

import { computeOwnerPayout } from '@/lib/pricing';
import { sendOwnerMatchEmail } from '@/lib/email';

type BookingRow = {
  id: string;
  primary_resort_id: string | null;
  total_points: number | null;
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  deposit_due: number | null;
  deposit_paid: number | null;
  guest_total_cents?: number | null;
  guest_rate_per_point_cents?: number | null;
  primary_resort?: {
    name: string | null;
    calculator_code?: string | null;
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
  id: string;
  owner_id: string;
  resort_id: string;
  home_resort?: string | null;
  contract_year?: number | null;
  use_year_start?: string | null;
  use_year_end?: string | null;
  points_available: number | null;
  points_reserved?: number | null;
  borrowing_enabled?: boolean | null;
  max_points_to_borrow?: number | null;
  owner?: OwnerRow | null;
};

export type MatchCandidateEvaluation = {
  membership_id: string;
  owner_id: string;
  resort_id: string;
  home_resort: string | null;
  contract_year: number | null;
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
  finalDecision: 'matched' | 'skipped';
  skipReasons: string[];
};

type MatchPlan = {
  bookingId: string;
  ownerId: string;
  ownerMembershipId: string;
  borrowMembershipId: string | null;
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
        deposit_due,
        deposit_paid,
        guest_total_cents,
        guest_rate_per_point_cents,
        lead_guest_name,
        lead_guest_email,
        primary_resort:resorts!booking_requests_primary_resort_id_fkey(name, calculator_code),
        booking_matches(status)
      `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (bookingId) {
    bookingQuery = bookingQuery.eq('id', bookingId);
  } else {
    bookingQuery = bookingQuery.eq('status', 'submitted');
  }

  const { data: bookings, error: bookingError } = await bookingQuery;
  if (bookingError) {
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

  for (const booking of (bookings ?? []) as BookingRow[]) {
    const skipReasons: string[] = [];
    const candidatesEvaluated: MatchCandidateEvaluation[] = [];
    const depositOk = computeDepositOk(booking);

    if (booking.status !== 'submitted') {
      skipReasons.push('booking_status_not_submitted');
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
      'booking_status_not_submitted',
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
    let membershipQuery = client
      .from('owner_memberships')
      .select(
        `
        id,
        owner_id,
        resort_id,
        home_resort,
        contract_year,
        use_year_start,
        use_year_end,
        points_available,
        points_reserved,
        borrowing_enabled,
        max_points_to_borrow,
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
      .limit(200);

    if (resortCode) {
      membershipQuery = membershipQuery.or(
        `resort_id.eq.${booking.primary_resort_id},home_resort.eq.${resortCode}`,
      );
    } else {
      membershipQuery = membershipQuery.eq('resort_id', booking.primary_resort_id);
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
        `${row.owner_id}:${row.resort_id}:${row.contract_year ?? 'none'}`,
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

    const checkInDate = new Date(booking.check_in);
    const checkOutDate = new Date(booking.check_out);
    const bookingYear = Number.isNaN(checkInDate.getTime())
      ? null
      : checkInDate.getUTCFullYear();

    let bestCandidate: {
      membership: MembershipRow;
      nextMembership: MembershipRow | null;
      ownerProfile: ProfileRow;
      reserveCurrent: number;
      reserveBorrowed: number;
      score: number;
    } | null = null;

    for (const membership of membershipRows) {
      const rejectReasons: string[] = [];
      const owner = membership.owner ?? null;
      const profile = normalizeProfile(owner);

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

      if (membership.contract_year && bookingYear && membership.contract_year !== bookingYear) {
        rejectReasons.push('contract_year_mismatch');
      }

      if (membership.use_year_start && membership.use_year_end && booking.check_in && booking.check_out) {
        const useStart = new Date(membership.use_year_start);
        const useEnd = new Date(membership.use_year_end);
        if (checkInDate < useStart || checkOutDate > useEnd) {
          rejectReasons.push('use_year_out_of_range');
        }
      }

      const currentAvailable = Math.max(
        (membership.points_available ?? 0) - (membership.points_reserved ?? 0),
        0,
      );
      let nextMembership: MembershipRow | null = null;
      let borrowable = 0;
      if (membership.borrowing_enabled) {
        const nextKey = `${membership.owner_id}:${membership.resort_id}:${
          (membership.contract_year ?? bookingYear ?? 0) + 1
        }`;
        const candidateNext = membershipMap.get(nextKey) ?? null;
        if (candidateNext) {
          const nextAvailable = Math.max(
            (candidateNext.points_available ?? 0) -
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
        contract_year: membership.contract_year ?? null,
        use_year_start: membership.use_year_start ?? null,
        use_year_end: membership.use_year_end ?? null,
        points_available: membership.points_available ?? 0,
        points_reserved: membership.points_reserved ?? 0,
        points_ok: pointsOk,
        rejectReasons,
      });

      if (rejectReasons.length > 0) {
        continue;
      }

      const reserveCurrent = Math.min(currentAvailable, booking.total_points);
      const reserveBorrowed = booking.total_points - reserveCurrent;
      const leftover = totalUsable - booking.total_points;
      const score =
        currentAvailable >= booking.total_points
          ? 1000 - (currentAvailable - booking.total_points)
          : 600 - reserveBorrowed * 2 - leftover;

      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = {
          membership,
          nextMembership,
          ownerProfile: profile,
          reserveCurrent,
          reserveBorrowed,
          score,
        };
      }
    }

    if (!bestCandidate) {
      if (!evaluated.skipReasons.includes('no_eligible_candidates')) {
        evaluated.skipReasons.push('no_eligible_candidates');
      }
      evaluatedBookings.push(evaluated);
      continue;
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
      dryRun,
      eligibleBookings: evaluation.eligibleBookings,
      evaluatedBookings,
      errors,
    };
  }

  for (const plan of evaluation.matchPlans) {
    const { data: matchId, error } = await client.rpc('apply_booking_match', {
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

    if (error || !matchId) {
      errors.push({
        bookingId: plan.bookingId,
        step: 'apply_booking_match',
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

    if (sendEmails && plan.ownerEmail) {
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
    dryRun,
    eligibleBookings: evaluation.eligibleBookings,
    evaluatedBookings,
    errors,
  };
}

export function parseMatchLimit(value: string | null) {
  return parseLimit(value);
}
