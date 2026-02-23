'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServiceClient } from '@/lib/supabase-service-client';
import type { ContractSnapshot } from '@/lib/contracts/contractSnapshot';
import { sendGuestAgreementSignedEmail, sendOwnerAgreementSignedEmail } from '@/lib/email';
import { isReadyStayBookingRequest } from '@/lib/ready-stays/flow';
import { ensureGuestAgreementForBooking, logContractEvent } from '@/server/contracts';

export async function acceptContractAction(_: { error?: string | null }, formData: FormData) {
  const token = formData.get('token');
  if (!token || typeof token !== 'string') {
    return { error: 'Missing token' };
  }

  const confirm = formData.get('confirm');
  if (!confirm) {
    return { error: 'Please confirm you agree to the terms before continuing.' };
  }

  const supabase = createServiceClient();

  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .or(`owner_accept_token.eq.${token},guest_accept_token.eq.${token}`)
    .maybeSingle();

  if (!contract) {
    return { error: 'Contract not found' };
  }

  const role = contract.owner_accept_token === token ? 'owner' : contract.guest_accept_token === token ? 'guest' : null;
  if (!role) {
    return { error: 'Invalid token' };
  }
  const isReadyStay = await isReadyStayBookingRequest(supabase, contract.booking_request_id);

  if (role === 'guest' && isReadyStay && contract.booking_request_id) {
    const { data: readyStay } = await supabase
      .from('ready_stays')
      .select('owner_id')
      .eq('booking_request_id', contract.booking_request_id)
      .limit(1)
      .maybeSingle();

    if (readyStay?.owner_id) {
      let { data: ownerRecord } = await supabase
        .from('owners')
        .select('id, full_legal_name, user_id')
        .eq('id', readyStay.owner_id)
        .maybeSingle();

      if (!ownerRecord) {
        const { data: fallbackOwner } = await supabase
          .from('owners')
          .select('id, full_legal_name, user_id')
          .eq('user_id', readyStay.owner_id)
          .maybeSingle();
        ownerRecord = fallbackOwner ?? null;
      }

      const { data: ownerMembership } = await supabase
        .from('owner_memberships')
        .select('owner_legal_full_name')
        .eq('owner_id', readyStay.owner_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const ownerLegalName =
        ownerRecord?.full_legal_name?.trim() ||
        ownerMembership?.owner_legal_full_name?.trim() ||
        null;
      if (process.env.NODE_ENV !== 'production') {
        console.error('[contracts/accept] ready stay owner legal name source', {
          readyStayOwnerId: readyStay.owner_id,
          source: ownerRecord?.full_legal_name?.trim()
            ? 'owners.full_legal_name'
            : ownerMembership?.owner_legal_full_name?.trim()
              ? 'owner_memberships.owner_legal_full_name'
              : 'none',
          hasValue: Boolean(ownerLegalName),
        });
      }
      if (!ownerLegalName) {
        return { error: 'Owner legal name is missing. Payment cannot be started yet.' };
      }
    }
  }

  const column = role === 'owner' ? 'owner_accepted_at' : 'guest_accepted_at';
  const allowReadyStayPaymentRetry = role === 'guest' && isReadyStay && contract.status === 'sent';
  if (contract[column] && !allowReadyStayPaymentRetry) {
    return { error: 'Agreement already accepted.' };
  }

  const updates: Record<string, unknown> = {};
  if (!contract[column]) {
    updates[column] = new Date().toISOString();
  }
  if (role === 'guest') {
    updates.status = isReadyStay ? 'sent' : 'accepted';
  } else if (contract.owner_accepted_at && contract.guest_accepted_at) {
    updates.status = 'accepted';
  }

  await supabase.from('contracts').update(updates).eq('id', contract.id);

  const meta = buildAuditMetadata(await headers());

  await logContractEvent({
    contractId: contract.id,
    eventType: 'accepted',
    metadata: {
      role,
      ...meta,
      guest_ip: meta.ip,
      guest_user_agent: meta.userAgent,
    },
  });

  if (role === 'guest') {
    const { data: freshContract } = await supabase
      .from('contracts')
      .select('id, signed_copy_emailed_at, guest_accept_token, snapshot')
      .eq('id', contract.id)
      .maybeSingle();

    const snapshot = (freshContract?.snapshot ?? contract.snapshot ?? {}) as ContractSnapshot;

    if (snapshot.ownerEmail) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
      const rentalUrl =
        snapshot.rentalId && baseUrl
          ? baseUrl.replace(/\/$/, '') + '/owner/rentals/' + snapshot.rentalId
          : null;
      await sendOwnerAgreementSignedEmail({
        to: snapshot.ownerEmail,
        ownerName: snapshot.ownerName,
        guestName: snapshot.renterName,
        resortName: snapshot.resortName,
        checkIn: snapshot.checkIn,
        checkOut: snapshot.checkOut,
        rentalUrl,
      });
    }

    if (freshContract?.signed_copy_emailed_at) {
      // Idempotency: email already sent.
    } else {
      const guestEmail = snapshot.parties?.guest?.email ?? snapshot.guestEmail ?? null;
      if (guestEmail) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
          const tokenToUse = freshContract?.guest_accept_token ?? contract.guest_accept_token;
          const agreementUrl = baseUrl && tokenToUse ? `${baseUrl.replace(/\/$/, '')}/contracts/${tokenToUse}` : null;
          await sendGuestAgreementSignedEmail({
            to: guestEmail,
            guestName: snapshot.renterName ?? null,
            resortName: snapshot.resortName ?? null,
            checkIn: snapshot.checkIn ?? null,
            checkOut: snapshot.checkOut ?? null,
            agreementUrl,
          });
          await supabase
            .from('contracts')
            .update({ signed_copy_emailed_at: new Date().toISOString() })
            .eq('id', contract.id);
        } catch (error) {
          console.error('Failed to send guest agreement signed email', error);
        }
      } else {
        console.warn('Guest agreement signed email skipped: missing guest email', {
          contractId: contract.id,
        });
      }
    }
  }

  if (role === 'guest' && contract.booking_request_id) {
    let latestContract = contract;

    if (isReadyStay && contract.booking_request_id) {
      const { data: readyStay } = await supabase
        .from('ready_stays')
        .select('owner_id, rental_id')
        .eq('booking_request_id', contract.booking_request_id)
        .limit(1)
        .maybeSingle();

      if (readyStay?.owner_id && readyStay?.rental_id) {
        let { data: ownerRecord } = await supabase
          .from('owners')
          .select('id, user_id')
          .eq('id', readyStay.owner_id)
          .maybeSingle();
        if (!ownerRecord) {
          const { data: fallbackOwner } = await supabase
            .from('owners')
            .select('id, user_id')
            .eq('user_id', readyStay.owner_id)
            .maybeSingle();
          ownerRecord = fallbackOwner ?? null;
        }
        if (ownerRecord?.id) {
          await ensureGuestAgreementForBooking({
            supabase,
            ownerId: ownerRecord.id,
            bookingRequestId: contract.booking_request_id,
            rentalId: readyStay.rental_id,
          });
          const { data: refreshedContract } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', contract.id)
            .maybeSingle();
          if (refreshedContract) {
            latestContract = refreshedContract;
          }
        }
      }
    }

    const snapshot = (latestContract.snapshot ?? {}) as ContractSnapshot;
    const summary = snapshot.summary;
    let readyStayAmountCents: number | null = null;
    let readyStayIdForMetadata: string | null = null;
    if (isReadyStay && contract.booking_request_id) {
      const { data: readyStayPricing } = await supabase
        .from('ready_stays')
        .select('id, points, guest_price_per_point_cents')
        .eq('booking_request_id', contract.booking_request_id)
        .limit(1)
        .maybeSingle();
      if (
        typeof readyStayPricing?.points === 'number' &&
        typeof readyStayPricing?.guest_price_per_point_cents === 'number'
      ) {
        readyStayAmountCents = readyStayPricing.points * readyStayPricing.guest_price_per_point_cents;
      }
      readyStayIdForMetadata = readyStayPricing?.id ?? null;
    }
    const amountCents = isReadyStay
      ? (readyStayAmountCents ??
        (typeof summary?.totalPayableByGuestCents === 'number' ? summary.totalPayableByGuestCents : null))
      : typeof summary?.paidNowCents === 'number'
        ? summary.paidNowCents
        : null;
    const currency = typeof summary?.currency === 'string' ? summary.currency : 'USD';

    if (!amountCents || amountCents <= 0) {
      return { error: 'Payment amount is unavailable. Please contact support.' };
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY ?? '';
    if (!stripeSecret) {
      return { error: 'Stripe configuration is missing. Please contact support.' };
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3005';
    const successUrl = `${baseUrl.replace(/\/$/, '')}/contracts/${token}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl.replace(/\/$/, '')}/contracts/${token}`;

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', successUrl);
    params.set('cancel_url', cancelUrl);
    params.append('payment_method_types[]', 'card');
    if (snapshot.parties?.guest?.email) {
      params.set('customer_email', snapshot.parties.guest.email);
    }
    params.append('line_items[0][price_data][currency]', currency.toLowerCase());
    params.append(
      'line_items[0][price_data][product_data][name]',
      isReadyStay ? 'PixieDVC Ready Stay Payment (Full)' : 'PixieDVC Reservation Payment',
    );
    params.append('line_items[0][price_data][unit_amount]', String(amountCents));
    params.append('line_items[0][quantity]', '1');
    params.append('client_reference_id', latestContract.booking_request_id);
    params.append('metadata[booking_request_id]', latestContract.booking_request_id);
    params.append('metadata[payment_type]', isReadyStay ? 'full' : 'booking');
    params.append('metadata[contract_id]', String(latestContract.id));
    if (isReadyStay && readyStayIdForMetadata) {
      params.append('metadata[ready_stay_id]', readyStayIdForMetadata);
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const json = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!response.ok || !json.url) {
      return { error: json.error?.message ?? 'Unable to create Stripe checkout session.' };
    }

    if (isReadyStay) {
      await supabase
        .from('booking_requests')
        .update({
          status: 'pending_payment',
          payment_status: 'pending',
          stripe_checkout_session_id: json.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', latestContract.booking_request_id);

      await supabase
        .from('contracts')
        .update({
          status: 'pending_payment',
          updated_at: new Date().toISOString(),
        })
        .eq('id', latestContract.id);
    }

    redirect(json.url);
  }

  return { error: 'Payment could not be started. Please try again.' };
}

export async function declineContractAction(formData: FormData) {
  const token = formData.get('token');
  if (!token || typeof token !== 'string') {
    return { error: 'Missing token' };
  }

  const supabase = createServiceClient();
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .or(`owner_accept_token.eq.${token},guest_accept_token.eq.${token}`)
    .maybeSingle();

  if (!contract) {
    throw new Error('Contract not found');
  }

  const role = contract.owner_accept_token === token ? 'owner' : contract.guest_accept_token === token ? 'guest' : null;
  if (!role) {
    throw new Error('Invalid token');
  }

  await supabase
    .from('contracts')
    .update({ status: 'rejected' })
    .eq('id', contract.id);

  const meta = buildAuditMetadata(headers());
  await logContractEvent({
    contractId: contract.id,
    eventType: 'rejected',
    metadata: { role, ...meta },
  });

  return { success: true };
}

function buildAuditMetadata(hdrs: Headers) {
  const forwarded = hdrs.get('x-forwarded-for') ?? hdrs.get('cf-connecting-ip');
  const userAgent = hdrs.get('user-agent');
  return {
    ip: forwarded ?? 'unknown',
    userAgent: userAgent ?? 'unknown',
  };
}
