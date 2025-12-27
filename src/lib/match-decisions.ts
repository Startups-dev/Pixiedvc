import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export type MatchDecision = 'accepted' | 'declined';

export async function processMatchDecision(token: string, decision: MatchDecision) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return { ok: false, status: 500, message: 'Service role key not configured' };
  }

  const { data: match, error } = await client
    .from('booking_matches')
    .select('id, status, booking_id, owner_id, owner_membership_id, points_reserved')
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
  } else if (match.owner_membership_id) {
    const { data: membership, error: membershipError } = await client
      .from('owner_memberships')
      .select('points_available')
      .eq('id', match.owner_membership_id)
      .maybeSingle();

    if (membershipError) {
      console.error('Failed to load membership for refund', membershipError);
    } else if (membership) {
      const restored = (membership.points_available ?? 0) + (match.points_reserved ?? 0);
      const { error: restoreError } = await client
        .from('owner_memberships')
        .update({ points_available: restored })
        .eq('id', match.owner_membership_id);
      if (restoreError) {
        console.error('Failed to restore membership points', restoreError);
      }
    }
  }

  const message = decision === 'accepted' ? 'Thanks! The guest has been notified.' : 'No worries — we will match this guest with another owner.';
  return { ok: true, status: 200, message };
}
