import { NextResponse } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';

export async function POST(request: Request) {
  const { requestId, note } = await request.json();

  if (!requestId) {
    return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
  }

  const sessionClient = await createSupabaseServerClient();
  const adminClient = getSupabaseAdminClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!adminClient) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
  }

  const { data: existing, error: existingError } = await adminClient
    .from('booking_requests')
    .select('id, status, availability_status')
    .eq('id', requestId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  if (existing.availability_status !== 'confirmed') {
    return NextResponse.json({ error: 'availability_not_confirmed' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const { data: updatedRequest, error: updateError } = await adminClient
    .from('booking_requests')
    .update({ status: 'pending_match', updated_at: nowIso })
    .eq('id', requestId)
    .select('id, status, availability_status, availability_checked_at')
    .maybeSingle();

  if (updateError || !updatedRequest) {
    return NextResponse.json({ error: updateError?.message ?? 'Unable to promote request' }, { status: 400 });
  }

  await adminClient.from('guest_request_activity').insert({
    request_id: requestId,
    author_id: user.id,
    kind: 'status_change',
    body: note ?? null,
    from_status: existing.status ?? null,
    to_status: 'pending_match',
    metadata: { action: 'promote_to_matching' },
  });

  return NextResponse.json({
    ok: true,
    id: updatedRequest.id,
    status: updatedRequest.status,
    availability_status: updatedRequest.availability_status,
    availability_checked_at: updatedRequest.availability_checked_at,
  });
}
