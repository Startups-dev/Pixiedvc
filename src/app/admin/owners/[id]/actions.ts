'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { generateContract, sendContractEmail, updateContractStatus } from '@/server/contracts';

import { DEFAULT_TEMPLATE_NAME } from './constants';

type PlaceholderData = Record<string, string | number | null | undefined>;

type PlaceholderContext = {
  supabase: SupabaseClient;
  ownerId: string;
  bookingRequestId: string | null;
  pricePerPoint: string | null;
};

export async function generateContractAction(formData: FormData) {
  await requireAdminUser();
  const ownerId = (formData.get('ownerId') as string) ?? '';
  if (!ownerId) {
    throw new Error('Owner ID missing');
  }
  const templateName = ((formData.get('templateName') as string) || DEFAULT_TEMPLATE_NAME).trim() || DEFAULT_TEMPLATE_NAME;
  const bookingRequestId = ((formData.get('bookingRequestId') as string) || '').trim() || null;
  const manualPrice = ((formData.get('pricePerPoint') as string) || '').trim();

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY – required to generate contracts.');
  }

  const placeholderData = await buildPlaceholderData({
    supabase,
    ownerId,
    bookingRequestId,
    pricePerPoint: manualPrice || null,
  });

  await generateContract({
    ownerId,
    bookingRequestId,
    templateName,
    placeholderData,
  });

  revalidatePath(`/admin/owners/${ownerId}`);
}

export async function sendContractAction(formData: FormData) {
  await requireAdminUser();
  const ownerId = (formData.get('ownerId') as string) ?? '';
  const contractId = Number(formData.get('contractId'));
  const target = (formData.get('target') as string) || 'owner';
  if (!contractId) {
    throw new Error('Contract ID missing');
  }

  await sendContractEmail({
    contractId,
    sendToOwner: target === 'owner',
    sendToGuest: target === 'guest',
  });

  revalidatePath(`/admin/owners/${ownerId}`);
}

export async function markContractStatusAction(formData: FormData) {
  await requireAdminUser();
  const ownerId = (formData.get('ownerId') as string) ?? '';
  const contractId = Number(formData.get('contractId'));
  const status = formData.get('status') as 'accepted' | 'rejected';
  if (!contractId || !status) {
    throw new Error('Missing contract status payload');
  }

  await updateContractStatus(contractId, status);
  revalidatePath(`/admin/owners/${ownerId}`);
}

async function buildPlaceholderData({ supabase, ownerId, bookingRequestId, pricePerPoint }: PlaceholderContext) {
  const { data: owner, error } = await supabase
    .from('owners')
    .select('id, home_resort, use_year, profiles:profiles!owners_user_id_fkey(display_name)')
    .eq('id', ownerId)
    .maybeSingle();
  if (error || !owner) {
    throw new Error('Owner not found');
  }

  const { data: membershipRows } = await supabase
    .from('owner_memberships')
    .select('points_available, resort:resorts(name), use_year')
    .eq('owner_id', ownerId)
    .limit(1);

  const membership = membershipRows?.[0] ?? null;
  let booking = null as {
    lead_guest_name: string | null;
    check_in: string | null;
    check_out: string | null;
    total_points: number | null;
    max_price_per_point: number | null;
  } | null;

  if (bookingRequestId) {
    const { data: bookingRow } = await supabase
      .from('booking_requests')
      .select('lead_guest_name, check_in, check_out, total_points, max_price_per_point, id')
      .eq('id', bookingRequestId)
      .maybeSingle();
    booking = bookingRow ?? null;
  }

  return {
    OWNER_NAME: owner.profiles?.display_name ?? 'PixieDVC Owner',
    DATE: new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
    HOME_RESORT: owner.home_resort ?? membership?.resort?.name ?? '',
    USE_YEAR: owner.use_year ?? membership?.use_year ?? '',
    POINTS_AVAILABLE: membership?.points_available?.toString() ?? '',
    PRICE_PER_POINT: pricePerPoint || booking?.max_price_per_point?.toString() || '',
    GUEST_NAME: booking?.lead_guest_name ?? '',
    CHECK_IN: booking?.check_in ?? '',
    CHECK_OUT: booking?.check_out ?? '',
    POINTS_NEEDED: booking?.total_points?.toString() ?? '',
    BOOKING_REFERENCE: bookingRequestId ?? '',
  } satisfies PlaceholderData;
}
