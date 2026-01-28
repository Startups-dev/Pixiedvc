import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';

const ALLOWED_STATUSES = [
  'draft',
  'submitted',
  'pending_match',
  'pending_owner',
  'matched',
  'confirmed',
  'cancelled',
];

export async function POST(request: Request) {
  const { requestId, status, note } = await request.json();

  if (!requestId || !status || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Missing or invalid status' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('booking_requests')
    .select('status')
    .eq('id', requestId)
    .maybeSingle();

  if (existingError || !existing) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from('booking_requests')
    .update({ status })
    .eq('id', requestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await supabase.from('guest_request_activity').insert({
    request_id: requestId,
    author_id: user.id,
    kind: 'status_change',
    body: note ?? null,
    from_status: existing.status ?? null,
    to_status: status,
  });

  return NextResponse.json({ ok: true });
}
