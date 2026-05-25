import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { maybeGrantFoundingOwnerBonus } from '@/lib/founding-owner-bonus';

function logAdminOwnerWrite(params: {
  table: string;
  operation: string;
  targetId: string;
  error: { message?: string; code?: string; details?: string; hint?: string } | null;
}) {
  console.error('[admin-owner-write]', {
    route: 'POST /api/admin/owners/verifications/[ownerId]/approve',
    table: params.table,
    operation: params.operation,
    targetId: params.targetId,
    error: params.error
      ? {
          message: params.error.message ?? null,
          code: params.error.code ?? null,
          details: params.error.details ?? null,
          hint: params.error.hint ?? null,
        }
      : null,
  });
}

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
  console.error('[admin-owner-write-attempt]', {
    route: 'POST /api/admin/owners/verifications/[ownerId]/approve',
    table: 'owner_verifications',
    operation: 'update',
    targetId: String(ownerId),
    client: 'service_role_admin_client',
  });
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
    logAdminOwnerWrite({
      table: 'owner_verifications',
      operation: 'update',
      targetId: String(ownerId),
      error,
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error('[admin-owner-write-attempt]', {
    route: 'POST /api/admin/owners/verifications/[ownerId]/approve',
    table: 'owners',
    operation: 'update',
    targetId: String(ownerId),
    client: 'service_role_admin_client',
  });
  const { error: ownerError } = await adminClient
    .from('owners')
    .update({ verification: 'verified', verified_at: now, rejection_reason: null })
    .eq('id', ownerId);
  if (ownerError) {
    logAdminOwnerWrite({
      table: 'owners',
      operation: 'update',
      targetId: String(ownerId),
      error: ownerError,
    });
    return NextResponse.json({ error: ownerError.message }, { status: 400 });
  }

  console.error('[admin-owner-write-attempt]', {
    route: 'POST /api/admin/owners/verifications/[ownerId]/approve',
    table: 'owners',
    operation: 'update',
    targetId: String(ownerId),
    client: 'service_role_admin_client',
    context: 'maybeGrantFoundingOwnerBonus',
  });
  const { error: foundingOwnerBonusError } = await maybeGrantFoundingOwnerBonus({
    adminClient,
    ownerId,
  });
  if (foundingOwnerBonusError) {
    logAdminOwnerWrite({
      table: 'owners',
      operation: 'update',
      targetId: String(ownerId),
      error: foundingOwnerBonusError,
    });
  }

  return NextResponse.redirect(new URL(`/admin/owners/verifications/${ownerId}`, request.url));
}
