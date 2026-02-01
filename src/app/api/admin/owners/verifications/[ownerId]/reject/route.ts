import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ownerId: string }> },
) {
  const { ownerId } = await params;
  const formData = await request.formData();
  const reviewNotes = String(formData.get('review_notes') ?? '').trim();

  if (!reviewNotes) {
    return NextResponse.json({ error: 'Review notes are required' }, { status: 400 });
  }

  const cookieStore = await cookies();
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
      status: 'rejected',
      rejected_at: now,
      approved_at: null,
      review_notes: reviewNotes,
      reviewed_by: user.id,
    })
    .eq('owner_id', ownerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminClient
    .from('owners')
    .update({ verification: 'rejected', verified_at: null, rejection_reason: reviewNotes })
    .eq('id', ownerId);

  return NextResponse.redirect(new URL(`/admin/owners/verifications/${ownerId}`, request.url));
}
