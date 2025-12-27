import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { sendOwnerMatchEmail } from '@/lib/email';

type BookingRow = {
  id: string;
  primary_resort_id: string | null;
  total_points: number | null;
  status: string;
  check_in: string | null;
  check_out: string | null;
  primary_resort?: {
    name: string | null;
  } | null;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  booking_matches?: { status: string | null }[] | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

type OwnerRow = {
  id: string;
  verification: string | null;
  profiles: ProfileRow | ProfileRow[] | null;
};

type MembershipRow = {
  id: number;
  owner_id: string;
  resort_id: string;
  points_available: number | null;
  owner?: OwnerRow | null;
};

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Service role key not configured' },
      { status: 500 },
    );
  }

  // 1) Load submitted booking requests that need matching
  const { data: bookings, error: bookingError } = await client
    .from('booking_requests')
    .select(
      `
        id,
        primary_resort_id,
        total_points,
        status,
        check_in,
        check_out,
        lead_guest_name,
        lead_guest_email,
        primary_resort:resorts(name),
        booking_matches(status)
      `,
    )
    .eq('status', 'submitted')
    .limit(20);

  if (bookingError) {
    return NextResponse.json(
      { error: bookingError.message },
      { status: 500 },
    );
  }

  const createdMatches: string[] = [];
  const origin = request.nextUrl.origin;

  for (const booking of (bookings ?? []) as BookingRow[]) {
    // --- Basic sanity checks ------------------------------------
    if (
      !booking.primary_resort_id ||
      !booking.total_points ||
      booking.total_points <= 0
    ) {
      continue;
    }

    // Skip if this booking already has a pending owner match
    const hasPendingMatch = (booking.booking_matches ?? []).some(
      (match) => match.status === 'pending_owner',
    );
    if (hasPendingMatch) {
      continue;
    }

    // 2) Find candidate memberships with enough points at this resort
    const {
      data: memberships,
      error: membershipError,
    } = await client
      .from('owner_memberships')
      .select(
        `
        id,
        owner_id,
        resort_id,
        points_available,
        owner:owners (
          id,
          verification,
          profiles:profiles!owners_user_id_fkey (
            id,
            email,
            display_name
          )
        )
      `,
      )
      .eq('resort_id', booking.primary_resort_id)
      .gte('points_available', booking.total_points)
      .order('points_available', { ascending: true })
      .limit(10);

    if (membershipError) {
      console.error('Failed to load memberships for match', membershipError);
      continue;
    }

    if (!memberships || memberships.length === 0) {
      // No owners with enough points for this resort
      continue;
    }

    // 3) In TS: only verified owners AND ones with a usable email
    const membership = (memberships as MembershipRow[]).find((m) => {
      const owner = m.owner;
      if (!owner || owner.verification !== 'verified') return false;

      const profiles = owner.profiles;
      const profile = Array.isArray(profiles) ? profiles[0] : profiles;
      return !!profile?.email;
    });

    if (!membership) {
      // No verified owners with an email in this batch
      continue;
    }

    const ownerProfiles = membership.owner?.profiles;
    const ownerProfile: ProfileRow | null = Array.isArray(ownerProfiles)
      ? ownerProfiles[0] ?? null
      : ownerProfiles ?? null;

    const ownerEmail: string | null = ownerProfile?.email ?? null;
    const ownerName: string =
      ownerProfile?.display_name ?? 'PixieDVC Owner';

    if (!ownerEmail) {
      // Shouldn't happen because we filtered above, but guard anyway
      continue;
    }

    // 4) Reserve the owner points with an optimistic lock
    const {
      data: reservedRow,
      error: reserveError,
    } = await client
      .from('owner_memberships')
      .update({
        points_available: Math.max(
          (membership.points_available ?? 0) - (booking.total_points ?? 0),
          0,
        ),
      })
      .eq('id', membership.id)
      .gte('points_available', booking.total_points)
      .select('id')
      .maybeSingle();

    if (reserveError) {
      console.error('Failed to reserve owner points', reserveError);
      continue;
    }

    if (!reservedRow) {
      // Another process may have consumed these points first
      continue;
    }

    // 5) Create the booking_match row
    const {
      data: matchRow,
      error: matchError,
    } = await client
      .from('booking_matches')
      .insert({
        booking_id: booking.id,
        owner_id: membership.owner_id,
        points_reserved: booking.total_points,
        status: 'pending_owner',
      })
      .select('id')
      .maybeSingle();

    if (matchError || !matchRow) {
      console.error('Failed to insert booking_match', matchError);
      // Optionally you could roll back the points reservation here
      continue;
    }

    createdMatches.push(matchRow.id);

    // 6) Update booking status to reflect that we're waiting on the owner
    await client
      .from('booking_requests')
      .update({ status: 'pending_owner' })
      .eq('id', booking.id);

    // 7) Send email to owner with Accept / Decline links
    const acceptUrl = `${origin}/api/matches/owner/accept?matchId=${matchRow.id}`;
    const declineUrl = `${origin}/api/matches/owner/decline?matchId=${matchRow.id}`;

    try {
      await sendOwnerMatchEmail({
        to: ownerEmail,
        ownerName,
        resortName: booking.primary_resort?.name ?? 'your DVC resort',
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        totalPoints: booking.total_points,
        leadGuestName: booking.lead_guest_name,
        leadGuestEmail: booking.lead_guest_email,
        acceptUrl,
        declineUrl,
      });
    } catch (emailError) {
      console.error('Failed to send owner match email', emailError);
      // We still keep the match; email can be retried separately
    }
  }

  return NextResponse.json({
    matchesCreated: createdMatches.length,
    matchIds: createdMatches,
  });
}

