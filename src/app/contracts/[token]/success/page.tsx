import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createServiceClient } from '@/lib/supabase-service-client';
import { getActivePromotion } from '@/lib/pricing-promotions';
import GuestEnrollButton from '@/components/rewards/GuestEnrollButton';
import type { ContractSnapshot } from '@/lib/contracts/contractSnapshot';
import { resolveResortImage } from '@/lib/resort-image';
import { isReadyStayBookingRequest } from '@/lib/ready-stays/flow';
import AnimatedHeading from './AnimatedHeading';

function formatConfirmation(value: string | null | undefined) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || 'Pending';
}

export default async function ContractSuccessPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { session_id?: string };
}) {
  const { token } = await Promise.resolve(params);
  const supabase = createServiceClient();

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, booking_request_id, owner_id, snapshot')
    .eq('guest_accept_token', token)
    .maybeSingle();

  if (!contract) {
    notFound();
  }

  if (!contract.booking_request_id) {
    console.error('[contracts/success] Missing booking_request_id', {
      contractId: contract.id,
      guestAcceptToken: token,
    });
  }

  const snapshot = (contract.snapshot ?? {}) as ContractSnapshot;
  const summary = snapshot.summary ?? {};
  const bookingRequestId = contract.booking_request_id ?? null;
  const myTripHref = bookingRequestId ? `/my-trip/${bookingRequestId}` : '/my-trip';
  const readyStayBooking = await isReadyStayBookingRequest(supabase, bookingRequestId);
  let readyStayTransfer:
    | { status: string | null; disney_confirmation_number: string | null }
    | null = null;
  if (readyStayBooking && bookingRequestId) {
    const { data } = await supabase
      .from('booking_requests')
      .select('status, disney_confirmation_number')
      .eq('id', bookingRequestId)
      .maybeSingle();
    readyStayTransfer = data ?? null;
  }

  type ResortRecord = {
    name: string | null;
    slug: string | null;
    calculator_code: string | null;
  };

  let resortRecord: ResortRecord | null = null;
  let guestProfile: { guest_rewards_enrolled_at: string | null } | null = null;
  if (bookingRequestId) {
    const { data: bookingRequest } = await supabase
      .from('booking_requests')
      .select(
        `
        renter_id,
        primary_resort:resorts!booking_requests_primary_resort_id_fkey(name, slug, calculator_code),
        confirmed_resort:resorts!booking_requests_confirmed_resort_id_fkey(name, slug, calculator_code)
      `,
      )
      .eq('id', bookingRequestId)
      .maybeSingle();

    resortRecord = (bookingRequest?.confirmed_resort ?? bookingRequest?.primary_resort ?? null) as ResortRecord | null;

    if (bookingRequest?.renter_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('guest_rewards_enrolled_at')
        .eq('id', bookingRequest.renter_id)
        .maybeSingle();
      guestProfile = profile ?? null;
    }
  }

  const resortName = resortRecord?.name ?? summary.resortName ?? snapshot.resortName ?? 'Pixie DVC';
  const resortCode = resortRecord?.calculator_code ?? summary.resortCode ?? undefined;
  const resortSlug = resortRecord?.slug ?? summary.resortSlug ?? undefined;
  const bannerImage = resolveResortImage({
    resortCode: resortCode ?? undefined,
    resortSlug: resortSlug ?? undefined,
    imageIndex: 1,
  }).url;

  let confirmationNumber = snapshot.confirmationNumber ?? summary.reservationNumber ?? null;

  if (!confirmationNumber && contract.booking_request_id) {
    const { data: match } = await supabase
      .from('booking_matches')
      .select('id')
      .eq('booking_id', contract.booking_request_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (match?.id) {
      const { data: rental } = await supabase
        .from('rentals')
        .select('disney_confirmation_number, dvc_confirmation_number')
        .eq('match_id', match.id)
        .maybeSingle();

      confirmationNumber =
        rental?.disney_confirmation_number ??
        rental?.dvc_confirmation_number ??
        confirmationNumber;
    }
  }

  const { data: activePromotion } = await getActivePromotion({ adminClient: supabase });
  const promotionActive = Boolean(activePromotion);
  const showEnrollPrompt = promotionActive && !guestProfile?.guest_rewards_enrolled_at;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1b3a] via-[#0d2148] to-[#0b1b3a] px-6 py-16">
      <div className="mx-auto flex w-full max-w-[820px] flex-col">
        <div className="relative h-[180px] w-full overflow-hidden rounded-t-2xl sm:h-[200px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bannerImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1b3a]/15 via-[#0b1b3a]/35 to-[#0b1b3a]/60" />
        </div>

        <div className="w-full rounded-b-2xl border border-white/10 bg-white px-10 py-12 text-[#0b1b3a] shadow-[0_30px_80px_rgba(2,6,23,0.35)]">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-[#0b1b3a]/70">
            PixieDVC
          </p>
          <AnimatedHeading>Congratulations</AnimatedHeading>
          <p className="mt-3 text-center text-sm text-[#0b1b3a]/70">
            Your Disney Vacation Club stay is officially confirmed.
          </p>
          <p className="mt-2 text-center text-sm text-[#0b1b3a]/80">
            You&apos;ll soon be staying at <span className="font-semibold text-[#0b1b3a]">{resortName}</span>.
          </p>

          <div className="mt-10 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-[#0b1b3a]/55">
              Disney confirmation
            </p>
            <p className="mt-2 text-4xl font-semibold tabular-nums text-[#0b1b3a]">
              {formatConfirmation(confirmationNumber)}
            </p>
          </div>

          <div className="mt-8 h-px w-full bg-[#0b1b3a]/10" />

          <p className="mt-6 text-center text-sm text-[#0b1b3a]/70">
            Next, we’ll guide you through check-in details and trip planning.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href={myTripHref}
              className="inline-flex items-center justify-center bg-[#0b1b3a] px-8 py-3 text-sm font-semibold text-white no-underline transition hover:bg-[#0f2553] hover:text-white"
              style={{ color: '#ffffff' }}
            >
              Go to My Trip
            </Link>
            {readyStayBooking ? (
              readyStayTransfer?.status === 'transferred' ? (
                <>
                  <p className="text-sm text-[#0b1b3a]/80">
                    Reservation transferred successfully. Disney confirmation:{' '}
                    <span className="font-semibold text-[#0b1b3a]">
                      {formatConfirmation(readyStayTransfer.disney_confirmation_number)}
                    </span>
                  </p>
                  <Link
                    href="/guides/link-to-disney-experience"
                    className="text-sm font-semibold text-[#0b1b3a] underline underline-offset-4 hover:text-[#0b1b3a]"
                  >
                    Link in My Disney Experience
                  </Link>
                </>
              ) : (
                <p className="text-sm text-[#0b1b3a]/70">
                  We’re waiting for the owner to transfer your reservation. You’ll see My Disney linking details once
                  transfer is confirmed.
                </p>
              )
            ) : (
              <Link
                href="/guides/link-to-disney-experience"
                className="text-sm font-semibold text-[#0b1b3a] underline underline-offset-4 hover:text-[#0b1b3a]"
              >
                Link in My Disney Experience
              </Link>
            )}
          </div>

          {showEnrollPrompt ? (
            <div className="mt-8 rounded-2xl border border-[#0b1b3a]/15 bg-[#0b1b3a]/5 px-6 py-4 text-center">
              <p className="text-sm font-semibold text-[#0b1b3a]">
                You’re eligible — enroll now to activate Pixie Perks.
              </p>
              <p className="mt-1 text-xs text-[#0b1b3a]/70">
                Enrollment may close for new participants; existing members keep benefits.
              </p>
              <div className="mt-3 flex justify-center">
                <GuestEnrollButton />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
