import { NextRequest, NextResponse } from 'next/server';

import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { logAdminAuditEvent } from '@/lib/admin/audit';
import { expireMatchAndReleasePoints } from '@/lib/matches/expire';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email ?? null)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
  }

  if (!matchId) {
    return NextResponse.json({ error: 'Missing matchId' }, { status: 400 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchId)) {
    return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 });
  }

  const { data: match, error: matchError } = await adminClient
    .from('booking_matches')
    .select(
      'id, status, booking_id, owner_id, owner_membership_id, points_reserved, points_reserved_current, points_reserved_borrowed, created_at, expires_at, responded_at',
    )
    .eq('id', matchId)
    .maybeSingle();

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  if (!['pending_owner', 'pending', 'declined', 'expired'].includes(match.status ?? '')) {
    return NextResponse.json({ error: 'Match is not eligible for rematch' }, { status: 409 });
  }

  const { data: existingRental, error: rentalError } = await adminClient
    .from('rentals')
    .select('id')
    .eq('match_id', matchId)
    .maybeSingle();

  if (rentalError) {
    return NextResponse.json({ error: rentalError.message }, { status: 500 });
  }

  if (existingRental) {
    return NextResponse.json({ error: 'Rental exists; cannot rematch.' }, { status: 409 });
  }

  let bookingRow: { id: string; status: string | null } | null = null;
  if (match.booking_id) {
    const { data, error: bookingError } = await adminClient
      .from('booking_requests')
      .select('id, status')
      .eq('id', match.booking_id)
      .maybeSingle();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }
    bookingRow = data ?? null;
  }

  const nowIso = new Date().toISOString();

  try {
    const updatedMatch = await expireMatchAndReleasePoints({
      adminClient,
      match,
      nowIso,
      setExpiresAt: nowIso,
    });

    await logAdminAuditEvent(adminClient, {
      adminUserId: user.id,
      adminEmail: user.email ?? null,
      action: 'admin.match.rematch_requested',
      entityType: 'booking_match',
      entityId: matchId,
      before: {
        match_status_before: match.status ?? null,
        booking_status_before: bookingRow?.status ?? null,
      },
      after: {
        match_status_after: updatedMatch?.status ?? 'expired',
      },
      meta: {
        bookingId: match.booking_id ?? null,
        reason: 'admin_rematch',
      },
    });

    return NextResponse.json({
      ok: true,
      matchId,
      bookingId: match.booking_id ?? null,
      previousStatus: match.status ?? null,
      newStatus: updatedMatch?.status ?? 'expired',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rematch.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
