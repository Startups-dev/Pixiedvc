'use server';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { sendPlainEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import { generateAcceptToken } from '@/lib/tokens';
import { renderPixieAgreementHTML } from '@/lib/agreements/renderPixieAgreement';
import type { ContractSnapshot } from '@/lib/contracts/contractSnapshot';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type PlaceholderData = Record<string, string | number | null | undefined>;

function createAcceptToken() {
  return randomBytes(24).toString('hex');
}

export async function generateContract(form: {
  ownerId: string;
  bookingRequestId?: string | null;
  templateName: string;
  placeholderData: PlaceholderData;
}) {
  const supabase = await createSupabaseServerClient();
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[contracts] client check', {
      hasFrom: typeof (supabase as { from?: unknown })?.from === 'function',
    });
  }

  const bookingRequestId = form.bookingRequestId ?? null;
  let renterId: string | null = null;
  if (bookingRequestId) {
    const { data: booking, error: bookingErr } = await supabase
      .from('booking_requests')
      .select('id, renter_id')
      .eq('id', bookingRequestId)
      .maybeSingle();
    if (bookingErr) throw bookingErr;
    if (!booking?.renter_id) {
      throw new Error(`contract_renter_id_missing booking_request_id=${bookingRequestId}`);
    }
    renterId = booking.renter_id;
  }

  const snapshot = await buildSnapshot({
    supabase,
    ownerId: form.ownerId,
    bookingRequestId,
    placeholderData: form.placeholderData,
  });

  const { data: existing, error: existingErr } = bookingRequestId
    ? await supabase
        .from('contracts')
        .select('id, guest_accept_token, owner_accept_token')
        .eq('booking_request_id', bookingRequestId)
        .maybeSingle()
    : { data: null, error: null };
  if (existingErr) throw existingErr;

  const guestAcceptToken = existing?.guest_accept_token || createAcceptToken();
  const ownerAcceptToken = existing?.owner_accept_token || createAcceptToken();

  let data = null as null | {
    id: number;
    booking_request_id: string | null;
    renter_id: string | null;
    owner_id: string | null;
    status: string | null;
    snapshot: ContractSnapshot | null;
    guest_accept_token: string | null;
    owner_accept_token: string | null;
  };
  if (existing?.id) {
    const { data: updated, error: updateErr } = await supabase
      .from('contracts')
      .update({
        renter_id: renterId,
        owner_id: form.ownerId,
        status: 'draft',
        snapshot,
        guest_accept_token: guestAcceptToken,
        owner_accept_token: ownerAcceptToken,
      })
      .eq('id', existing.id)
      .select('id, booking_request_id, renter_id, owner_id, status, snapshot, guest_accept_token, owner_accept_token')
      .single();
    if (updateErr) throw updateErr;
    data = updated;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from('contracts')
      .insert({
        booking_request_id: bookingRequestId,
        renter_id: renterId,
        owner_id: form.ownerId,
        status: 'draft',
        snapshot,
        guest_accept_token: guestAcceptToken,
        owner_accept_token: ownerAcceptToken,
      })
      .select('id, booking_request_id, renter_id, owner_id, status, snapshot, guest_accept_token, owner_accept_token')
      .single();
    if (insertErr) throw insertErr;
    data = inserted;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[contracts] create/update', {
      bookingRequestId,
      ownerId: form.ownerId,
      renterId,
      status: 'draft',
    });
  }

  await logContractEvent({
    contractId: data.id,
    eventType: 'created',
  });

  return data;
}

export async function ensureGuestAgreementForBooking(params: {
  supabase: SupabaseClient;
  ownerId: string;
  bookingRequestId: string;
  rentalId: string;
  confirmationNumber?: string | null;
}) {
  const supabase = params.supabase;
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[contracts] client check', {
      hasFrom: typeof (supabase as { from?: unknown })?.from === 'function',
    });
  }
  const { data: booking, error: bookingErr } = await supabase
    .from('booking_requests')
    .select('id, renter_id')
    .eq('id', params.bookingRequestId)
    .maybeSingle();
  if (bookingErr) throw bookingErr;
  if (!booking?.renter_id) {
    throw new Error(`contract_renter_id_missing booking_request_id=${params.bookingRequestId}`);
  }
  const renterId = booking.renter_id;

  const placeholderData: PlaceholderData = {
    CONFIRMATION_NUMBER: params.confirmationNumber ?? null,
    RENTAL_ID: params.rentalId,
  };

  const { data: ownerProfileRow } = await supabase
    .from('owners')
    .select('user_id')
    .eq('id', params.ownerId)
    .maybeSingle();
  const ownerProfileId = ownerProfileRow?.user_id ?? null;

  const snapshot = await buildSnapshot({
    supabase,
    ownerId: params.ownerId,
    bookingRequestId: params.bookingRequestId,
    placeholderData,
  });

  const { data: existing } = await supabase
    .from('contracts')
    .select('id, status, guest_accept_token, owner_accept_token')
    .eq('booking_request_id', params.bookingRequestId)
    .maybeSingle();

  let contractId: number | null = existing?.id ?? null;

  if (contractId && existing?.status === 'accepted') {
    return { contractId, status: existing.status };
  }

  const guestAcceptToken = existing?.guest_accept_token || createAcceptToken();
  const ownerAcceptToken = existing?.owner_accept_token || createAcceptToken();

  if (contractId) {
    const { error } = await supabase
      .from('contracts')
      .update({
        owner_id: ownerProfileId,
        renter_id: renterId,
        snapshot,
        status: 'draft',
        guest_accept_token: guestAcceptToken,
        owner_accept_token: ownerAcceptToken,
      })
      .eq('id', contractId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        owner_id: ownerProfileId,
        booking_request_id: params.bookingRequestId,
        renter_id: renterId,
        status: 'draft',
        snapshot,
        guest_accept_token: guestAcceptToken,
        owner_accept_token: ownerAcceptToken,
      })
      .select('id, guest_accept_token, owner_accept_token')
      .single();
    if (error || !data) throw error ?? new Error('Failed to create contract');
    contractId = data.id;
  }

  return {
    contractId,
    status: 'sent',
    guestAcceptToken,
    ownerAcceptToken,
  };
}

export async function logContractEvent({
  contractId,
  eventType,
  metadata = {},
}: {
  contractId: number;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  const adminClient = getSupabaseAdminClient();
  const supabase = adminClient ?? (await createSupabaseServerClient());

  const { error } = await supabase.from('contract_events').insert({
    contract_id: contractId,
    event_type: eventType,
    metadata,
  });

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[contracts] failed to log contract event', {
        contractId,
        eventType,
        error: error.message,
      });
    }
    // Do not block core flows on audit logging failures.
    return;
  }
}

export async function updateContractStatus(contractId: number, status: 'sent' | 'accepted' | 'rejected') {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('contracts').update({ status }).eq('id', contractId);

  if (error) throw error;

  await logContractEvent({
    contractId,
    eventType: status,
  });
}

export async function sendContractEmail(params: { contractId: number; sendToOwner?: boolean; sendToGuest?: boolean }) {
  const supabase = await createSupabaseServerClient();

  const { data: initialContract, error } = await supabase
    .from('contracts')
    .select('id, owner_id, booking_request_id, status, owner_accept_token, guest_accept_token, snapshot')
    .eq('id', params.contractId)
    .maybeSingle();

  if (error || !initialContract) {
    throw new Error('Contract not found');
  }

  let contract = initialContract;

  const ownerQuery = await supabase
    .from('profiles')
    .select('email, display_name')
    .eq('id', contract.owner_id)
    .maybeSingle();

  const ownerProfile = ownerQuery.data;
  const ownerEmail = ownerProfile?.email ?? null;
  const snapshot = (contract.snapshot ?? {}) as ContractSnapshot;

  const bookingData = contract.booking_request_id
    ? await supabase
        .from('booking_requests')
        .select('lead_guest_email, lead_guest_name, check_in, check_out, primary_resort:resorts(name)')
        .eq('id', contract.booking_request_id)
        .maybeSingle()
    : { data: null };

  const booking = bookingData.data;
  const guestEmailCandidate = snapshot.renterEmail ?? booking?.lead_guest_email ?? null;

  const tokenUpdates: Record<string, string> = {};
  if (params.sendToOwner && !contract.owner_accept_token) {
    tokenUpdates.owner_accept_token = generateAcceptToken();
  }
  if (params.sendToGuest && guestEmailCandidate && !contract.guest_accept_token) {
    tokenUpdates.guest_accept_token = generateAcceptToken();
  }

  if (Object.keys(tokenUpdates).length) {
    const { data: updated, error: tokenError } = await supabase
      .from('contracts')
      .update(tokenUpdates)
      .eq('id', contract.id)
      .select('id, owner_id, booking_request_id, status, owner_accept_token, guest_accept_token, guest_accepted_at, snapshot')
      .maybeSingle();
    if (tokenError || !updated) {
      throw new Error('Failed to assign acceptance tokens');
    }
    contract = updated;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const ownerUrl = contract.owner_accept_token ? `${baseUrl}/contracts/${contract.owner_accept_token}` : null;
  const guestUrl = contract.guest_accept_token ? `${baseUrl}/contracts/${contract.guest_accept_token}` : null;
  const summary = buildEmailSummary(snapshot);
  const contractHtml = renderPixieAgreementHTML(snapshot, {
    guestAcceptedAt: contract.guest_accepted_at ?? null,
    acceptanceId: contract.id ?? null,
  });

  const emailsToSend: { to: string; subject: string; body: string; context: string }[] = [];
  const skipped: { owner?: string; guest?: string } = {};
  let sentToOwner = false;
  let sentToGuest = false;

  if (params.sendToOwner) {
    if (!ownerEmail) {
      throw new Error('Owner email unavailable');
    }
    const subject = 'PixieDVC – DVC Owner Agreement';
    const body = [
      `Hi ${ownerProfile?.display_name ?? 'PixieDVC owner'},`,
      '',
      'Here is your owner agreement for this request. Please review the summary below and accept online.',
      summary,
      '',
      contractHtml,
      '',
      ownerUrl
        ? [`To review and accept online, click: ${ownerUrl}`, 'If the link does not work, copy and paste it into your browser.'].join('\n')
        : 'To accept, contact hello@pixiedvc.com.',
      '',
      'Need help? Email hello@pixiedvc.com.',
    ]
      .filter(Boolean)
      .join('\n');
    emailsToSend.push({ to: ownerEmail, subject, body, context: 'contract owner email' });
    sentToOwner = true;
  }

  if (params.sendToGuest) {
    if (!guestEmailCandidate) {
      skipped.guest = 'guest_email_unavailable';
    } else {
    const subject = 'PixieDVC – Please review and accept your rental agreement';
    const body = [
      `Hi ${snapshot.renterName || booking?.lead_guest_name || 'PixieDVC guest'},`,
      '',
      'Your Disney confirmation is secured. Please review the agreement below and accept online to finalize your stay.',
      summary,
      '',
      contractHtml,
      '',
      guestUrl
        ? [`To review and accept online, click: ${guestUrl}`, 'If the link does not work, copy and paste it into your browser.'].join('\n')
        : 'To accept, contact hello@pixiedvc.com.',
      '',
      'Need assistance? Email hello@pixiedvc.com.',
    ]
      .filter(Boolean)
      .join('\n');
    emailsToSend.push({ to: guestEmailCandidate, subject, body, context: 'contract guest email' });
    sentToGuest = true;
    }
  }

  for (const message of emailsToSend) {
    await sendPlainEmail(message);
  }

  const updates: Record<string, unknown> = {};
  if (emailsToSend.length > 0) {
    if (contract.status === 'draft') {
      updates.status = 'sent';
    }
    updates.sent_at = new Date().toISOString();
    if (params.sendToOwner) {
      updates.last_sent_to_owner = ownerEmail;
    }
    if (params.sendToGuest) {
      updates.last_sent_to_guest = guestEmailCandidate;
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('contracts')
      .update(updates)
      .eq('id', contract.id);
  }

  await logContractEvent({
    contractId: contract.id,
    eventType: 'sent',
    metadata: {
      sendToOwner: !!params.sendToOwner,
      sendToGuest: !!params.sendToGuest,
      ownerEmail: params.sendToOwner ? ownerEmail : undefined,
      guestEmail: params.sendToGuest ? guestEmailCandidate : undefined,
      skippedGuest: skipped.guest ?? null,
    },
  });

  return { contract, sentToOwner, sentToGuest, skipped };
}

async function buildSnapshot({
  supabase,
  ownerId,
  bookingRequestId,
  placeholderData,
}: {
  supabase: SupabaseClient;
  ownerId: string;
  bookingRequestId: string | null;
  placeholderData: PlaceholderData;
}): Promise<ContractSnapshot> {
  const rentalId =
    typeof placeholderData.RENTAL_ID === 'string'
      ? placeholderData.RENTAL_ID
      : typeof placeholderData.RENTAL_ID === 'number'
        ? String(placeholderData.RENTAL_ID)
        : null;

  const [ownerResponse, bookingResponse, guestResponse, rentalResponse, membershipResponse] = await Promise.all([
    supabase
      .from('owners')
      .select('home_resort, use_year, profiles:profiles!owners_user_id_fkey(display_name, email)')
      .eq('id', ownerId)
      .maybeSingle(),
    bookingRequestId
      ? supabase
          .from('booking_requests')
          .select(
            'lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, address_line2, city, state, postal_code, country, check_in, check_out, total_points, max_price_per_point, guest_total_cents, guest_rate_per_point_cents, deposit_paid, deposit_due, primary_room, primary_view, primary_resort:resorts(name, calculator_code, slug)',
          )
          .eq('id', bookingRequestId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    bookingRequestId
      ? supabase
          .from('booking_request_guests')
          .select('first_name, last_name, age_category, age')
          .eq('booking_id', bookingRequestId)
      : Promise.resolve({ data: [] }),
    rentalId
      ? supabase
          .from('rentals')
          .select('id, resort_code, room_type, check_in, check_out, points_required, rental_amount_cents, booking_package')
          .eq('id', rentalId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('owner_memberships')
      .select('owner_legal_full_name, co_owner_legal_full_name')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const owner = ownerResponse.data;
  const membership = membershipResponse?.data ?? null;
  const booking = bookingResponse?.data;
  const guestRows = (guestResponse?.data ?? []) as Array<{
    first_name: string | null;
    last_name: string | null;
    age_category: string | null;
    age: number | null;
  }>;

  const toNumber = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const rentalRow = rentalResponse?.data as
    | {
        resort_code: string | null;
        room_type: string | null;
        check_in: string | null;
        check_out: string | null;
        points_required: number | null;
        rental_amount_cents: number | null;
        booking_package: unknown;
      }
    | null;

  const bookingPackage = (rentalRow?.booking_package ?? null) as Record<string, unknown> | null;
  const packageRoom = typeof bookingPackage?.room_type === 'string' ? bookingPackage.room_type : null;
  const packageResortName = typeof bookingPackage?.resort_name === 'string' ? bookingPackage.resort_name : null;
  const packageResortCode =
    typeof bookingPackage?.resort_code === 'string'
      ? bookingPackage.resort_code
      : typeof bookingPackage?.resortCode === 'string'
        ? bookingPackage.resortCode
        : null;
  const packageCheckIn =
    typeof bookingPackage?.check_in === 'string'
      ? bookingPackage.check_in
      : typeof bookingPackage?.checkIn === 'string'
        ? bookingPackage.checkIn
        : null;
  const packageCheckOut =
    typeof bookingPackage?.check_out === 'string'
      ? bookingPackage.check_out
      : typeof bookingPackage?.checkOut === 'string'
        ? bookingPackage.checkOut
        : null;
  const packagePoints =
    typeof bookingPackage?.points_required === 'number'
      ? bookingPackage.points_required
      : typeof bookingPackage?.points === 'number'
        ? bookingPackage.points
        : null;
  const packageGuestName =
    typeof bookingPackage?.guest_name === 'string'
      ? bookingPackage.guest_name
      : typeof bookingPackage?.lead_guest_name === 'string'
        ? bookingPackage.lead_guest_name
        : typeof (bookingPackage?.guest as { name?: unknown } | undefined)?.name === 'string'
          ? (bookingPackage?.guest as { name?: string }).name ?? null
          : null;

  const accommodationType =
    [booking?.primary_room, booking?.primary_view].filter(Boolean).join(' · ') ||
    packageRoom ||
    rentalRow?.room_type ||
    '—';

  const confirmationNumber =
    (typeof placeholderData.CONFIRMATION_NUMBER === 'string' && placeholderData.CONFIRMATION_NUMBER) ||
    (typeof placeholderData.DVC_CONFIRMATION_NUMBER === 'string' && placeholderData.DVC_CONFIRMATION_NUMBER) ||
    null;

  const pointsRented =
    toNumber(booking?.total_points) ??
    toNumber(rentalRow?.points_required) ??
    toNumber(packagePoints) ??
    0;

  const packageGuestTotalCents =
    typeof bookingPackage?.guest_total_cents === 'number'
      ? bookingPackage.guest_total_cents
      : typeof bookingPackage?.guest_total_cents === 'string'
        ? toNumber(bookingPackage.guest_total_cents)
        : null;
  const packageGuestRateCents =
    typeof bookingPackage?.guest_rate_per_point_cents === 'number'
      ? bookingPackage.guest_rate_per_point_cents
      : typeof bookingPackage?.guest_rate_per_point_cents === 'string'
        ? toNumber(bookingPackage.guest_rate_per_point_cents)
        : null;

  const maxPricePerPointCents =
    toNumber(booking?.max_price_per_point) !== null
      ? Math.round((toNumber(booking?.max_price_per_point) as number) * 100)
      : null;

  const guestPricePerPointCents =
    toNumber(booking?.guest_rate_per_point_cents) ??
    packageGuestRateCents ??
    (maxPricePerPointCents ?? null) ??
    (pointsRented && toNumber(booking?.guest_total_cents)
      ? Math.round((toNumber(booking?.guest_total_cents) as number) / pointsRented)
      : null) ??
    0;

  const guestTotalCents =
    toNumber(booking?.guest_total_cents) ??
    packageGuestTotalCents ??
    (guestPricePerPointCents && pointsRented ? guestPricePerPointCents * pointsRented : null) ??
    0;

  const daysUntilCheckIn =
    booking?.check_in ? Math.ceil((new Date(booking.check_in).getTime() - Date.now()) / 86400000) : null;
  const paidNowPercent = daysUntilCheckIn !== null && daysUntilCheckIn < 90 ? 100 : 70;
  const paidNowRule = daysUntilCheckIn !== null && daysUntilCheckIn < 90 ? 'WITHIN_3_MONTHS_100' : 'WITHIN_3_MONTHS_100_ELSE_70';
  const paidNowCents = Math.round((guestTotalCents * paidNowPercent) / 100);
  const balanceOwingCents = Math.max(guestTotalCents - paidNowCents, 0);

  const adultGuests = guestRows
    .filter((guest) => guest.age_category === 'adult')
    .map((guest) => [guest.first_name, guest.last_name].filter(Boolean).join(' ').trim())
    .filter(Boolean);

  const youthGuests = guestRows
    .filter((guest) => guest.age_category === 'youth')
    .map((guest) => [guest.first_name, guest.last_name].filter(Boolean).join(' ').trim())
    .filter(Boolean);

  const fallbackAdults = booking?.lead_guest_name ? [booking.lead_guest_name] : [];

  return {
    templateVersion: 'pixie_dvc_v1_1',
    generatedAt: new Date().toISOString(),
    rentalId: rentalRow?.id ?? rentalId ?? null,
    confirmationNumber: confirmationNumber ?? null,
    summary: {
      reservationNumber: confirmationNumber ?? null,
      resortName: booking?.primary_resort?.name ?? packageResortName ?? '—',
      resortCode: booking?.primary_resort?.calculator_code ?? null,
      resortSlug: booking?.primary_resort?.slug ?? null,
      accommodationType,
      checkIn: booking?.check_in ?? packageCheckIn ?? rentalRow?.check_in ?? '—',
      checkOut: booking?.check_out ?? packageCheckOut ?? rentalRow?.check_out ?? '—',
      pointsRented,
      guestPricePerPointCents: guestPricePerPointCents ?? 0,
      totalPayableByGuestCents: guestTotalCents,
      paidNowRule,
      paidNowPercent,
      paidNowCents,
      balanceOwingCents,
      currency: 'USD',
    },
    parties: {
      guest: {
        fullName: booking?.lead_guest_name ?? packageGuestName ?? '—',
        email: booking?.lead_guest_email ?? null,
        phone: booking?.lead_guest_phone ?? null,
        address: {
          line1: booking?.address_line1 ?? null,
          line2: booking?.address_line2 ?? null,
          city: booking?.city ?? null,
          state: booking?.state ?? null,
          postal: booking?.postal_code ?? null,
          country: booking?.country ?? null,
        },
      },
      owner: {
        fullName: membership?.owner_legal_full_name ?? owner?.profiles?.display_name ?? 'Owner',
        secondOwnerFullName: membership?.co_owner_legal_full_name ?? null,
      },
      intermediary: {
        legalName: 'Pixie DVC',
        address: '8 The Green Ste Suite A, Dover, DE 19901, USA',
        tagline: 'Pixie DVC, an AlphaFlare company',
      },
    },
    occupancy: {
      adults: adultGuests.length ? adultGuests : fallbackAdults,
      youths: youthGuests,
    },
  };
}

function buildEmailSummary(snapshot: ContractSnapshot) {
  const lines: string[] = [];
  if (snapshot.resortName) {
    lines.push(`• Resort: ${snapshot.resortName}`);
  }
  if (snapshot.accommodationType) {
    lines.push(`• Room: ${snapshot.accommodationType}`);
  }
  if (snapshot.checkIn && snapshot.checkOut) {
    lines.push(`• Dates: ${snapshot.checkIn} → ${snapshot.checkOut}`);
  }
  if (snapshot.pointsRented) {
    lines.push(`• Points: ${snapshot.pointsRented}`);
  }
  if (snapshot.pricePerPoint) {
    lines.push(`• Price per point: $${snapshot.pricePerPoint}`);
  }
  if (snapshot.totalUsd) {
    lines.push(`• Total: $${snapshot.totalUsd}`);
  }
  return lines.length ? lines.join('\n') : '';
}
