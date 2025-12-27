'use server';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabaseServer';
import { fillTemplate, loadContractTemplate } from '@/contracts/loadTemplate';
import { sendPlainEmail } from '@/lib/email';
import { generateAcceptToken } from '@/lib/tokens';

type ContractSnapshot = {
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  homeResort?: string | null;
  useYearMonth?: string | null;
  pointsAvailable?: number | null;
  pricePerPoint?: number | null;
  bookingRequestId?: string | null;
  bookingResortName?: string | null;
  bookingRoomType?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  nights?: number | null;
  guestName?: string | null;
  guestEmail?: string | null;
};

type PlaceholderData = Record<string, string | number | null | undefined>;

export async function generateContract(form: {
  ownerId: string;
  bookingRequestId?: string | null;
  templateName: string;
  placeholderData: PlaceholderData;
}) {
  const supabase = createClient();

  const template = loadContractTemplate(form.templateName);
  const body = fillTemplate(template, form.placeholderData);

  const snapshot = await buildSnapshot({
    supabase,
    ownerId: form.ownerId,
    bookingRequestId: form.bookingRequestId ?? null,
    placeholderData: form.placeholderData,
  });

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      owner_id: form.ownerId,
      booking_request_id: form.bookingRequestId ?? null,
      template_name: form.templateName,
      contract_body: body,
      status: 'draft',
      snapshot,
    })
    .select()
    .single();

  if (error) throw error;

  await logContractEvent({
    contractId: data.id,
    eventType: 'created',
  });

  return data;
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
  const supabase = createClient();

  const { error } = await supabase.from('contract_events').insert({
    contract_id: contractId,
    event_type: eventType,
    metadata,
  });

  if (error) throw error;
}

export async function updateContractStatus(contractId: number, status: 'sent' | 'accepted' | 'rejected') {
  const supabase = createClient();

  const { error } = await supabase
    .from('contracts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', contractId);

  if (error) throw error;

  await logContractEvent({
    contractId,
    eventType: status,
  });
}

export async function sendContractEmail(params: { contractId: number; sendToOwner?: boolean; sendToGuest?: boolean }) {
  const supabase = createClient();

  const { data: initialContract, error } = await supabase
    .from('contracts')
    .select('*, snapshot')
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
  const guestEmailCandidate = booking?.lead_guest_email ?? snapshot.guestEmail ?? null;

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
      .select('*, snapshot')
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

  const emailsToSend: { to: string; subject: string; body: string; context: string }[] = [];

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
      contract.contract_body,
      '',
      ownerUrl
        ? [`To review and accept online, click: ${ownerUrl}`, 'If the link does not work, copy and paste it into your browser.'].join('\n')
        : 'To accept, contact concierge@pixiedvc.com.',
      '',
      'Need help? Email concierge@pixiedvc.com.',
    ]
      .filter(Boolean)
      .join('\n');
    emailsToSend.push({ to: ownerEmail, subject, body, context: 'contract owner email' });
  }

  if (params.sendToGuest) {
    if (!guestEmailCandidate) {
      throw new Error('Guest email unavailable');
    }
    const subject = 'PixieDVC – Rental Agreement';
    const body = [
      `Hi ${booking?.lead_guest_name ?? snapshot.guestName ?? 'PixieDVC guest'},`,
      '',
      'Here is the rental agreement for your stay. Please review the summary and accept online.',
      summary,
      '',
      contract.contract_body,
      '',
      guestUrl
        ? [`To review and accept online, click: ${guestUrl}`, 'If the link does not work, copy and paste it into your browser.'].join('\n')
        : 'To accept, contact concierge@pixiedvc.com.',
      '',
      'Need assistance? Email concierge@pixiedvc.com.',
    ]
      .filter(Boolean)
      .join('\n');
    emailsToSend.push({ to: guestEmailCandidate, subject, body, context: 'contract guest email' });
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
    },
  });

  return contract;
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
  const [ownerResponse, bookingResponse] = await Promise.all([
    supabase
      .from('owners')
      .select('home_resort, use_year, profiles:profiles!owners_user_id_fkey(display_name, email)')
      .eq('id', ownerId)
      .maybeSingle(),
    bookingRequestId
      ? supabase
          .from('booking_requests')
          .select('lead_guest_name, lead_guest_email, check_in, check_out, total_points, primary_room, primary_resort:resorts(name)')
          .eq('id', bookingRequestId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const owner = ownerResponse.data;
  const booking = bookingResponse?.data;

  const nights = booking?.check_in && booking?.check_out ? calculateNights(booking.check_in, booking.check_out) : null;

  return {
    ownerId,
    ownerName: owner?.profiles?.display_name ?? null,
    ownerEmail: owner?.profiles?.email ?? null,
    homeResort: owner?.home_resort ?? null,
    useYearMonth: owner?.use_year ?? null,
    pointsAvailable: placeholderData.POINTS_AVAILABLE ? Number(placeholderData.POINTS_AVAILABLE) : null,
    pricePerPoint: placeholderData.PRICE_PER_POINT ? Number(placeholderData.PRICE_PER_POINT) : null,
    bookingRequestId,
    bookingResortName: booking?.primary_resort?.name ?? null,
    bookingRoomType: booking?.primary_room ?? null,
    checkIn: booking?.check_in ?? null,
    checkOut: booking?.check_out ?? null,
    nights,
    guestName: booking?.lead_guest_name ?? null,
    guestEmail: booking?.lead_guest_email ?? null,
  };
}

function calculateNights(checkIn: string, checkOut: string) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  if (Number.isNaN(diff)) {
    return null;
  }
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function buildEmailSummary(snapshot: ContractSnapshot) {
  const lines: string[] = [];
  if (snapshot.homeResort) {
    lines.push(`• Home resort: ${snapshot.homeResort}`);
  }
  if (snapshot.bookingResortName) {
    lines.push(`• Guest resort: ${snapshot.bookingResortName}`);
  }
  if (snapshot.useYearMonth) {
    lines.push(`• Use year: ${snapshot.useYearMonth}`);
  }
  if (snapshot.checkIn && snapshot.checkOut) {
    lines.push(`• Dates: ${snapshot.checkIn} → ${snapshot.checkOut}`);
  }
  if (snapshot.pointsAvailable) {
    lines.push(`• Points: ${snapshot.pointsAvailable}`);
  }
  if (snapshot.pricePerPoint) {
    lines.push(`• Price per point: $${snapshot.pricePerPoint}`);
  }
  return lines.length ? lines.join('\n') : '';
}
