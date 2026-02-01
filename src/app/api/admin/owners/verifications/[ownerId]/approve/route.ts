import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> },
) {
  const { ownerId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { error } = await adminClient
    .from('owner_verifications')
    .update({
      status: 'approved',
      approved_at: now,
      rejected_at: null,
      review_notes: null,
      reviewed_by: user.id,
    })
    .eq('owner_id', ownerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminClient
    .from('owners')
    .update({ verification: 'verified', verified_at: now, rejection_reason: null })
    .eq('id', ownerId);

  return NextResponse.redirect(new URL(`/admin/owners/verifications/${ownerId}`, request.url));
}
