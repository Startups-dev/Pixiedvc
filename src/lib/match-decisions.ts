import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { resolveCalculatorCode } from '@/lib/resort-calculator';

export type MatchDecision = 'accepted' | 'declined';

export async function processMatchDecision(token: string, decision: MatchDecision) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { ok: false, status: 500, message: 'Service role key not configured' };
  }

  const { data: match, error } = await client
    .from('booking_matches')
    .select('id, status, booking_id, owner_id, owner_membership_id, points_reserved, points_reserved_current, points_reserved_borrowed')
    .eq('response_token', token)
    .maybeSingle();

  if (error) {
    console.error('Match decision lookup error', error);
    return { ok: false, status: 500, message: 'Unable to load match' };
  }

  if (!match) {
    return { ok: false, status: 404, message: 'Match not found' };
  }

  if (match.status !== 'pending_owner') {
    return { ok: false, status: 409, message: `Match already ${match.status}` };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await client
    .from('booking_matches')
    .update({ status: decision, responded_at: now })
    .eq('id', match.id);

  if (updateError) {
    console.error('Failed to update match decision', updateError);
    return { ok: false, status: 500, message: 'Unable to update match' };
  }

  if (decision === 'accepted') {
    const { error: bookingError } = await client
      .from('booking_requests')
      .update({ status: 'matched', matched_owner_id: match.owner_id, updated_at: now })
      .eq('id', match.booking_id);

    if (bookingError) {
      console.error('Failed to mark booking matched', bookingError);
      return { ok: false, status: 500, message: 'Match updated but booking could not be marked matched' };
    }

    const { data: booking } = await client
      .from('booking_requests')
      .select(
        'id, renter_id, check_in, check_out, nights, primary_resort_id, primary_room, primary_view, total_points, adults, youths, requires_accessibility, comments, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, address_line2, city, state, postal_code, country, deposit_due, deposit_paid, deposit_currency, guest_profile_complete_at, guest_agreement_accepted_at, primary_resort:resorts!booking_requests_primary_resort_id_fkey(slug, calculator_code, name)',
      )
      .eq('id', match.booking_id)
      .maybeSingle();

    const { data: owner } = await client
      .from('owners')
      .select('id, user_id')
      .eq('id', match.owner_id)
      .maybeSingle();

    const ownerUserId = owner?.user_id ?? null;
    const resortMeta = booking?.primary_resort ?? null;
    const resortCode = resolveCalculatorCode({
      slug: resortMeta?.slug ?? null,
      calculator_code: resortMeta?.calculator_code ?? null,
    });

    if (booking && ownerUserId) {
      const guestVerified = Boolean(
        booking.guest_profile_complete_at && booking.guest_agreement_accepted_at,
      );
      const paymentVerified =
        typeof booking.deposit_paid === 'number' &&
        typeof booking.deposit_due === 'number' &&
        booking.deposit_due > 0 &&
        booking.deposit_paid >= booking.deposit_due;
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
        party_size: typeof booking.adults === 'number' && typeof booking.youths === 'number' ? booking.adults + booking.youths : null,
        adults: booking.adults ?? null,
        youths: booking.youths ?? null,
        requires_accessibility: booking.requires_accessibility ?? false,
        comments: booking.comments ?? null,
        deposit_due: booking.deposit_due ?? null,
        deposit_paid: booking.deposit_paid ?? null,
        deposit_currency: booking.deposit_currency ?? 'USD',
      };

      const { data: existingRental } = await client
        .from('rentals')
        .select('id')
        .eq('owner_user_id', ownerUserId)
        .eq('booking_package->>booking_request_id', booking.id)
        .maybeSingle();

      if (!existingRental) {
        const { data: rentalRow, error: rentalError } = await client
          .from('rentals')
          .insert({
            owner_user_id: ownerUserId,
            guest_user_id: booking.renter_id ?? null,
            resort_code: resortCode ?? resortMeta?.slug ?? 'TBD',
            room_type: booking.primary_room ?? null,
            check_in: booking.check_in ?? null,
            check_out: booking.check_out ?? null,
            points_required: booking.total_points ?? null,
            status: 'awaiting_owner_approval',
            booking_package: bookingPackage,
            lead_guest_name: booking.lead_guest_name ?? null,
            lead_guest_email: booking.lead_guest_email ?? null,
            lead_guest_phone: booking.lead_guest_phone ?? null,
            lead_guest_address: bookingPackage.lead_guest_address,
            party_size: bookingPackage.party_size,
            adults: booking.adults ?? null,
            youths: booking.youths ?? null,
            special_needs: booking.requires_accessibility ?? false,
            special_needs_notes: booking.comments ?? null,
          })
          .select('id')
          .maybeSingle();

        if (rentalError) {
          console.error('Failed to create rental', rentalError);
        } else if (rentalRow) {
          const milestoneRows = [
            { code: 'matched', status: 'completed', occurred_at: now },
            {
              code: 'guest_verified',
              status: guestVerified ? 'completed' : 'pending',
              occurred_at: guestVerified ? now : null,
            },
            {
              code: 'payment_verified',
              status: paymentVerified ? 'completed' : 'pending',
              occurred_at: paymentVerified ? now : null,
            },
            { code: 'booking_package_sent', status: 'completed', occurred_at: now },
            { code: 'agreement_sent', status: 'pending', occurred_at: null },
            { code: 'owner_approved', status: 'pending', occurred_at: null },
            { code: 'owner_booked', status: 'pending', occurred_at: null },
            { code: 'check_in', status: 'pending', occurred_at: null },
            { code: 'check_out', status: 'pending', occurred_at: null },
          ].map((row) => ({ ...row, rental_id: rentalRow.id }));

          const { error: milestoneError } = await client.from('rental_milestones').insert(milestoneRows);
          if (milestoneError) {
            console.error('Failed to seed rental milestones', milestoneError);
          }
        }
      }
    }
  } else if (match.owner_membership_id) {
    const reservedCurrent = match.points_reserved_current ?? match.points_reserved ?? 0;
    const reservedBorrowed = match.points_reserved_borrowed ?? 0;
    const { data: membership, error: membershipError } = await client
      .from('owner_memberships')
      .select('id, owner_id, resort_id, use_year_start, points_reserved')
      .eq('id', match.owner_membership_id)
      .maybeSingle();

    if (membershipError) {
      console.error('Failed to load membership for refund', membershipError);
    } else if (membership && reservedCurrent) {
      const newReserved = Math.max((membership.points_reserved ?? 0) - reservedCurrent, 0);
      const { error: restoreError } = await client
        .from('owner_memberships')
        .update({ points_reserved: newReserved })
        .eq('id', match.owner_membership_id);
      if (restoreError) {
        console.error('Failed to restore membership points', restoreError);
      }
    }

    if (reservedBorrowed > 0 && membership?.owner_id && membership.resort_id) {
      const { data: booking } = await client
        .from('booking_requests')
        .select('check_in')
        .eq('id', match.booking_id)
        .maybeSingle();

      const currentStart = membership.use_year_start ?? null;
      if (currentStart) {
        const nextStart = new Date(currentStart);
        if (Number.isNaN(nextStart.getTime())) {
          return;
        }
        nextStart.setUTCFullYear(nextStart.getUTCFullYear() + 1);
        const nextISO = nextStart.toISOString().slice(0, 10);
        const { data: nextMembership } = await client
          .from('owner_memberships')
          .select('id, points_reserved')
          .eq('owner_id', membership.owner_id)
          .eq('resort_id', membership.resort_id)
          .eq('use_year_start', nextISO)
          .maybeSingle();

        if (nextMembership) {
          const newReserved = Math.max((nextMembership.points_reserved ?? 0) - reservedBorrowed, 0);
          const { error: restoreError } = await client
            .from('owner_memberships')
            .update({ points_reserved: newReserved })
            .eq('id', nextMembership.id);
          if (restoreError) {
            console.error('Failed to restore borrowed points', restoreError);
          }
        }
      }
    }
  }

  const message = decision === 'accepted' ? 'Thanks! The guest has been notified.' : 'No worries — we will match this guest with another owner.';
  return { ok: true, status: 200, message };
}
