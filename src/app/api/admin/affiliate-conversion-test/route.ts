import { NextResponse } from 'next/server';

import { getCurrentUserAdminState } from '@/lib/admin';
import { logAdminAuditEvent } from '@/lib/admin/audit';
import { ensureAffiliateConversionForBooking } from '@/lib/affiliate-conversions';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

const TEST_BOOKING_REQUEST_ID = 'b524b3d7-3994-4176-b2fe-9a23c51a0f4c';
const CONFIRMATION_PHRASE = 'SIMULATE AFFILIATE CONVERSION';
const TEST_CONFIRMATION_NUMBER = 'TEST-CONFIRMATION';
const SIMULATION_ACTION = 'affiliate_conversion_test.simulate';
const RESET_ACTION = 'affiliate_conversion_test.reset';
const TEST_MILESTONE_CODES = ['owner_booked', 'disney_confirmation_uploaded'] as const;

type CanonicalBookingSnapshot = {
  deposit_due: number | null;
  deposit_paid: number | null;
  deposit_currency: string | null;
  status: string | null;
  disney_confirmation_number: string | null;
};

type RentalSnapshot = {
  id: string;
  status: string | null;
  dvc_confirmation_number: string | null;
  existedBefore: boolean;
};

type RentalMilestoneSnapshot = {
  id: string | null;
  code: string;
  status: string | null;
  occurred_at: string | null;
  meta: unknown;
  existedBefore: boolean;
};

type SimulationAuditAfter = {
  booking: CanonicalBookingSnapshot;
  rental: RentalSnapshot | null;
  milestones: RentalMilestoneSnapshot[];
  conversion: {
    id: string | null;
    existedBefore: boolean;
    result: unknown;
  };
};

function isValidAction(action: unknown): action is 'simulate' | 'reset' {
  return action === 'simulate' || action === 'reset';
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toSnapshot(row: Record<string, unknown>): CanonicalBookingSnapshot {
  return {
    deposit_due: asNumber(row.deposit_due),
    deposit_paid: asNumber(row.deposit_paid),
    deposit_currency: typeof row.deposit_currency === 'string' ? row.deposit_currency : null,
    status: typeof row.status === 'string' ? row.status : null,
    disney_confirmation_number:
      typeof row.disney_confirmation_number === 'string' ? row.disney_confirmation_number : null,
  };
}

async function requireAdminApiUser() {
  const { user, isAdmin } = await getCurrentUserAdminState();
  if (!user || !isAdmin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true as const, user };
}

export async function POST(request: Request) {
  const guard = await requireAdminApiUser();
  if (!guard.ok) {
    return guard.response;
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: 'Service role key not configured.' }, { status: 500 });
  }

  let payload: { requestId?: string; confirmationPhrase?: string; action?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (payload.requestId !== TEST_BOOKING_REQUEST_ID) {
    return NextResponse.json({ error: 'This tool is restricted to the configured test request.' }, { status: 403 });
  }

  if (payload.confirmationPhrase !== CONFIRMATION_PHRASE) {
    return NextResponse.json({ error: 'Confirmation phrase does not match.' }, { status: 400 });
  }

  if (!isValidAction(payload.action)) {
    return NextResponse.json({ error: 'Invalid test action.' }, { status: 400 });
  }

  if (payload.action === 'reset') {
    return resetSimulation({ adminClient, adminUserId: guard.user.id, adminEmail: guard.user.email ?? null });
  }

  return simulateConversion({ adminClient, adminUserId: guard.user.id, adminEmail: guard.user.email ?? null });
}

async function simulateConversion({
  adminClient,
  adminUserId,
  adminEmail,
}: {
  adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
  adminUserId: string;
  adminEmail: string | null;
}) {
  const { data: booking, error: bookingError } = await adminClient
    .from('booking_requests')
    .select(
      [
        'id',
        'status',
        'affiliate_id',
        'affiliate_click_id',
        'visitor_session_row_id',
        'visitor_session_id',
        'visitor_id',
        'referral_code',
        'guest_total_cents_final',
        'guest_total_cents',
        'est_cash',
        'deposit_due',
        'deposit_paid',
        'deposit_currency',
        'disney_confirmation_number',
        'primary_room',
        'check_in',
        'check_out',
        'total_points',
        'primary_resort:resorts!booking_requests_primary_resort_id_fkey(slug, calculator_code)',
      ].join(', '),
    )
    .eq('id', TEST_BOOKING_REQUEST_ID)
    .maybeSingle();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: bookingError?.message ?? 'Test booking request not found.' },
      { status: bookingError ? 500 : 404 },
    );
  }

  if (!booking.affiliate_id && !booking.referral_code) {
    return NextResponse.json({ error: 'Test booking request is not affiliate-attributed.' }, { status: 400 });
  }

  const { data: existingConversion } = await adminClient
    .from('affiliate_conversions')
    .select('id, status, payout_run_id, payout_id')
    .eq('booking_request_id', TEST_BOOKING_REQUEST_ID)
    .maybeSingle();

  const beforeBooking = toSnapshot(booking as Record<string, unknown>);

  const depositDue = beforeBooking.deposit_due && beforeBooking.deposit_due > 0 ? beforeBooking.deposit_due : 1;
  const nowIso = new Date().toISOString();

  const { error: bookingUpdateError } = await adminClient
    .from('booking_requests')
    .update({
      deposit_due: depositDue,
      deposit_paid: depositDue,
      deposit_currency: beforeBooking.deposit_currency ?? 'USD',
      disney_confirmation_number: beforeBooking.disney_confirmation_number ?? TEST_CONFIRMATION_NUMBER,
      updated_at: nowIso,
    })
    .eq('id', TEST_BOOKING_REQUEST_ID);

  if (bookingUpdateError) {
    return NextResponse.json({ error: bookingUpdateError.message }, { status: 500 });
  }

  const conversionResult = await ensureAffiliateConversionForBooking({
    bookingRequestId: TEST_BOOKING_REQUEST_ID,
    source: 'admin_test_simulation',
    confirmedAt: nowIso,
    client: adminClient,
  });

  const { data: afterBooking } = await adminClient
    .from('booking_requests')
    .select('deposit_due, deposit_paid, deposit_currency, status, disney_confirmation_number')
    .eq('id', TEST_BOOKING_REQUEST_ID)
    .maybeSingle();

  const after: SimulationAuditAfter = {
    booking: toSnapshot((afterBooking ?? {}) as Record<string, unknown>),
    rental: null,
    milestones: [],
    conversion: {
      id: conversionResult.conversionId ?? null,
      existedBefore: Boolean(existingConversion?.id),
      result: conversionResult,
    },
  };

  await logAdminAuditEvent(adminClient, {
    adminUserId,
    adminEmail,
    action: SIMULATION_ACTION,
    entityType: 'booking_request',
    entityId: TEST_BOOKING_REQUEST_ID,
    before: {
      booking: beforeBooking,
      rental: null,
      milestones: [],
      conversion: existingConversion
        ? {
            id: existingConversion.id,
            status: existingConversion.status ?? null,
            payout_run_id: existingConversion.payout_run_id ?? null,
            payout_id: existingConversion.payout_id ?? null,
          }
        : null,
    },
    after,
    meta: {
      warning: 'Test only. No payment will be processed.',
      source: 'admin_test_simulation',
    },
  });

  return NextResponse.json({
    ok: true,
    message: 'Test conversion created or confirmed. No payment was processed.',
    conversion: conversionResult,
  });
}

async function resetSimulation({
  adminClient,
  adminUserId,
  adminEmail,
}: {
  adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
  adminUserId: string;
  adminEmail: string | null;
}) {
  const { data: auditEvent } = await adminClient
    .from('admin_audit_events')
    .select('id, before, after, created_at')
    .eq('action', SIMULATION_ACTION)
    .eq('entity_type', 'booking_request')
    .eq('entity_id', TEST_BOOKING_REQUEST_ID)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!auditEvent?.before || !auditEvent?.after) {
    return NextResponse.json({ error: 'No simulation audit record found for reset.' }, { status: 400 });
  }

  const before = auditEvent.before as {
    booking?: CanonicalBookingSnapshot;
    rental?: RentalSnapshot | null;
    milestones?: RentalMilestoneSnapshot[];
    conversion?: { id: string; status: string | null; payout_run_id?: string | null; payout_id?: string | null } | null;
  };
  const after = auditEvent.after as SimulationAuditAfter;

  const { data: conversion } = await adminClient
    .from('affiliate_conversions')
    .select('id, status, payout_run_id, payout_id')
    .eq('booking_request_id', TEST_BOOKING_REQUEST_ID)
    .maybeSingle();

  if (conversion?.id && !before.conversion?.id) {
    const status = conversion.status ?? null;
    if (status !== 'pending' || conversion.payout_run_id || conversion.payout_id) {
      return NextResponse.json(
        { error: 'Conversion is no longer safe to reset because it was approved, paid, or attached to payout data.' },
        { status: 409 },
      );
    }
    const { error: deleteConversionError } = await adminClient
      .from('affiliate_conversions')
      .delete()
      .eq('id', conversion.id)
      .eq('status', 'pending')
      .is('payout_run_id', null);
    if (deleteConversionError) {
      return NextResponse.json({ error: deleteConversionError.message }, { status: 500 });
    }
  }

  if (before.booking) {
    const { error: restoreBookingError } = await adminClient
      .from('booking_requests')
      .update({
        deposit_due: before.booking.deposit_due,
        deposit_paid: before.booking.deposit_paid,
        deposit_currency: before.booking.deposit_currency,
        disney_confirmation_number: before.booking.disney_confirmation_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', TEST_BOOKING_REQUEST_ID);
    if (restoreBookingError) {
      return NextResponse.json({ error: restoreBookingError.message }, { status: 500 });
    }
  }

  if (after.rental?.id) {
    if (before.rental?.existedBefore) {
      for (const milestone of before.milestones ?? []) {
        if (!TEST_MILESTONE_CODES.includes(milestone.code as (typeof TEST_MILESTONE_CODES)[number])) {
          continue;
        }

        if (milestone.existedBefore && milestone.id) {
          const { error: restoreMilestoneError } = await adminClient
            .from('rental_milestones')
            .update({
              status: milestone.status,
              occurred_at: milestone.occurred_at,
              meta: milestone.meta,
            })
            .eq('id', milestone.id);
          if (restoreMilestoneError) {
            return NextResponse.json({ error: restoreMilestoneError.message }, { status: 500 });
          }
        } else {
          const { error: deleteMilestoneError } = await adminClient
            .from('rental_milestones')
            .delete()
            .eq('rental_id', after.rental.id)
            .eq('code', milestone.code);
          if (deleteMilestoneError) {
            return NextResponse.json({ error: deleteMilestoneError.message }, { status: 500 });
          }
        }
      }

      const { error: restoreRentalError } = await adminClient
        .from('rentals')
        .update({
          status: before.rental.status,
          dvc_confirmation_number: before.rental.dvc_confirmation_number,
          updated_at: new Date().toISOString(),
        })
        .eq('id', after.rental.id);
      if (restoreRentalError) {
        return NextResponse.json({ error: restoreRentalError.message }, { status: 500 });
      }
    } else {
      const { error: deleteRentalError } = await adminClient.from('rentals').delete().eq('id', after.rental.id);
      if (deleteRentalError) {
        return NextResponse.json({ error: deleteRentalError.message }, { status: 500 });
      }
    }
  }

  await logAdminAuditEvent(adminClient, {
    adminUserId,
    adminEmail,
    action: RESET_ACTION,
    entityType: 'booking_request',
    entityId: TEST_BOOKING_REQUEST_ID,
    before: after,
    after: before,
    meta: {
      warning: 'Test reset only. No payment or payout data was modified.',
      source: 'admin_test_simulation',
      simulation_audit_event_id: auditEvent.id,
    },
  });

  return NextResponse.json({
    ok: true,
    message: 'Affiliate test simulation reset. No approved, paid, or payout data was modified.',
  });
}
