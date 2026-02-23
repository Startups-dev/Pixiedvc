import { redirect } from "next/navigation";
import crypto from "crypto";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
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
  booking_request_id: string | null;
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
      "id, status, owner_id, rental_id, resort_id, check_in, check_out, points, room_type, guest_price_per_point_cents, locked_until, lock_session_id, booking_request_id",
    )
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (!stay) {
    redirect("/ready-stays");
  }

  const now = new Date();
  const lockedUntil = stay.locked_until ? new Date(stay.locked_until) : null;
  const lockMatches = Boolean(searchParams?.lock && searchParams.lock === stay.lock_session_id);

  if (lockedUntil && lockedUntil > now && stay.lock_session_id) {
    if (lockMatches) {
      const { data: existingBooking } = await adminClient
        .from("booking_requests")
        .select("id, renter_id")
        .eq("id", stay.lock_session_id)
        .maybeSingle();
      if (existingBooking?.id && existingBooking.renter_id === user.id) {
        redirect(`/ready-stays/${params.id}/book/package?lock=${encodeURIComponent(existingBooking.id)}`);
      }
    }
    if (!lockMatches) {
      if (stay.booking_request_id) {
        const { data: linkedBooking } = await adminClient
          .from("booking_requests")
          .select("id, renter_id")
          .eq("id", stay.booking_request_id)
          .maybeSingle();
        if (linkedBooking?.id && linkedBooking.renter_id === user.id) {
          redirect(`/ready-stays/${params.id}/book/package?lock=${encodeURIComponent(linkedBooking.id)}`);
        }
      }
      const { data: lockBooking } = await adminClient
        .from("booking_requests")
        .select("id, renter_id")
        .eq("id", stay.lock_session_id)
        .maybeSingle();
      if (lockBooking?.id && lockBooking.renter_id === user.id) {
        redirect(`/ready-stays/${params.id}/book?lock=${encodeURIComponent(stay.lock_session_id)}`);
      }
      if (!lockBooking?.id) {
        await adminClient
          .from("ready_stays")
          .update({ locked_until: null, lock_session_id: null })
          .eq("id", stay.id)
          .eq("lock_session_id", stay.lock_session_id);
        redirect(`/ready-stays/${params.id}/book`);
      }
      return (
        <main className="mx-auto max-w-2xl px-6 py-12">
          <Card className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
            This stay is currently being reserved by another guest. Please try again shortly.
          </Card>
        </main>
      );
    }
  }

  let lockSessionId = stay.lock_session_id;

  if (!lockMatches) {
    lockSessionId = crypto.randomUUID();
    const lockUntil = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    const lockUpdatePayload = {
      locked_until: lockUntil,
      lock_session_id: lockSessionId,
    };

    const { data: unlockedStay, error: unlockedError } = await adminClient
      .from("ready_stays")
      .update(lockUpdatePayload)
      .eq("id", stay.id)
      .eq("status", "active")
      .is("locked_until", null)
      .select("id")
      .maybeSingle();

    if (unlockedError) {
      console.error("[ready-stays/book] lock update (null lock) failed", {
        ready_stay_id: stay.id,
        message: unlockedError.message,
        code: unlockedError.code,
        details: unlockedError.details,
        hint: unlockedError.hint,
      });
    }

    let lockedStay = unlockedStay;
    if (!lockedStay) {
      const { data: expiredStay, error: expiredError } = await adminClient
        .from("ready_stays")
        .update(lockUpdatePayload)
        .eq("id", stay.id)
        .eq("status", "active")
        .lt("locked_until", now.toISOString())
        .select("id")
        .maybeSingle();

      if (expiredError) {
        console.error("[ready-stays/book] lock update (expired lock) failed", {
          ready_stay_id: stay.id,
          message: expiredError.message,
          code: expiredError.code,
          details: expiredError.details,
          hint: expiredError.hint,
        });
      }

      lockedStay = expiredStay;
    }

    if (!lockedStay) {
      return (
        <main className="mx-auto max-w-2xl px-6 py-12">
          <Card className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
            This stay is currently being reserved by another guest. Please try again shortly.
          </Card>
        </main>
      );
    }
  }

  if (!searchParams?.lock || searchParams.lock !== lockSessionId) {
    redirect(`/ready-stays/${params.id}/book?lock=${encodeURIComponent(lockSessionId)}`);
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name, email, phone, address_line1, address_line2, city, region, postal_code, country")
    .eq("id", user.id)
    .maybeSingle();

  const guestTotalCents = stay.guest_price_per_point_cents * stay.points;

  const { data: existingBookingRequest } = await adminClient
    .from("booking_requests")
    .select("id")
    .eq("id", lockSessionId)
    .eq("renter_id", user.id)
    .maybeSingle();

  let bookingError: { message?: string; code?: string; details?: string; hint?: string } | null = null;
  if (!existingBookingRequest?.id) {
    const bookingInsert = await adminClient.from("booking_requests").insert({
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
    bookingError = bookingInsert.error;

    if (bookingInsert.error?.code === "23505") {
      const { data: existingActiveBooking } = await adminClient
        .from("booking_requests")
        .select("id")
        .eq("renter_id", user.id)
        .eq("primary_resort_id", stay.resort_id)
        .eq("check_in", stay.check_in)
        .eq("check_out", stay.check_out)
        .eq("total_points", stay.points)
        .eq("primary_room", stay.room_type)
        .in("status", ["draft", "submitted", "pending_match", "pending_owner"])
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (existingActiveBooking?.id) {
        lockSessionId = existingActiveBooking.id;
        bookingError = null;
        const lockRefreshUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await adminClient
          .from("ready_stays")
          .update({ lock_session_id: lockSessionId, locked_until: lockRefreshUntil })
          .eq("id", stay.id);
      }
    }
  }

  const bookingId = lockSessionId;

  if (bookingError) {
    const rawError = bookingError as unknown as Record<string, unknown>;
    console.error("[ready-stays/book] booking request insert failed", {
      ready_stay_id: stay.id,
      booking_request_id: bookingId,
      renter_id: user.id,
      raw: rawError,
      raw_json: JSON.stringify(rawError),
      as_string: String(bookingError),
      message: bookingError.message,
      code: bookingError.code,
      details: bookingError.details,
      hint: bookingError.hint,
    });
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

  await adminClient
    .from("ready_stays")
    .update({
      booking_request_id: bookingId,
      lock_session_id: bookingId,
      locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", stay.id)
    .eq("status", "active");

  if (!searchParams?.lock || searchParams.lock !== bookingId) {
    redirect(`/ready-stays/${params.id}/book?lock=${encodeURIComponent(bookingId)}`);
  }

  redirect(`/ready-stays/${params.id}/book/package?lock=${encodeURIComponent(bookingId)}`);
}
