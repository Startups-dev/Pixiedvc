import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type ReadyStayPackagePageProps = {
  params: { id: string };
  searchParams?: { lock?: string };
};

function calculateNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}

export default async function ReadyStayPackagePage({
  params,
  searchParams,
}: ReadyStayPackagePageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/ready-stays/${params.id}/book`);
  }

  const lockId = searchParams?.lock ?? "";

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    redirect(`/ready-stays/${params.id}/book`);
  }

  const { data: stay } = await adminClient
    .from("ready_stays")
    .select("id, status, owner_id, rental_id, booking_request_id, lock_session_id")
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (!stay) {
    redirect(`/ready-stays/${params.id}/book`);
  }

  const bookingIdCandidate = lockId || stay.booking_request_id || stay.lock_session_id || "";
  let { data: bookingRequest } = await adminClient
    .from("booking_requests")
    .select(
      "id, renter_id, check_in, check_out, primary_resort_id, primary_room, requires_accessibility, total_points, guest_rate_per_point_cents, guest_total_cents, adults, youths",
    )
    .eq("id", bookingIdCandidate)
    .eq("renter_id", user.id)
    .maybeSingle();

  if (!bookingRequest && stay.lock_session_id && stay.lock_session_id !== bookingIdCandidate) {
    const { data: fallbackBooking } = await adminClient
      .from("booking_requests")
      .select(
        "id, renter_id, check_in, check_out, primary_resort_id, primary_room, requires_accessibility, total_points, guest_rate_per_point_cents, guest_total_cents, adults, youths",
      )
      .eq("id", stay.lock_session_id)
      .eq("renter_id", user.id)
      .maybeSingle();
    bookingRequest = fallbackBooking ?? null;
  }

  if (!bookingRequest) {
    redirect(`/ready-stays/${params.id}/book`);
  }

  const { data: resort } = await adminClient
    .from("resorts")
    .select("name")
    .eq("id", bookingRequest.primary_resort_id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Ready Stays booking</p>
            <h2 className="font-display text-3xl text-ink">1 / 3 — Package details</h2>
          </div>
        </div>
        <div className="mt-4 h-1 rounded-full bg-slate-100">
          <div className="h-full w-1/3 rounded-full bg-brand transition-all" />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ready Stays</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Booking package details</h1>
        <p className="mt-1 text-sm text-slate-600">Review this reserved stay before continuing to agreement.</p>
      </div>
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={`/ready-stays/${params.id}/book/package/details`} method="get" className="space-y-6">
          <input type="hidden" name="lock" value={bookingRequest.id} />

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resort</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{resort?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Room type</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{bookingRequest.primary_room ?? "—"}</p>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Check-in date</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{bookingRequest.check_in ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Check-out date</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{bookingRequest.check_out ?? "—"}</p>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Price per point</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {typeof bookingRequest.guest_rate_per_point_cents === "number"
                  ? `$${(bookingRequest.guest_rate_per_point_cents / 100).toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Number of points</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {typeof bookingRequest.total_points === "number" ? bookingRequest.total_points : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total for stay</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {typeof bookingRequest.guest_total_cents === "number"
                  ? `$${(bookingRequest.guest_total_cents / 100).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="text-sm font-medium text-slate-700">
              <legend className="mb-2">Do you require wheelchair accessibility?</legend>
              <div className="flex gap-3">
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="requiresAccessibility"
                    value="yes"
                    defaultChecked={Boolean(bookingRequest.requires_accessibility)}
                  />
                  Yes
                </label>
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="requiresAccessibility"
                    value="no"
                    defaultChecked={!bookingRequest.requires_accessibility}
                  />
                  No
                </label>
              </div>
            </fieldset>
            <div />
          </div>

          <div className="flex items-center justify-end gap-3 text-sm text-slate-500">
            <button className="rounded-full border border-slate-200 px-4 py-2" type="button" disabled>
              Previous
            </button>
            <button type="submit" className="rounded-full bg-emerald-600 px-5 py-2 font-semibold text-white">
              Save step 1
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
