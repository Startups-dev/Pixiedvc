import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { renderPixieAgreementHTML } from '@/lib/agreements/renderPixieAgreement';
import type { ContractSnapshot } from '@/lib/contracts/contractSnapshot';
import { ensureGuestAgreementForBooking } from '@/server/contracts';
import AcceptanceFormClient from '@/app/contracts/[token]/AcceptanceFormClient';
import { acceptContractAction, declineContractAction } from '@/app/contracts/[token]/actions';

function formatCurrency(cents: number | null | undefined) {
  const value = typeof cents === 'number' ? cents : 0;
  return `$${(value / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function renderDevDebug(report: Record<string, unknown>) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Ready Stays Agreement Debug</h1>
        <p className="mt-1 text-sm text-slate-600">Development-only guard report.</p>
        <pre className="mt-4 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
          {JSON.stringify(report, null, 2)}
        </pre>
      </div>
    </main>
  );
}

export default async function ReadyStayAgreementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ lock?: string }>;
}) {
  const isDev = process.env.NODE_ENV !== 'production';
  const { id: readyStayId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const lock = resolvedSearchParams?.lock;
  const packagePath = lock
    ? `/ready-stays/${readyStayId}/book/package?lock=${encodeURIComponent(lock)}`
    : `/ready-stays/${readyStayId}/book/package`;

  const debugReport: Record<string, unknown> = {
    guard: null,
    readyStayId,
    lock: lock ?? null,
    readyStay: null,
    currentUserId: null,
    bookingRequest: null,
    bookingRequestQueryError: null,
    renterGuardMatch: null,
    ownerResolution: {
      fromStayOwnerId: null,
      fromStayUserId: null,
      fromRentalOwnerUserId: null,
      fromContractOwnerUserId: null,
      finalOwnerId: null,
      fullLegalNameFound: false,
      legalNameSource: null,
    },
    contractLookup: {
      id: null,
      snapshotExists: false,
      guestAcceptTokenExists: false,
    },
    ensureGuestAgreementForBooking: {
      called: false,
      success: false,
      error: null,
    },
  };

  const fail = (branch: string, redirectTo: string) => {
    if (isDev) {
      console.error('[ready-stays/agreement] guard failed', {
        branch,
        redirectTo,
        readyStayId,
        lock: lock ?? null,
      });
      debugReport.guard = branch;
      debugReport.redirectTarget = redirectTo;
      return renderDevDebug(debugReport);
    }
    redirect(redirectTo);
  };

  const supabase = await createSupabaseServerClient();
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return fail('missing_admin_client', packagePath);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  debugReport.currentUserId = user?.id ?? null;

  if (!user) {
    return fail('missing_user', `/login?redirect=/ready-stays/${readyStayId}/agreement`);
  }

  const { data: readyStay } = await adminClient
    .from('ready_stays')
    .select(
      'id, owner_id, rental_id, resort_id, check_in, check_out, points, room_type, guest_price_per_point_cents, booking_request_id, lock_session_id, status',
    )
    .eq('id', readyStayId)
    .maybeSingle();

  debugReport.readyStay = readyStay ?? null;

  if (!readyStay?.id) {
    return fail('ready_stay_not_found', '/ready-stays');
  }

  const lockForBack = lock ?? readyStay.lock_session_id ?? readyStay.booking_request_id ?? null;
  const backPath = lockForBack
    ? `/ready-stays/${readyStayId}/book/package?lock=${encodeURIComponent(lockForBack)}`
    : `/ready-stays/${readyStayId}/book/package`;

  if (!readyStay.booking_request_id) {
    return fail('missing_ready_stay_booking_request_id', backPath);
  }

  const { data: booking, error: bookingQueryError } = await supabase
    .from('booking_requests')
    .select(
      'id, renter_id, status, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, city, state, postal_code, country, primary_resort_id, confirmed_resort_id, total_points, guest_rate_per_point_cents, guest_total_cents, adults, youths',
    )
    .eq('id', readyStay.booking_request_id)
    .eq('renter_id', user.id)
    .maybeSingle();

  debugReport.bookingRequest = booking ?? null;
  debugReport.bookingRequestQueryError = bookingQueryError
    ? {
        code: bookingQueryError.code ?? null,
        message: bookingQueryError.message ?? null,
        details: bookingQueryError.details ?? null,
        hint: bookingQueryError.hint ?? null,
      }
    : null;
  debugReport.renterGuardMatch = Boolean(booking?.id && booking.renter_id === user.id);

  if (!booking?.id || booking.renter_id !== user.id) {
    if (isDev && bookingQueryError) {
      console.error('[ready-stays/agreement] booking query failed', {
        code: bookingQueryError.code,
        message: bookingQueryError.message,
        details: bookingQueryError.details,
        hint: bookingQueryError.hint,
        readyStayId,
        bookingRequestId: readyStay.booking_request_id,
        currentUserId: user.id,
      });
    }
    return fail('booking_renter_guard_failed', backPath);
  }

  let { data: contract } = await adminClient
    .from('contracts')
    .select('*')
    .eq('booking_request_id', booking.id)
    .maybeSingle();

  let ownerRecordFromStay: { id: string; user_id: string | null; full_legal_name: string | null } | null = null;

  if (!contract && readyStay.rental_id) {
    let { data: ownerByStayId } = await adminClient
      .from('owners')
      .select('id, user_id, full_legal_name')
      .eq('id', readyStay.owner_id)
      .maybeSingle();

    if (ownerByStayId?.id) {
      debugReport.ownerResolution = {
        ...(debugReport.ownerResolution as Record<string, unknown>),
        fromStayOwnerId: ownerByStayId.id,
      };
    }

    if (!ownerByStayId) {
      const { data: ownerByStayUserId } = await adminClient
        .from('owners')
        .select('id, user_id, full_legal_name')
        .eq('user_id', readyStay.owner_id)
        .maybeSingle();
      ownerByStayId = ownerByStayUserId ?? null;

      if (ownerByStayUserId?.id) {
        debugReport.ownerResolution = {
          ...(debugReport.ownerResolution as Record<string, unknown>),
          fromStayUserId: ownerByStayUserId.id,
        };
      }
    }

    if (!ownerByStayId) {
      const { data: rentalOwner } = await adminClient
        .from('rentals')
        .select('owner_user_id')
        .eq('id', readyStay.rental_id)
        .maybeSingle();

      if (rentalOwner?.owner_user_id) {
        debugReport.ownerResolution = {
          ...(debugReport.ownerResolution as Record<string, unknown>),
          fromRentalOwnerUserId: rentalOwner.owner_user_id,
        };
      }

      if (rentalOwner?.owner_user_id) {
        const { data: ownerFromRental } = await adminClient
          .from('owners')
          .select('id, user_id, full_legal_name')
          .eq('user_id', rentalOwner.owner_user_id)
          .maybeSingle();
        ownerByStayId = ownerFromRental ?? null;
      }
    }

    ownerRecordFromStay = ownerByStayId ?? null;

    if (ownerRecordFromStay?.id) {
      debugReport.ensureGuestAgreementForBooking = {
        called: true,
        success: false,
        error: null,
      };

      try {
        await ensureGuestAgreementForBooking({
          supabase: adminClient,
          ownerId: ownerRecordFromStay.id,
          bookingRequestId: booking.id,
          rentalId: readyStay.rental_id,
        });

        debugReport.ensureGuestAgreementForBooking = {
          called: true,
          success: true,
          error: null,
        };
      } catch (error) {
        debugReport.ensureGuestAgreementForBooking = {
          called: true,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }

      const refreshed = await adminClient
        .from('contracts')
        .select('*')
        .eq('booking_request_id', booking.id)
        .maybeSingle();
      contract = refreshed.data ?? null;
    }
  }

  debugReport.contractLookup = {
    id: contract?.id ?? null,
    snapshotExists: Boolean(contract?.snapshot),
    guestAcceptTokenExists: Boolean(contract?.guest_accept_token),
  };

  if (!contract || !contract.guest_accept_token) {
    return fail('contract_missing_or_no_token', backPath);
  }

  let { data: ownerRecord } = await adminClient
    .from('owners')
    .select('id, user_id, full_legal_name')
    .eq('id', readyStay.owner_id)
    .maybeSingle();

  if (!ownerRecord) {
    const { data: fallbackOwner } = await adminClient
      .from('owners')
      .select('id, user_id, full_legal_name')
      .eq('user_id', readyStay.owner_id)
      .maybeSingle();
    ownerRecord = fallbackOwner ?? null;
  }

  if (!ownerRecord) {
    const { data: rentalOwner } = await adminClient
      .from('rentals')
      .select('owner_user_id')
      .eq('id', readyStay.rental_id)
      .maybeSingle();
    if (rentalOwner?.owner_user_id) {
      const { data: ownerFromRental } = await adminClient
        .from('owners')
        .select('id, user_id, full_legal_name')
        .eq('user_id', rentalOwner.owner_user_id)
        .maybeSingle();
      ownerRecord = ownerFromRental ?? null;
    }
  }

  if (!ownerRecord && contract.owner_id) {
    const { data: ownerByContract } = await adminClient
      .from('owners')
      .select('id, user_id, full_legal_name')
      .eq('user_id', contract.owner_id)
      .maybeSingle();
    ownerRecord = ownerByContract ?? null;

    if (ownerByContract?.user_id) {
      debugReport.ownerResolution = {
        ...(debugReport.ownerResolution as Record<string, unknown>),
        fromContractOwnerUserId: ownerByContract.user_id,
      };
    }
  }

  const { data: ownerMembership } = await adminClient
    .from('owner_memberships')
    .select('owner_legal_full_name')
    .eq('owner_id', readyStay.owner_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const ownerLegalName =
    ownerRecord?.full_legal_name?.trim() ||
    ownerMembership?.owner_legal_full_name?.trim() ||
    '';
  const ownerLegalNameSource = ownerRecord?.full_legal_name?.trim()
    ? 'owners.full_legal_name'
    : ownerMembership?.owner_legal_full_name?.trim()
      ? 'owner_memberships.owner_legal_full_name'
      : 'none';

  if (isDev) {
    console.error('[ready-stays/agreement] owner legal name source', {
      readyStayId,
      ownerId: readyStay.owner_id,
      source: ownerLegalNameSource,
      hasValue: Boolean(ownerLegalName),
    });
  }

  debugReport.ownerResolution = {
    ...(debugReport.ownerResolution as Record<string, unknown>),
    finalOwnerId: ownerRecord?.id ?? ownerRecordFromStay?.id ?? null,
    fullLegalNameFound: Boolean(ownerLegalName),
    legalNameSource: ownerLegalNameSource,
  };

  const resolvedResortId = readyStay.resort_id ?? booking.confirmed_resort_id ?? booking.primary_resort_id ?? null;
  const { data: resolvedResort } = resolvedResortId
    ? await adminClient.from('resorts').select('name').eq('id', resolvedResortId).maybeSingle()
    : { data: null };
  const { data: rentalConfirmation } = readyStay.rental_id
    ? await adminClient
        .from('rentals')
        .select('dvc_confirmation_number, disney_confirmation_number')
        .eq('id', readyStay.rental_id)
        .maybeSingle()
    : { data: null };

  const snapshot = (contract.snapshot ?? {}) as ContractSnapshot;
  const summary = snapshot.summary ?? null;

  const readyStayPricePerPointCents = Number(readyStay.guest_price_per_point_cents ?? 0);
  const readyStayPoints = Number(readyStay.points ?? 0);
  const readyStayTotalCents = readyStayPoints * readyStayPricePerPointCents;
  const renterName =
    booking.lead_guest_name?.trim() ||
    snapshot.parties?.guest?.fullName?.trim() ||
    'Not provided';
  const resortName = resolvedResort?.name ?? summary?.resortName ?? 'Not provided';
  const roomType = readyStay.room_type ?? summary?.accommodationType ?? 'Not provided';
  const pricePerPoint = readyStayPricePerPointCents / 100;
  const totalCents = readyStayTotalCents;
  const totalFormatted = formatCurrency(totalCents);
  const pricePerPointFormatted = formatCurrency(readyStayPricePerPointCents);
  const adultsCount = typeof booking.adults === 'number' ? booking.adults : 0;
  const youthsCount = typeof booking.youths === 'number' ? booking.youths : 0;
  const existingAdults = (snapshot.occupancy?.adults ?? []).filter((name) => name.trim().length > 0);
  const existingYouths = (snapshot.occupancy?.youths ?? []).filter((name) => name.trim().length > 0);

  const normalizedSnapshot: ContractSnapshot = {
    templateVersion: snapshot.templateVersion ?? 'pixie_dvc_v1_1',
    generatedAt: snapshot.generatedAt ?? new Date().toISOString(),
    summary: {
      reservationNumber:
        rentalConfirmation?.disney_confirmation_number?.trim() ||
        rentalConfirmation?.dvc_confirmation_number?.trim() ||
        snapshot.summary?.reservationNumber ??
        null,
      resortName,
      accommodationType: roomType,
      checkIn: readyStay.check_in ?? summary?.checkIn ?? '',
      checkOut: readyStay.check_out ?? summary?.checkOut ?? '',
      pointsRented: readyStayPoints,
      guestPricePerPointCents: readyStayPricePerPointCents,
      totalPayableByGuestCents: totalCents,
      paidNowRule: '100% due at signing',
      paidNowPercent: 100,
      paidNowCents: totalCents,
      balanceOwingCents: 0,
      currency: 'USD',
    },
    parties: {
      guest: {
        fullName: renterName,
        email: booking.lead_guest_email ?? snapshot.parties?.guest?.email ?? null,
        phone: booking.lead_guest_phone ?? snapshot.parties?.guest?.phone ?? null,
        address: {
          line1: booking.address_line1 ?? snapshot.parties?.guest?.address?.line1 ?? null,
          line2: snapshot.parties?.guest?.address?.line2 ?? null,
          city: booking.city ?? snapshot.parties?.guest?.address?.city ?? null,
          state: booking.state ?? snapshot.parties?.guest?.address?.state ?? null,
          postal: booking.postal_code ?? snapshot.parties?.guest?.address?.postal ?? null,
          country: booking.country ?? snapshot.parties?.guest?.address?.country ?? null,
        },
      },
      owner: {
        fullName: ownerLegalName || snapshot.parties?.owner?.fullName || 'Not provided',
        secondOwnerFullName: snapshot.parties?.owner?.secondOwnerFullName ?? null,
      },
      intermediary:
        snapshot.parties?.intermediary ?? {
          legalName: 'Pixie DVC',
          address: '8 The Green Ste Suite A, Dover, DE 19901, USA',
          tagline: 'Pixie DVC a AlphaFlare Company',
        },
    },
    occupancy: {
      adults: existingAdults.length ? existingAdults : [`Adult Guests: ${adultsCount}`],
      youths: existingYouths.length ? existingYouths : [`Youth Guests: ${youthsCount}`],
    },
  };
  const agreementHtml = renderPixieAgreementHTML(normalizedSnapshot, {
    guestAcceptedAt: contract.guest_accepted_at ?? null,
    acceptanceId: contract.id ?? null,
  });

  const readyForPayment = Boolean(ownerLegalName);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Ready Stays booking</p>
            <h2 className="font-display text-3xl text-ink">3 / 3 — Agreement &amp; payment</h2>
          </div>
        </div>
        <div className="mt-4 h-1 rounded-full bg-slate-100">
          <div className="h-full w-full rounded-full bg-brand transition-all" />
        </div>
      </div>

      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Reservation Summary</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-slate-500">Owner legal name</dt>
              <dd className="text-slate-900">{ownerLegalName || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Guest legal name</dt>
              <dd className="text-slate-900">{renterName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Guest email</dt>
              <dd className="text-slate-900">{booking.lead_guest_email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Guest phone</dt>
              <dd className="text-slate-900">{booking.lead_guest_phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Guest address</dt>
              <dd className="text-slate-900">
                {[booking.address_line1, booking.city, booking.state, booking.postal_code, booking.country]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Resort</dt>
              <dd className="text-slate-900">{resortName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Room</dt>
              <dd className="text-slate-900">{roomType}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Check-in</dt>
              <dd className="text-slate-900">{readyStay.check_in ?? summary?.checkIn ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Check-out</dt>
              <dd className="text-slate-900">{readyStay.check_out ?? summary?.checkOut ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Points</dt>
              <dd className="text-slate-900">{readyStayPoints || 0}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Price per point</dt>
              <dd className="text-slate-900">{pricePerPointFormatted}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Adults / Youths</dt>
              <dd className="text-slate-900">
                {adultsCount} / {youthsCount}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Total (100%)</dt>
              <dd className="text-slate-900">{totalFormatted}</dd>
            </div>
          </dl>
        </div>

        <div
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          dangerouslySetInnerHTML={{ __html: agreementHtml }}
        />

        {!readyForPayment ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Owner legal name is missing. Payment cannot be started yet.
          </div>
        ) : booking.status === 'transferred' ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            Reservation transferred successfully.
            <div className="mt-2">
              <a href="/guides/link-to-disney-experience" className="font-semibold underline underline-offset-4">
                Link to My Disney Experience
              </a>
            </div>
          </div>
        ) : contract.guest_accepted_at ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            ✓ Agreement accepted
          </div>
        ) : (
          <>
            <AcceptanceFormClient
              token={contract.guest_accept_token}
              onAccept={acceptContractAction}
              submitLabel="Accept Agreement & Continue to Payment"
            />
            <form action={declineContractAction} className="text-center">
              <input type="hidden" name="token" value={contract.guest_accept_token} />
              <button type="submit" className="text-xs font-semibold text-rose-600">
                Decline agreement
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
