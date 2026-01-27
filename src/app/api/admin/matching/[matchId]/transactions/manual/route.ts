import { NextResponse } from 'next/server';

import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { logAdminEvent } from '@/lib/admin/audit';
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

  let createdSplits: Array<{
    recipient_type: string;
    owner_id: number | null;
    jurisdiction_id: string | null;
    amount_cents: number;
  }> = [];

  const { data: existingSplits, error: existingSplitsError } = await adminClient
    .from('transaction_splits')
    .select('id')
    .eq('transaction_id', inserted.id);

  if (existingSplitsError) {
    return NextResponse.json({ error: existingSplitsError.message }, { status: 500 });
  }

  if ((existingSplits ?? []).length === 0) {
    const grandTotalCents = detail.paymentSchedule.grand_total_cents ?? null;
    const taxExpectedCents = detail.paymentSchedule.total_tax_cents ?? 0;
    const platformExpectedCents =
      typeof detail.match.points_reserved === 'number' && detail.match.points_reserved > 0
        ? Math.round(detail.match.points_reserved * 500)
        : 0;
    const ownerExpectedCents =
      grandTotalCents !== null
        ? Math.max(0, grandTotalCents - platformExpectedCents - taxExpectedCents)
        : 0;

    const baseTotal = grandTotalCents && grandTotalCents > 0 ? grandTotalCents : amountCents;
    const safeBaseTotal = baseTotal > 0 ? baseTotal : amountCents;

    const proportional = (expected: number) =>
      Math.round((expected * amountCents) / safeBaseTotal);

    let platformSplit = Math.max(0, proportional(platformExpectedCents));
    let taxSplit = Math.max(0, proportional(taxExpectedCents));
    if (platformSplit + taxSplit > amountCents) {
      const overflow = platformSplit + taxSplit - amountCents;
      if (taxSplit >= overflow) {
        taxSplit -= overflow;
      } else {
        platformSplit = Math.max(0, platformSplit - (overflow - taxSplit));
        taxSplit = 0;
      }
    }
    const ownerSplit = Math.max(0, amountCents - platformSplit - taxSplit);

    const { data: resortRow } = await adminClient
      .from('resorts')
      .select('tax_jurisdiction_id')
      .eq('id', detail.booking?.primary_resort_id ?? '')
      .maybeSingle();

    const taxJurisdictionId = resortRow?.tax_jurisdiction_id ?? null;
    let adjustedOwnerSplit = ownerSplit;
    let adjustedTaxSplit = taxSplit;

    if (!taxJurisdictionId && adjustedTaxSplit > 0) {
      adjustedOwnerSplit += adjustedTaxSplit;
      adjustedTaxSplit = 0;
    }

    const rawOwnerMembershipId = detail.match.owner_membership_id;
    const ownerMembershipId =
      typeof rawOwnerMembershipId === 'string'
        ? Number(rawOwnerMembershipId)
        : rawOwnerMembershipId ?? null;
    const normalizedOwnerMembershipId =
      typeof ownerMembershipId === 'number' && Number.isFinite(ownerMembershipId)
        ? ownerMembershipId
        : null;

    let splitsSupportMeta = false;
    const { data: metaColumnRows, error: metaColumnError } = await adminClient
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'transaction_splits')
      .eq('column_name', 'meta');

    if (!metaColumnError && (metaColumnRows ?? []).length > 0) {
      splitsSupportMeta = true;
    }

    const splitMeta = splitsSupportMeta
      ? {
          source: 'admin_manual_auto_split',
          match_id: matchId,
          booking_request_id: detail.match.booking_id ?? null,
          owner_membership_id: normalizedOwnerMembershipId,
          owner_uuid: detail.match.owner_id ?? null,
          expected_platform_cents: platformExpectedCents,
          expected_owner_cents: ownerExpectedCents,
          expected_tax_cents: taxExpectedCents,
          allocation_basis_grand_total_cents: safeBaseTotal,
          allocation_txn_amount_cents: amountCents,
        }
      : null;

    const splitPayloads = [
      {
        transaction_id: inserted.id,
        recipient_type: 'platform',
        owner_id: null,
        jurisdiction_id: null,
        amount_cents: platformSplit,
        ...(splitMeta ? { meta: splitMeta } : {}),
      },
      {
        transaction_id: inserted.id,
        recipient_type: 'owner',
        owner_id: normalizedOwnerMembershipId,
        jurisdiction_id: null,
        amount_cents: adjustedOwnerSplit,
        ...(splitMeta ? { meta: splitMeta } : {}),
      },
      {
        transaction_id: inserted.id,
        recipient_type: 'tax_authority',
        owner_id: null,
        jurisdiction_id: taxJurisdictionId,
        amount_cents: adjustedTaxSplit,
        ...(splitMeta ? { meta: splitMeta } : {}),
      },
    ].filter((split) => split.amount_cents > 0);

    if (splitPayloads.length > 0) {
      const { data: splitInsert, error: splitInsertError } = await adminClient
        .from('transaction_splits')
        .insert(splitPayloads)
        .select('recipient_type, owner_id, jurisdiction_id, amount_cents');

      if (splitInsertError) {
        return NextResponse.json(
          { error: splitInsertError.message ?? 'Failed to create splits' },
          { status: 500 },
        );
      }

      createdSplits = (splitInsert ?? []) as typeof createdSplits;
    }
  }

  await logAdminEvent({
    client: adminClient,
    actorEmail: user.email ?? null,
    actorUserId: user.id,
    action: 'manual_payment.create',
    entityType: 'transaction',
    entityId: inserted.id,
    meta: {
      match_id: matchId,
      booking_request_id: detail.match.booking_id ?? null,
      txn_type: txnType,
      amount_cents: amountCents,
      processor: 'manual',
      status: 'succeeded',
    },
    req: request,
  });

  return NextResponse.json({
    ok: true,
    matchId,
    bookingId: detail.match.booking_id ?? null,
    txnType,
    amount_cents: amountCents,
    splits: createdSplits,
  });
}
