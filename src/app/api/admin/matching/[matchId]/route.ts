import { NextResponse } from 'next/server';

import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { logAdminAuditEvent } from '@/lib/admin/audit';
import { fetchAdminMatchDetail } from '@/lib/admin/matching';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { matchId: string } },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email ?? null)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const matchId = params.matchId;
  if (!matchId) {
    return NextResponse.json({ error: 'Missing matchId' }, { status: 400 });
  }

  try {
    const result = await fetchAdminMatchDetail({ authClient: supabase, matchId });

    if (!result.match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load match detail.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { matchId: string } },
) {
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

  const matchId = params.matchId;
  if (!matchId) {
    return NextResponse.json({ error: 'Missing matchId' }, { status: 400 });
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchId)) {
    return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 });
  }

  const { data: match, error: matchError } = await adminClient
    .from('booking_matches')
    .select('*')
    .eq('id', matchId)
    .maybeSingle();

  if (matchError) {
    return NextResponse.json({ error: matchError.message }, { status: 500 });
  }

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
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
    return NextResponse.json({ error: 'Match already has a rental' }, { status: 409 });
  }

  const { data: deletedMatch, error: deleteError } = await adminClient
    .from('booking_matches')
    .delete()
    .eq('id', matchId)
    .select('id')
    .maybeSingle();

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (!deletedMatch) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  await logAdminAuditEvent(adminClient, {
    adminUserId: user.id,
    adminEmail: user.email ?? null,
    action: 'match.delete',
    entityType: 'booking_match',
    entityId: matchId,
    before: match,
    after: null,
    meta: { reason: 'admin_cleanup', bookingId: match.booking_id ?? null },
  });

  return NextResponse.json({ ok: true, matchId, bookingId: match.booking_id ?? null });
}
