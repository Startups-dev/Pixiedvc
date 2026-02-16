import { redirect } from "next/navigation";
import crypto from "crypto";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { ensureGuestAgreementForBooking } from "@/server/contracts";
import { Card } from "@pixiedvc/design-system";

type ReadyStayRow = {
  id: string;
  status: string;
  owner_id: string;
  rental_id: string;
  resort_id: string;
  check_in: string;
  check_out: string;
  points: number;
  room_type: string;
  guest_price_per_point_cents: number;
  locked_until: string | null;
  lock_session_id: string | null;
};

type ContractSnapshot = Record<string, unknown> & {
  metadata?: Record<string, unknown>;
};

export default async function ReadyStayBookPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { lock?: string };
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/ready-stays/${params.id}/book`);
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Card className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
          Booking is temporarily unavailable. Please try again shortly.
        </Card>
      </main>
    );
  }

  const { data: stay } = await adminClient
    .from("ready_stays")
    .select(
      "id, status, owner_id, rental_id, resort_id, check_in, check_out, points, room_type, guest_price_per_point_cents, locked_until, lock_session_id",
    )
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (!stay) {
    redirect("/ready-stays");
  }

  const now = new Date();
  const lockedUntil = stay.locked_until ? new Date(stay.locked_until) : null;
  if (lockedUntil && lockedUntil > now && stay.lock_session_id) {
    const lockMatches = searchParams?.lock && searchParams.lock === stay.lock_session_id;
    if (lockMatches) {
      const { data: existingContract } = await adminClient
        .from("contracts")
        .select("guest_accept_token")
        .eq("booking_request_id", stay.lock_session_id)
        .maybeSingle();
      if (existingContract?.guest_accept_token) {
        redirect(`/contracts/${existingContract.guest_accept_token}`);
      }
    }
    if (!lockMatches) {
      return (
        <main className="mx-auto max-w-2xl px-6 py-12">
          <Card className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
            This stay is currently being reserved by another guest. Please try again shortly.
          </Card>
        </main>
      );
    }
  }

  const lockSessionId = crypto.randomUUID();
  const lockUntil = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

  const { data: lockedStay } = await adminClient
    .from("ready_stays")
    .update({
      locked_until: lockUntil,
      lock_session_id: lockSessionId,
    })
    .eq("id", stay.id)
    .eq("status", "active")
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select("id")
    .maybeSingle();

  if (!lockedStay) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Card className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
          This stay is currently being reserved by another guest. Please try again shortly.
        </Card>
      </main>
    );
  }

  if (!searchParams?.lock || searchParams.lock !== lockSessionId) {
    redirect(`/ready-stays/${params.id}/book?lock=${encodeURIComponent(lockSessionId)}`);
  }

  let { data: ownerRecord } = await adminClient
    .from("owners")
    .select("id, user_id")
    .eq("id", stay.owner_id)
    .maybeSingle();

  if (!ownerRecord) {
    const { data: fallbackOwnerRecord } = await adminClient
      .from("owners")
      .select("id, user_id")
      .eq("user_id", stay.owner_id)
      .maybeSingle();
    ownerRecord = fallbackOwnerRecord ?? null;
  }

  if (!ownerRecord) {
    await adminClient
      .from("ready_stays")
      .update({ locked_until: null, lock_session_id: null })
      .eq("id", stay.id);
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Card className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
          Unable to start booking for this stay. Please contact support.
        </Card>
      </main>
    );
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, email, phone, address_line1, address_line2, city, region, postal_code, country")
    .eq("id", user.id)
    .maybeSingle();

  const guestTotalCents = stay.guest_price_per_point_cents * stay.points;

  const { error: bookingError } = await adminClient.from("booking_requests").insert({
    id: lockSessionId,
    renter_id: user.id,
    primary_resort_id: stay.resort_id,
    check_in: stay.check_in,
    check_out: stay.check_out,
    total_points: stay.points,
    primary_room: stay.room_type,
    guest_total_cents: guestTotalCents,
    guest_rate_per_point_cents: stay.guest_price_per_point_cents,
    lead_guest_name: profile?.full_name ?? null,
    lead_guest_email: profile?.email ?? null,
    lead_guest_phone: profile?.phone ?? null,
    address_line1: profile?.address_line1 ?? null,
    address_line2: profile?.address_line2 ?? null,
    city: profile?.city ?? null,
    state: profile?.region ?? null,
    postal_code: profile?.postal_code ?? null,
    country: profile?.country ?? null,
    status: "submitted",
  });

  if (bookingError) {
    await adminClient
      .from("ready_stays")
      .update({ locked_until: null, lock_session_id: null })
      .eq("id", stay.id);
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Card className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
          Booking could not be started. Please try again.
        </Card>
      </main>
    );
  }

  const contract = await ensureGuestAgreementForBooking({
    supabase: adminClient,
    ownerId: ownerRecord.id,
    bookingRequestId: lockSessionId,
    rentalId: stay.rental_id,
  });

  if (!contract?.guestAcceptToken) {
    await adminClient
      .from("ready_stays")
      .update({ locked_until: null, lock_session_id: null })
      .eq("id", stay.id);
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Card className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
          Agreement could not be created. Please try again.
        </Card>
      </main>
    );
  }

  if (contract.contractId) {
    const { data: existingContract } = await adminClient
      .from("contracts")
      .select("snapshot")
      .eq("id", contract.contractId)
      .maybeSingle();

    const snapshot = ((existingContract?.snapshot as ContractSnapshot | null) ?? {}) as ContractSnapshot;
    const currentMetadata = (snapshot.metadata ?? {}) as Record<string, unknown>;
    await adminClient
      .from("contracts")
      .update({
        snapshot: {
          ...snapshot,
          metadata: {
            ...currentMetadata,
            ready_stay: true,
          },
        },
      })
      .eq("id", contract.contractId);
  }

  redirect(`/contracts/${contract.guestAcceptToken}`);
}
