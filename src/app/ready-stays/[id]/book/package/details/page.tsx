import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getCanonicalResorts } from "@/lib/resorts/getResorts";
import BookingFlowMountedClient from "./BookingFlowMountedClient";

type PageProps = {
  params: { id: string };
  searchParams?: { lock?: string };
};

function formatVillaType(room?: string | null) {
  if (!room) return "Villa";
  return room;
}

export default async function ReadyStayPackageDetailsPage({ params, searchParams }: PageProps) {
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
    .select(
      "id, status, booking_request_id, lock_session_id, resort_id, check_in, check_out, points, room_type, guest_price_per_point_cents, resorts(name, calculator_code)",
    )
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (!stay) {
    redirect(`/ready-stays/${params.id}/book`);
  }

  const bookingIdCandidate = lockId || stay.booking_request_id || stay.lock_session_id || "";
  const { data: bookingRequest } = await adminClient
    .from("booking_requests")
    .select(
      "id, renter_id, check_in, check_out, total_points, primary_room, guest_total_cents",
    )
    .eq("id", bookingIdCandidate)
    .eq("renter_id", user.id)
    .maybeSingle();

  if (!bookingRequest) {
    redirect(`/ready-stays/${params.id}/book`);
  }

  const calculatorCode = stay.resorts?.calculator_code as string | undefined;
  const resortName = (stay.resorts?.name as string | undefined) ?? "DVC Resort";
  const prefill = {
    resortId: calculatorCode ?? stay.resort_id,
    resortName,
    villaType: formatVillaType(bookingRequest.primary_room ?? stay.room_type),
    checkIn: bookingRequest.check_in ?? stay.check_in ?? "",
    checkOut: bookingRequest.check_out ?? stay.check_out ?? "",
    points: Number(bookingRequest.total_points ?? stay.points ?? 0),
    estCash: Number(
      bookingRequest.guest_total_cents != null
        ? Number(bookingRequest.guest_total_cents) / 100
        : ((stay.guest_price_per_point_cents ?? 0) * (stay.points ?? 0)) / 100,
    ),
  };

  const resorts = await getCanonicalResorts(supabase, {
    select: "id, name, slug",
  });

  return (
    <div className="min-h-screen bg-surface text-ink">
      <main className="mx-auto max-w-5xl px-6 py-20">
        <BookingFlowMountedClient
          prefill={prefill}
          resorts={resorts}
          readyStayId={params.id}
          bookingId={bookingRequest.id}
        />
      </main>
    </div>
  );
}
