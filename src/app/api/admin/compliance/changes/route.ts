import { NextResponse } from 'next/server';

import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ENVIRONMENTS = new Set(['production', 'staging']);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email ?? null)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient() ?? supabase;

  let payload: {
    environment?: string;
    release_version?: string | null;
    description?: string;
    deployed_by?: string;
    approved_by?: string;
    deployed_at?: string;
    rollback_available?: boolean;
    notes?: string | null;
  } = {};

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const environment = payload.environment ?? '';
  if (!ENVIRONMENTS.has(environment)) {
    return NextResponse.json({ error: 'Invalid environment' }, { status: 400 });
  }

  const description = payload.description?.trim() ?? '';
  if (!description) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  const deployedBy = payload.deployed_by?.trim() ?? user.email ?? '';
  const approvedBy = payload.approved_by?.trim() ?? user.email ?? '';
  if (!deployedBy || !approvedBy) {
    return NextResponse.json({ error: 'Missing deployed/approved by' }, { status: 400 });
  }

  const deployedAt = payload.deployed_at ? new Date(payload.deployed_at) : new Date();
  if (Number.isNaN(deployedAt.getTime())) {
    return NextResponse.json({ error: 'Invalid deployed_at' }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from('release_changes')
    .insert({
      environment,
      release_version: payload.release_version ?? null,
      description,
      deployed_by: deployedBy,
      approved_by: approvedBy,
      deployed_at: deployedAt.toISOString(),
      rollback_available: payload.rollback_available ?? true,
      notes: payload.notes ?? null,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
