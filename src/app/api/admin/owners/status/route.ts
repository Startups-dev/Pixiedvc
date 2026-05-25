import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { maybeGrantFoundingOwnerBonus } from '@/lib/founding-owner-bonus';

function logAdminOwnerWrite(params: {
  table: string;
  operation: string;
  targetId: string;
  error: { message?: string; code?: string; details?: string; hint?: string } | null;
}) {
  console.error('[admin-owner-write]', {
    route: 'POST /api/admin/owners/status',
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

export async function POST(request: Request) {
  const { ownerId, status, reason } = await request.json();

  if (!ownerId || !status) {
    return NextResponse.json({ error: 'Missing ownerId or status' }, { status: 400 });
  }

  if (!['verified', 'rejected', 'needs_more_info'].includes(status)) {
    return NextResponse.json({ error: 'Unsupported status' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const adminClient = getSupabaseAdminClient();
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

  console.error('[admin-owner-write-attempt]', {
    route: 'POST /api/admin/owners/status',
    table: 'owners',
    operation: 'update',
    targetId: String(ownerId),
    client: 'user_scoped_server_client',
  });
  const { error } = await supabase.from('owners').update(updates).eq('id', ownerId);

  if (error) {
    logAdminOwnerWrite({
      table: 'owners',
      operation: 'update',
      targetId: String(ownerId),
      error,
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error('[admin-owner-write-attempt]', {
    route: 'POST /api/admin/owners/status',
    table: 'owner_verification_events',
    operation: 'insert',
    targetId: String(ownerId),
    client: 'user_scoped_server_client',
  });
  const { error: eventError } = await supabase.from('owner_verification_events').insert({
    owner_id: ownerId,
    old_status: existing?.verification ?? null,
    new_status: status,
    actor_id: user.id,
  });
  if (eventError) {
    logAdminOwnerWrite({
      table: 'owner_verification_events',
      operation: 'insert',
      targetId: String(ownerId),
      error: eventError,
    });
    return NextResponse.json({ error: eventError.message }, { status: 400 });
  }

  if (reason) {
    console.error('[admin-owner-write-attempt]', {
      route: 'POST /api/admin/owners/status',
      table: 'owner_comments',
      operation: 'insert',
      targetId: String(ownerId),
      client: 'user_scoped_server_client',
    });
    const { error: commentError } = await supabase.from('owner_comments').insert({
      owner_id: ownerId,
      author_id: user.id,
      body: reason,
      kind: 'status_change',
    });
    if (commentError) {
      logAdminOwnerWrite({
        table: 'owner_comments',
        operation: 'insert',
        targetId: String(ownerId),
        error: commentError,
      });
      return NextResponse.json({ error: commentError.message }, { status: 400 });
    }
  }

  if (status === 'verified' && adminClient) {
    console.error('[admin-owner-write-attempt]', {
      route: 'POST /api/admin/owners/status',
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
  }

  return NextResponse.json({ success: true });
}
