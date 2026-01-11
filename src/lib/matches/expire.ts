import type { SupabaseClient } from '@supabase/supabase-js';

type MatchRow = {
  id: string;
  booking_id: string;
  owner_membership_id: string | number | null;
  points_reserved: number | null;
  points_reserved_current?: number | null;
  points_reserved_borrowed?: number | null;
};

export async function expireMatchAndReleasePoints(options: {
  adminClient: SupabaseClient;
  match: MatchRow;
  nowIso: string;
  setExpiresAt?: string | null;
}) {
  const { adminClient, match, nowIso, setExpiresAt } = options;

  const updatePayload: Record<string, unknown> = {
    status: 'expired',
    responded_at: nowIso,
  };

  if (setExpiresAt) {
    updatePayload.expires_at = setExpiresAt;
  }

  const { data: updatedMatch, error: matchUpdateError } = await adminClient
    .from('booking_matches')
    .update(updatePayload)
    .eq('id', match.id)
    .select('*')
    .maybeSingle();

  if (matchUpdateError) {
    throw matchUpdateError;
  }

  const reservedCurrent = match.points_reserved_current ?? match.points_reserved ?? 0;
  if (match.owner_membership_id && reservedCurrent) {
    const { data: membership, error: membershipError } = await adminClient
      .from('owner_memberships')
      .select('id, points_reserved')
      .eq('id', match.owner_membership_id)
      .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (membership) {
      const newReserved = Math.max((membership.points_reserved ?? 0) - reservedCurrent, 0);
      const { error: updateError } = await adminClient
        .from('owner_memberships')
        .update({ points_reserved: newReserved })
        .eq('id', match.owner_membership_id);

      if (updateError) {
        throw updateError;
      }
    }
  }

  const reservedBorrowed = match.points_reserved_borrowed ?? 0;
  if (reservedBorrowed > 0) {
    const { data: booking, error: bookingError } = await adminClient
      .from('booking_requests')
      .select('primary_resort_id, check_in')
      .eq('id', match.booking_id)
      .maybeSingle();

    if (bookingError) {
      throw bookingError;
    }

    const { data: currentMembership, error: currentMembershipError } = await adminClient
      .from('owner_memberships')
      .select('owner_id, resort_id, contract_year')
      .eq('id', match.owner_membership_id)
      .maybeSingle();

    if (currentMembershipError) {
      throw currentMembershipError;
    }

    const bookingYear = booking?.check_in ? new Date(booking.check_in).getUTCFullYear() : null;
    const currentYear = currentMembership?.contract_year ?? bookingYear;

    if (currentMembership?.owner_id && currentMembership?.resort_id && currentYear) {
      const { data: nextMembership, error: nextMembershipError } = await adminClient
        .from('owner_memberships')
        .select('id, points_reserved')
        .eq('owner_id', currentMembership.owner_id)
        .eq('resort_id', currentMembership.resort_id)
        .eq('contract_year', currentYear + 1)
        .maybeSingle();

      if (nextMembershipError) {
        throw nextMembershipError;
      }

      if (nextMembership) {
        const newReserved = Math.max((nextMembership.points_reserved ?? 0) - reservedBorrowed, 0);
        const { error: updateError } = await adminClient
          .from('owner_memberships')
          .update({ points_reserved: newReserved })
          .eq('id', nextMembership.id);

        if (updateError) {
          throw updateError;
        }
      }
    }
  }

  const { error: bookingUpdateError } = await adminClient
    .from('booking_requests')
    .update({ status: 'pending_match', matched_owner_id: null, updated_at: nowIso })
    .eq('id', match.booking_id);

  if (bookingUpdateError) {
    throw bookingUpdateError;
  }

  return updatedMatch ?? null;
}
