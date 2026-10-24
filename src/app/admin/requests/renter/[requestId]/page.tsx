import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminUser } from "@/lib/admin";
import { validRenterRequestId } from "@/lib/admin-reservation-alerts";
import { createServiceClient } from "@/lib/supabase-service-client";
import AdminReservationAlertRead from "../../AdminReservationAlertRead";
import RenterRequestReviewClient from "./RenterRequestReviewClient";

export const dynamic = "force-dynamic";

export default async function RenterRequestReview({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  await requireAdminUser(`/admin/requests/renter/${requestId}`);
  if (!validRenterRequestId(requestId)) notFound();
  const db = createServiceClient();
  const { data: request } = await db.from("renter_requests")
    .select("id, status, check_in, check_out, room_type, adults, children, max_price_per_point, availability_status, availability_checked_at, resort:resorts(name)")
    .eq("id", requestId).maybeSingle();

  if (!request) return <div className="mx-auto max-w-3xl p-8 text-white"><h1 className="text-2xl">Request not found</h1></div>;

  const resort = Array.isArray(request.resort) ? request.resort[0] : request.resort;
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10 text-slate-100">
      <AdminReservationAlertRead requestId={requestId} source="renter" />
      <Link href="/admin/requests" className="text-sm text-amber-200 hover:underline">Back to requests</Link>
      <header>
        <h1 className="text-2xl font-semibold">Reservation request review</h1>
        <p className="mt-2 text-sm text-slate-300">Check the requested dates and room before making an availability decision. This request is not a confirmed booking.</p>
      </header>
      <section id="availability-review" className="scroll-mt-20 rounded-xl border border-slate-700 bg-[#20232a] p-5">
        <h2 className="font-semibold">Date and availability validation</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-400">Check-in</dt><dd>{request.check_in ?? "—"}</dd></div>
          <div><dt className="text-slate-400">Check-out</dt><dd>{request.check_out ?? "—"}</dd></div>
          <div><dt className="text-slate-400">Resort</dt><dd>{resort?.name ?? "Any resort"}</dd></div>
          <div><dt className="text-slate-400">Room</dt><dd>{request.room_type ?? "—"}</dd></div>
          <div><dt className="text-slate-400">Party</dt><dd>{request.adults ?? 0} adults · {request.children ?? 0} children</dd></div>
          <div><dt className="text-slate-400">Max price per point</dt><dd>{request.max_price_per_point == null ? "—" : `$${Number(request.max_price_per_point).toFixed(2)}`}</dd></div>
        </dl>
        <RenterRequestReviewClient requestId={requestId} status={request.availability_status ?? "unreviewed"} />
      </section>
    </div>
  );
}
