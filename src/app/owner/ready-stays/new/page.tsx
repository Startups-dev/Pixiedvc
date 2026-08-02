import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card, Button } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";
import OwnerReadyStayPublishForm from "@/components/owner/OwnerReadyStayPublishForm";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import OwnerRecordStatusBadge from "@/components/owner/shared/OwnerRecordStatusBadge";

export default async function ReadyStayNewPage({
  searchParams,
}: {
  searchParams: { rentalId?: string };
}) {
  const cookieStore = await cookies();
  const { user } = await requireOwnerAccess("/owner/ready-stays/new", cookieStore);
  const supabase = await createSupabaseServerClient();

  const rentalId = searchParams.rentalId ?? null;

  if (!rentalId) {
    redirect("/owner/ready-stays?notice=select");
  }

  const { data: rental } = await supabase
    .from("rentals")
    .select("id, owner_user_id, resort_id, resort_code, check_in, check_out, points_required, party_size, room_type, match_id")
    .eq("id", rentalId)
    .maybeSingle();

  if (!rental || rental.owner_user_id !== user.id) {
    return (
      <div className="space-y-6">
        <OwnerPageHeader
          eyebrow="Ready Stays"
          title="List a Ready Stay"
          description="This reservation is not accessible from your owner account."
        />
        <Button asChild>
          <Link href="/owner/ready-stays">Back to Ready Stays</Link>
        </Button>
      </div>
    );
  }

  const { data: existingReadyStay } = await supabase
    .from("ready_stays")
    .select("id")
    .eq("rental_id", rental.id)
    .maybeSingle();

  const ineligibleReasons: string[] = [];
  if (rental.match_id) {
    ineligibleReasons.push("This reservation is tied to a guest request.");
  }

  if (existingReadyStay) {
    ineligibleReasons.push("This reservation is already listed.");
  }

  const { data: resort } = await supabase
    .from("resorts")
    .select("name")
    .eq("id", rental.resort_id ?? "")
    .maybeSingle();

  const { data: milestones } = await supabase
    .from("rental_milestones")
    .select("code, status")
    .eq("rental_id", rental.id);

  const { data: reservationProof } = await supabase
    .from("rental_documents")
    .select("id")
    .eq("rental_id", rental.id)
    .eq("type", "disney_confirmation_email")
    .limit(1)
    .maybeSingle();

  const confirmationReady = (milestones ?? []).some(
    (item) => item.code === "disney_confirmation_uploaded" && item.status === "completed",
  );
  if (!confirmationReady) {
    ineligibleReasons.push("Disney confirmation has not been uploaded yet.");
  }

  return (
    <div className="max-w-4xl space-y-6">
      <OwnerPageHeader
        eyebrow="Ready Stays"
        title="List a Ready Stay"
        description="Turn your private confirmed reservation into a publicly bookable Ready Stay."
        summary={confirmationReady ? "Confirmation ready" : "Confirmation needed"}
      />

      <Card className="space-y-3 rounded-[18px] border border-[#E7E7E4] bg-white p-5 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A8495]">Reservation details</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-[#10224A]">{resort?.name ?? rental.resort_code ?? "Resort"}</p>
          {confirmationReady ? (
            <OwnerRecordStatusBadge label="Confirmed" tone="success" />
          ) : null}
        </div>
        <div className="grid gap-3 text-sm text-[#667085] md:grid-cols-2">
          <p>
            <span className="font-semibold text-[#10224A]">Dates:</span> {rental.check_in} to {rental.check_out}
          </p>
          <p>
            <span className="font-semibold text-[#10224A]">Room type:</span> {rental.room_type ?? "Pending"}
          </p>
          <p>
            <span className="font-semibold text-[#10224A]">Points:</span> {rental.points_required ?? 0}
          </p>
          <p>
            <span className="font-semibold text-[#10224A]">Sleeps:</span> {rental.party_size ?? "Unavailable"}
          </p>
        </div>
      </Card>

      {ineligibleReasons.length ? (
        <Card className="space-y-3 rounded-[18px] border border-[#E8D6A8] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6B2E]">Not eligible yet</p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-[#8B6B2E]">
            {ineligibleReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <Button asChild variant="ghost">
            <Link href="/owner/ready-stays">Back to Ready Stays</Link>
          </Button>
        </Card>
      ) : (
        <OwnerReadyStayPublishForm
          rental={{
            id: rental.id,
            resort_id: rental.resort_id ?? null,
            resort_name: resort?.name ?? null,
            check_in: rental.check_in,
            check_out: rental.check_out,
            points_required: rental.points_required ?? 0,
            room_type: rental.room_type ?? null,
          }}
          confirmationReady={confirmationReady}
          hasExistingReservationProof={Boolean(reservationProof?.id)}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="ghost">
          <Link href={`/owner/rentals/${rental.id}`}>Back to reservation</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/owner/dashboard?tab=listings">Back to listings</Link>
        </Button>
      </div>
    </div>
  );
}
