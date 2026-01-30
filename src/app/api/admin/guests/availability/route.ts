import { NextResponse } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';

export async function POST(request: Request) {
  const { requestId, availabilityStatus, note } = await request.json();

  if (!requestId || !availabilityStatus) {
    return NextResponse.json({ error: 'Missing requestId or availabilityStatus' }, { status: 400 });
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

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  if (!existing) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const prevStatus = existing.status ?? null;
  const nextStatus =
    availabilityStatus === 'confirmed' && (prevStatus === 'submitted' || prevStatus === 'needs_check')
      ? 'pending_match'
      : prevStatus;
  const nowIso = new Date().toISOString();

  const { data: updatedRequest, error: updateError } = await adminClient
    .from('booking_requests')
    .update({
      availability_status: availabilityStatus,
      availability_checked_at: nowIso,
      availability_notes: note ?? null,
      status: nextStatus,
      updated_at: nowIso,
    })
    .eq('id', requestId)
    .select('id, status, availability_status, availability_checked_at')
    .single();

  if (updateError || !updatedRequest) {
    return NextResponse.json({ error: updateError?.message ?? 'Unable to update request' }, { status: 400 });
  }

  await adminClient.from('guest_request_activity').insert({
    request_id: requestId,
    author_id: user.id,
    kind: 'availability',
    body: note ?? null,
    metadata: { availability_status: availabilityStatus },
  });

  if (prevStatus !== updatedRequest.status) {
    await adminClient.from('guest_request_activity').insert({
      request_id: requestId,
      author_id: user.id,
      kind: 'status_change',
      body: null,
      from_status: prevStatus,
      to_status: updatedRequest.status,
      metadata: { action: 'promote_to_matching' },
    });
  }

  return NextResponse.json({ ok: true, request: updatedRequest });
}
