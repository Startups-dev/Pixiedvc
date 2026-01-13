import { NextResponse } from 'next/server';

import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { logAdminAuditEvent } from '@/lib/admin/audit';
import { fetchAdminMatchDetail } from '@/lib/admin/matching';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const VALID_TYPES = new Set(['deposit', 'booking', 'checkin']);

export async function POST(
  request: Request,
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

  let body: {
    txn_type?: string;
    amount_cents?: number | null;
    paid_at?: string | null;
    note?: string | null;
  } = {};

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const txnType = body.txn_type ?? null;
  if (!txnType || !VALID_TYPES.has(txnType)) {
    return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
  }

  const detail = await fetchAdminMatchDetail({ authClient: supabase, matchId });
  if (!detail.match || !detail.booking) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const { data: existingTxn, error: existingError } = await adminClient
    .from('transactions')
    .select('id, status')
    .eq('match_id', matchId)
    .eq('direction', 'in')
    .eq('txn_type', txnType)
    .eq('status', 'succeeded')
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existingTxn) {
    return NextResponse.json(
      { error: 'A transaction already exists for this payment type.' },
      { status: 409 },
    );
  }

  const expectedAmountCents =
    txnType === 'deposit'
      ? detail.paymentSchedule.deposit_cents
      : txnType === 'booking'
        ? detail.paymentSchedule.due_booking_cents
        : detail.paymentSchedule.due_checkin_cents;

  const amountCents =
    typeof body.amount_cents === 'number' ? Math.round(body.amount_cents) : expectedAmountCents;

  if (amountCents === null || Number.isNaN(amountCents) || amountCents < 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const paidAt = body.paid_at ? new Date(body.paid_at) : new Date();
  if (Number.isNaN(paidAt.getTime())) {
    return NextResponse.json({ error: 'Invalid paid_at' }, { status: 400 });
  }

  const insertPayload = {
    booking_request_id: detail.match.booking_id ?? null,
    match_id: matchId,
    direction: 'in',
    txn_type: txnType,
    amount_cents: amountCents,
    currency: 'USD',
    processor: 'manual',
    processor_ref: null,
    status: 'succeeded',
    paid_at: paidAt.toISOString(),
    meta: {
      source: 'admin_manual',
      expected_amount_cents: expectedAmountCents,
      note: body.note ?? null,
      created_by: user.email ?? null,
      schedule_version: 1,
    },
  };

  const { data: inserted, error: insertError } = await adminClient
    .from('transactions')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'A transaction already exists for this payment type.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await logAdminAuditEvent(adminClient, {
    adminUserId: user.id,
    adminEmail: user.email ?? null,
    action: 'admin.transaction.manual_create',
    entityType: 'booking_match',
    entityId: matchId,
    before: null,
    after: inserted,
    meta: {
      bookingId: detail.match.booking_id ?? null,
      txn_type: txnType,
      amount_cents: amountCents,
      note: body.note ?? null,
      source: 'admin_manual',
    },
  });

  return NextResponse.json({
    ok: true,
    matchId,
    bookingId: detail.match.booking_id ?? null,
    txnType,
    amount_cents: amountCents,
  });
}
