import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';

export async function POST(request: Request) {
  const { ownerId, status, reason } = await request.json();

  if (!ownerId || !status) {
    return NextResponse.json({ error: 'Missing ownerId or status' }, { status: 400 });
  }

  if (!['verified', 'rejected', 'needs_more_info'].includes(status)) {
    return NextResponse.json({ error: 'Unsupported status' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates: Record<string, unknown> = {
    verification: status,
  };

  if (status === 'verified') {
    updates.verified_at = new Date().toISOString();
    updates.rejection_reason = null;
  } else if (status === 'rejected') {
    updates.rejection_reason = reason ?? null;
    updates.verified_at = null;
  } else if (status === 'needs_more_info') {
    updates.rejection_reason = reason ?? null;
    updates.verified_at = null;
  }

  const { data: existing } = await supabase
    .from('owners')
    .select('verification')
    .eq('id', ownerId)
    .maybeSingle();

  const { error } = await supabase.from('owners').update(updates).eq('id', ownerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from('owner_verification_events').insert({
    owner_id: ownerId,
    old_status: existing?.verification ?? null,
    new_status: status,
    actor_id: user.id,
  });

  if (reason) {
    await supabase.from('owner_comments').insert({
      owner_id: ownerId,
      author_id: user.id,
      body: reason,
      kind: 'status_change',
    });
  }

  return NextResponse.json({ success: true });
}
