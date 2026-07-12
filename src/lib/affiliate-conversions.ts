import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { calculateCommission } from '@/lib/affiliate-commissions';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type AffiliateConversionSource =
  | 'owner_match_confirmation'
  | 'owner_rental_confirmation'
  | 'ready_stay_transfer'
  | 'stripe_deposit'
  | 'stripe_full_payment'
  | 'deposit_success'
  | 'deposit_confirm'
  | 'admin_manual_status'
  | string;

type EnsureAffiliateConversionInput = {
  bookingRequestId: string;
  source: AffiliateConversionSource;
  rentalId?: string | null;
  confirmedAt?: string | null;
  client?: SupabaseClient;
};

type EnsureAffiliateConversionResult =
  | {
      created: true;
      eligible: true;
      conversionId: string;
      reason: 'created';
    }
  | {
      created: false;
      eligible: true;
      conversionId: string;
      reason: 'existing' | 'updated_existing';
    }
  | {
      created: false;
      eligible: false;
      reason: string;
    };

type BookingRow = {
  id: string;
  affiliate_id?: string | null;
  affiliate_click_id?: string | null;
  visitor_session_row_id?: string | null;
  visitor_session_id?: string | null;
  visitor_id?: string | null;
  referral_code?: string | null;
  guest_total_cents_final?: number | null;
  guest_total_cents?: number | null;
  est_cash?: number | null;
  deposit_due?: number | null;
  deposit_paid?: number | null;
  status?: string | null;
  payment_status?: string | null;
  owner_transfer_confirmed_at?: string | null;
  disney_confirmation_number?: string | null;
};

type AffiliateRow = {
  id: string;
  status: string | null;
  commission_rate: number | null;
};

type ExistingConversionRow = {
  id: string;
  affiliate_id: string | null;
  lead_id: string | null;
  booking_request_id: string | null;
  status: string | null;
  booking_amount_usd: number | null;
  commission_rate: number | null;
  commission_amount_usd: number | null;
  confirmed_at: string | null;
  conversion_source?: string | null;
  rental_id?: string | null;
  confirmed_event?: string | null;
  eligibility_confirmed_at?: string | null;
  booking_amount_source?: string | null;
};

const BLOCKED_AFFILIATE_STATUSES = new Set([
  'suspended',
  'rejected',
  'declined',
  'denied',
  'inactive',
  'paused',
  'closed',
]);

const ELIGIBLE_AFFILIATE_STATUSES = new Set(['active', 'verified']);

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeStatus(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function selectBookingAmount(booking: BookingRow) {
  const finalCents = asNumber(booking.guest_total_cents_final);
  if (finalCents && finalCents > 0) {
    return { amount: Math.round(finalCents) / 100, source: 'guest_total_cents_final' };
  }

  const guestCents = asNumber(booking.guest_total_cents);
  if (guestCents && guestCents > 0) {
    return { amount: Math.round(guestCents) / 100, source: 'guest_total_cents' };
  }

  const estCash = asNumber(booking.est_cash);
  if (estCash && estCash > 0) {
    return { amount: estCash, source: 'est_cash' };
  }

  return { amount: null, source: null };
}

function hasCanonicalAttribution(booking: BookingRow, leadAffiliateId: string | null) {
  return Boolean(
    booking.affiliate_id ||
      leadAffiliateId ||
      booking.affiliate_click_id ||
      booking.referral_code ||
      booking.visitor_session_row_id ||
      booking.visitor_session_id ||
      booking.visitor_id,
  );
}

function logConversionDecision(payload: {
  bookingRequestId: string;
  affiliateId?: string | null;
  source: string;
  eligible: boolean;
  reason: string;
  conversionId?: string | null;
}) {
  console.info('[affiliate-conversion]', {
    booking_request_id: payload.bookingRequestId,
    affiliate_id: payload.affiliateId ?? null,
    source: payload.source,
    eligible: payload.eligible,
    reason: payload.reason,
    conversion_id: payload.conversionId ?? null,
  });
}

async function getRentalForBooking({
  client,
  rentalId,
  bookingRequestId,
}: {
  client: SupabaseClient;
  rentalId?: string | null;
  bookingRequestId: string;
}) {
  const select = 'id, dvc_confirmation_number, status, match_id';

  if (rentalId) {
    const { data } = await client.from('rentals').select(select).eq('id', rentalId).maybeSingle();
    if (data) return data as Record<string, unknown>;
  }

  const { data: matches } = await client
    .from('booking_matches')
    .select('id')
    .eq('booking_id', bookingRequestId)
    .order('created_at', { ascending: false })
    .limit(5);

  const matchIds = (matches ?? [])
    .map((match) => (typeof match.id === 'string' ? match.id : null))
    .filter((id): id is string => Boolean(id));

  if (matchIds.length === 0) {
    return null;
  }

  const byMatch = await client
    .from('rentals')
    .select(select)
    .in('match_id', matchIds)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (byMatch.data as Record<string, unknown> | null) ?? null;
}

async function standardConfirmationIsComplete({
  client,
  booking,
  rentalId,
}: {
  client: SupabaseClient;
  booking: BookingRow;
  rentalId?: string | null;
}) {
  if (hasText(booking.disney_confirmation_number)) {
    return { complete: true, rentalId: rentalId ?? null, event: 'confirmation_number_saved' };
  }

  const rental = await getRentalForBooking({ client, rentalId, bookingRequestId: booking.id });
  const resolvedRentalId = hasText(rental?.id) ? rental.id : rentalId ?? null;

  if (hasText(rental?.dvc_confirmation_number)) {
    return { complete: true, rentalId: resolvedRentalId, event: 'confirmation_number_saved' };
  }

  if (!resolvedRentalId) {
    return { complete: false, rentalId: null, event: null };
  }

  const { data: milestones } = await client
    .from('rental_milestones')
    .select('code, status, occurred_at')
    .eq('rental_id', resolvedRentalId)
    .in('code', ['owner_booked', 'disney_confirmation_uploaded']);

  const completed = (milestones ?? []).some((milestone) => {
    const code = typeof milestone.code === 'string' ? milestone.code : '';
    const status = typeof milestone.status === 'string' ? milestone.status : '';
    return ['owner_booked', 'disney_confirmation_uploaded'].includes(code) && status === 'completed';
  });

  return {
    complete: completed,
    rentalId: resolvedRentalId,
    event: completed ? 'rental_milestone_completed' : null,
  };
}

function isReadyStaySource(source: string, booking: BookingRow) {
  return (
    source === 'ready_stay_transfer' ||
    source === 'stripe_full_payment' ||
    booking.status === 'paid_waiting_owner_transfer' ||
    booking.status === 'transferred'
  );
}

async function findLegacyLead(client: SupabaseClient, bookingRequestId: string) {
  const { data } = await client
    .from('affiliate_leads')
    .select('id, affiliate_id')
    .eq('booking_request_id', bookingRequestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    leadId: (data?.id as string | null | undefined) ?? null,
    affiliateId: (data?.affiliate_id as string | null | undefined) ?? null,
  };
}

async function getExistingConversion(client: SupabaseClient, bookingRequestId: string) {
  const { data } = await client
    .from('affiliate_conversions')
    .select(
      'id, affiliate_id, lead_id, booking_request_id, status, booking_amount_usd, commission_rate, commission_amount_usd, confirmed_at, conversion_source, rental_id, confirmed_event, eligibility_confirmed_at, booking_amount_source',
    )
    .eq('booking_request_id', bookingRequestId)
    .maybeSingle();

  return (data as ExistingConversionRow | null) ?? null;
}

async function updateExistingConversion({
  client,
  existing,
  source,
  rentalId,
  confirmedEvent,
  confirmedAt,
  bookingAmount,
  bookingAmountSource,
  commissionRate,
  commissionAmount,
  leadId,
}: {
  client: SupabaseClient;
  existing: ExistingConversionRow;
  source: string;
  rentalId: string | null;
  confirmedEvent: string;
  confirmedAt: string;
  bookingAmount: number;
  bookingAmountSource: string;
  commissionRate: number;
  commissionAmount: number;
  leadId: string | null;
}) {
  const update: Record<string, unknown> = {};

  if (!existing.lead_id && leadId) update.lead_id = leadId;
  if (existing.booking_amount_usd == null) update.booking_amount_usd = bookingAmount;
  if (existing.commission_rate == null) update.commission_rate = commissionRate;
  if (existing.commission_amount_usd == null) update.commission_amount_usd = commissionAmount;
  if (!existing.confirmed_at) update.confirmed_at = confirmedAt;
  if (!existing.conversion_source) update.conversion_source = source;
  if (!existing.rental_id && rentalId) update.rental_id = rentalId;
  if (!existing.confirmed_event) update.confirmed_event = confirmedEvent;
  if (!existing.eligibility_confirmed_at) update.eligibility_confirmed_at = confirmedAt;
  if (!existing.booking_amount_source) update.booking_amount_source = bookingAmountSource;

  if (Object.keys(update).length === 0) {
    return { updated: false, id: existing.id };
  }

  const { error } = await client.from('affiliate_conversions').update(update).eq('id', existing.id);
  if (error) {
    console.error('[affiliate-conversion] existing update failed', {
      booking_request_id: existing.booking_request_id,
      conversion_id: existing.id,
      code: error.code,
      message: error.message,
    });
  }

  return { updated: !error, id: existing.id };
}

export async function ensureAffiliateConversionForBooking({
  bookingRequestId,
  source,
  rentalId = null,
  confirmedAt = null,
  client,
}: EnsureAffiliateConversionInput): Promise<EnsureAffiliateConversionResult> {
  const supabase = client ?? getSupabaseAdminClient();
  if (!supabase) {
    return { created: false, eligible: false, reason: 'admin_client_unavailable' };
  }

  const nowIso = confirmedAt ?? new Date().toISOString();

  const { data: bookingData, error: bookingError } = await supabase
    .from('booking_requests')
    .select(
      [
        'id',
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
        'status',
        'payment_status',
        'owner_transfer_confirmed_at',
        'disney_confirmation_number',
      ].join(', '),
    )
    .eq('id', bookingRequestId)
    .maybeSingle();

  if (bookingError || !bookingData) {
    logConversionDecision({
      bookingRequestId,
      source,
      eligible: false,
      reason: bookingError ? 'booking_lookup_failed' : 'booking_not_found',
    });
    return { created: false, eligible: false, reason: bookingError ? 'booking_lookup_failed' : 'booking_not_found' };
  }

  const booking = bookingData as unknown as BookingRow;
  const legacyLead = await findLegacyLead(supabase, bookingRequestId);
  const affiliateId = booking.affiliate_id ?? legacyLead.affiliateId ?? null;

  if (!hasCanonicalAttribution(booking, legacyLead.affiliateId)) {
    logConversionDecision({ bookingRequestId, source, eligible: false, reason: 'not_attributed' });
    return { created: false, eligible: false, reason: 'not_attributed' };
  }

  if (!affiliateId) {
    logConversionDecision({ bookingRequestId, source, eligible: false, reason: 'affiliate_missing' });
    return { created: false, eligible: false, reason: 'affiliate_missing' };
  }

  const { data: affiliateData, error: affiliateError } = await supabase
    .from('affiliates')
    .select('id, status, commission_rate')
    .eq('id', affiliateId)
    .maybeSingle();

  if (affiliateError || !affiliateData) {
    logConversionDecision({
      bookingRequestId,
      affiliateId,
      source,
      eligible: false,
      reason: affiliateError ? 'affiliate_lookup_failed' : 'affiliate_not_found',
    });
    return { created: false, eligible: false, reason: affiliateError ? 'affiliate_lookup_failed' : 'affiliate_not_found' };
  }

  const affiliate = affiliateData as AffiliateRow;
  const affiliateStatus = normalizeStatus(affiliate.status);
  if (BLOCKED_AFFILIATE_STATUSES.has(affiliateStatus) || !ELIGIBLE_AFFILIATE_STATUSES.has(affiliateStatus)) {
    logConversionDecision({ bookingRequestId, affiliateId, source, eligible: false, reason: 'affiliate_ineligible' });
    return { created: false, eligible: false, reason: 'affiliate_ineligible' };
  }

  let resolvedRentalId = rentalId ?? null;
  let confirmedEvent = source;

  if (isReadyStaySource(source, booking)) {
    if (booking.payment_status !== 'paid') {
      logConversionDecision({ bookingRequestId, affiliateId, source, eligible: false, reason: 'ready_stay_not_paid' });
      return { created: false, eligible: false, reason: 'ready_stay_not_paid' };
    }
    if (booking.status !== 'transferred') {
      logConversionDecision({
        bookingRequestId,
        affiliateId,
        source,
        eligible: false,
        reason: 'ready_stay_not_transferred',
      });
      return { created: false, eligible: false, reason: 'ready_stay_not_transferred' };
    }
    if (!booking.owner_transfer_confirmed_at) {
      logConversionDecision({
        bookingRequestId,
        affiliateId,
        source,
        eligible: false,
        reason: 'ready_stay_transfer_not_confirmed',
      });
      return { created: false, eligible: false, reason: 'ready_stay_transfer_not_confirmed' };
    }
    confirmedEvent = 'ready_stay_owner_transfer_confirmed';
  } else {
    const confirmation = await standardConfirmationIsComplete({
      client: supabase,
      booking,
      rentalId,
    });
    resolvedRentalId = confirmation.rentalId;
    if (!confirmation.complete || !confirmation.event) {
      logConversionDecision({ bookingRequestId, affiliateId, source, eligible: false, reason: 'confirmation_incomplete' });
      return { created: false, eligible: false, reason: 'confirmation_incomplete' };
    }
    confirmedEvent = confirmation.event;

    const depositDue = asNumber(booking.deposit_due) ?? 0;
    const depositPaid = asNumber(booking.deposit_paid) ?? 0;
    if (depositDue > 0 && depositPaid < depositDue) {
      logConversionDecision({ bookingRequestId, affiliateId, source, eligible: false, reason: 'deposit_not_paid' });
      return { created: false, eligible: false, reason: 'deposit_not_paid' };
    }
  }

  const { amount: bookingAmount, source: bookingAmountSource } = selectBookingAmount(booking);
  if (!bookingAmount || !bookingAmountSource) {
    logConversionDecision({ bookingRequestId, affiliateId, source, eligible: false, reason: 'booking_amount_missing' });
    return { created: false, eligible: false, reason: 'booking_amount_missing' };
  }

  const commissionRate = asNumber(affiliate.commission_rate) ?? 0;
  const commissionAmount = calculateCommission(bookingAmount, commissionRate);
  const existing = await getExistingConversion(supabase, bookingRequestId);

  if (existing) {
    const updated = await updateExistingConversion({
      client: supabase,
      existing,
      source,
      rentalId: resolvedRentalId,
      confirmedEvent,
      confirmedAt: nowIso,
      bookingAmount,
      bookingAmountSource,
      commissionRate,
      commissionAmount,
      leadId: legacyLead.leadId,
    });
    logConversionDecision({
      bookingRequestId,
      affiliateId,
      source,
      eligible: true,
      reason: updated.updated ? 'updated_existing' : 'existing',
      conversionId: existing.id,
    });
    return {
      created: false,
      eligible: true,
      conversionId: existing.id,
      reason: updated.updated ? 'updated_existing' : 'existing',
    };
  }

  const insertPayload = {
    affiliate_id: affiliateId,
    lead_id: legacyLead.leadId,
    booking_request_id: bookingRequestId,
    status: 'pending',
    booking_amount_usd: bookingAmount,
    commission_rate: commissionRate,
    commission_amount_usd: commissionAmount,
    confirmed_at: nowIso,
    conversion_source: source,
    rental_id: resolvedRentalId,
    confirmed_event: confirmedEvent,
    eligibility_confirmed_at: nowIso,
    booking_amount_source: bookingAmountSource,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('affiliate_conversions')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      const racedExisting = await getExistingConversion(supabase, bookingRequestId);
      if (racedExisting) {
        logConversionDecision({
          bookingRequestId,
          affiliateId,
          source,
          eligible: true,
          reason: 'existing',
          conversionId: racedExisting.id,
        });
        return { created: false, eligible: true, conversionId: racedExisting.id, reason: 'existing' };
      }
    }

    console.error('[affiliate-conversion] insert failed', {
      booking_request_id: bookingRequestId,
      affiliate_id: affiliateId,
      source,
      code: insertError.code,
      message: insertError.message,
    });
    return { created: false, eligible: false, reason: 'conversion_insert_failed' };
  }

  const conversionId = (inserted?.id as string | null | undefined) ?? '';
  logConversionDecision({
    bookingRequestId,
    affiliateId,
    source,
    eligible: true,
    reason: 'created',
    conversionId,
  });

  return { created: true, eligible: true, conversionId, reason: 'created' };
}
