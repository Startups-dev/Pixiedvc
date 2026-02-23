'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import { sendPlainEmail } from '@/lib/email';

async function notifyGuestReadyToLink({
  adminClient,
  bookingId,
}: {
  adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
  bookingId: string;
}) {
  const { data: booking, error: bookingError } = await adminClient
    .from('booking_requests')
    .select(
      'id, renter_id, lead_guest_email, lead_guest_name, disney_confirmation_number, owner_transfer_confirmed_at, guest_link_ready_notified_at',
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError || !booking) {
    console.warn('[ready-stays] notifyGuestReadyToLink booking lookup failed', {
      bookingId,
      error: bookingError?.message ?? 'not_found',
    });
    return;
  }

  if (!booking.owner_transfer_confirmed_at) {
    return;
  }

  if (booking.guest_link_ready_notified_at) {
    return;
  }

  if (!booking.lead_guest_email) {
    console.warn('[ready-stays] notifyGuestReadyToLink skipped: missing guest email', { bookingId });
    return;
  }

  if (!booking.disney_confirmation_number) {
    console.warn('[ready-stays] notifyGuestReadyToLink skipped: missing disney confirmation number', {
      bookingId,
    });
    return;
  }

  const tripLink = `/my-trip/${bookingId}`;

  try {
    if (booking.renter_id) {
      await adminClient.from('notifications').insert({
        user_id: booking.renter_id,
        type: 'ready_stay_link_ready',
        title: 'Ready to link in My Disney Experience',
        body: 'Your confirmation number is now available. Open your trip to copy it and link your reservation.',
        link: tripLink,
      });
    } else {
      console.warn('[ready-stays] notifyGuestReadyToLink skipped in-app notification: missing renter_id', {
        bookingId,
      });
    }
  } catch (error) {
    console.error('[ready-stays] notifyGuestReadyToLink in-app notification failed', { bookingId, error });
  }

  try {
    await sendPlainEmail({
      to: booking.lead_guest_email,
      subject: 'Your Disney reservation is ready to link',
      body: [
        `Hi ${booking.lead_guest_name ?? 'there'},`,
        '',
        'Your confirmation number is now available:',
        `${booking.disney_confirmation_number}`,
        '',
        'To link it in My Disney Experience:',
        '1) Open My Disney Experience',
        '2) My Plans -> Link a Reservation',
        '3) Paste your confirmation number',
        '',
        `Open your trip: ${tripLink}`,
      ].join('\n'),
      context: 'ready stay transfer link-ready email',
    });
  } catch (error) {
    console.error('[ready-stays] notifyGuestReadyToLink email failed', { bookingId, error });
  }

  const nowIso = new Date().toISOString();
  await adminClient
    .from('booking_requests')
    .update({
      guest_link_ready_notified_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', bookingId)
    .is('guest_link_ready_notified_at', null);
}

export type ConfirmReadyStayTransferInlineResult = { ok: true } | { ok: false; error: string };

export async function confirmReadyStayTransferInline(input: {
  readyStayId: string;
  bookingId?: string | null;
}): Promise<ConfirmReadyStayTransferInlineResult> {
  const readyStayId = input.readyStayId;
  const bookingIdFromForm =
    typeof input.bookingId === 'string' && input.bookingId.length > 0 ? input.bookingId : null;

  if (!readyStayId || typeof readyStayId !== 'string') {
    return { ok: false, error: 'missing_listing_reference' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'unauthenticated' };
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { ok: false, error: 'admin_unavailable' };
  }

  const { data: ownerRecord } = await adminClient
    .from('owners')
    .select('id, user_id')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  const ownerIds = Array.from(
    new Set(
      [user.id, ownerRecord?.id ?? null, ownerRecord?.user_id ?? null].filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      ),
    ),
  );

  const { data: readyStay } = await adminClient
    .from('ready_stays')
    .select('id, owner_id, sold_booking_request_id, booking_request_id, status')
    .eq('id', readyStayId)
    .maybeSingle();

  const linkedBookingRequestId =
    readyStay?.sold_booking_request_id ?? readyStay?.booking_request_id ?? bookingIdFromForm ?? null;
  if (!readyStay || !linkedBookingRequestId) {
    return { ok: false, error: 'transfer_unavailable' };
  }

  let ownerMatches = ownerIds.includes(readyStay.owner_id);
  if (!ownerMatches) {
    const { data: readyStayOwner } = await adminClient
      .from('owners')
      .select('id, user_id')
      .eq('id', readyStay.owner_id)
      .maybeSingle();
    ownerMatches = Boolean(readyStayOwner?.user_id && ownerIds.includes(readyStayOwner.user_id));
  }

  if (!ownerMatches) {
    return { ok: false, error: 'access_denied' };
  }

  const { data: bookingRequest } = await adminClient
    .from('booking_requests')
    .select('id, status')
    .eq('id', linkedBookingRequestId)
    .maybeSingle();

  if (!bookingRequest) {
    return { ok: false, error: 'booking_missing' };
  }

  if (bookingRequest.status === 'transferred' || bookingRequest.status === 'completed') {
    return { ok: true };
  }

  if (bookingRequest.status !== 'paid_waiting_owner_transfer') {
    return { ok: false, error: 'booking_not_transferable' };
  }

  const nowIso = new Date().toISOString();

  const { error } = await adminClient
    .from('booking_requests')
    .update({
      status: 'transferred',
      transferred_at: nowIso,
      owner_transfer_confirmed_at: nowIso,
      owner_transfer_confirmed_by: user.id,
      updated_at: nowIso,
    })
    .eq('id', linkedBookingRequestId)
    .eq('status', 'paid_waiting_owner_transfer');

  if (error) {
    return { ok: false, error: 'update_failed' };
  }

  await adminClient
    .from('ready_stays')
    .update({
      status: 'sold',
      sold_booking_request_id: linkedBookingRequestId,
      updated_at: nowIso,
    })
    .eq('id', readyStay.id);

  try {
    await notifyGuestReadyToLink({
      adminClient,
      bookingId: linkedBookingRequestId,
    });
  } catch (notifyError) {
    console.error('[ready-stays] transfer notify failed', {
      bookingId: linkedBookingRequestId,
      notifyError,
    });
  }

  return { ok: true };
}

export async function confirmReadyStayTransfer(formData: FormData) {
  const readyStayId = formData.get('readyStayId');
  const bookingIdParam = formData.get('bookingId');
  const bookingIdFromForm = typeof bookingIdParam === 'string' && bookingIdParam.length > 0 ? bookingIdParam : null;
  const redirectBase = `/owner/ready-stays/${typeof readyStayId === 'string' ? readyStayId : ''}/booking-package`;

  if (!readyStayId || typeof readyStayId !== 'string') {
    redirect('/owner/ready-stays?error=missing_listing_reference');
  }

  const result = await confirmReadyStayTransferInline({
    readyStayId,
    bookingId: bookingIdFromForm,
  });

  if (!result.ok) {
    if (result.error === 'unauthenticated') {
      redirect(`/login?redirect=${encodeURIComponent(redirectBase)}`);
    }
    redirect(`${redirectBase}?bookingId=${encodeURIComponent(bookingIdFromForm ?? '')}&error=${encodeURIComponent(result.error)}`);
  }

  redirect('/owner/ready-stays?notice=transferred');
}
