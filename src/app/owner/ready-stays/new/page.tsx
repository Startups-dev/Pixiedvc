import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card, Button } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import OwnerReadyStayPublishForm from "@/components/owner/OwnerReadyStayPublishForm";

export default async function ReadyStayNewPage({
  searchParams,
}: {
  searchParams: { rentalId?: string };
}) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/ready-stays/new");
  }

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
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Ready stays</p>
          <h1 className="text-3xl font-semibold text-ink">List a Ready Stay</h1>
          <p className="text-sm text-muted">This reservation isn’t accessible.</p>
        </header>
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

  const confirmationReady = (milestones ?? []).some(
    (item) => item.code === "disney_confirmation_uploaded" && item.status === "completed",
  );
  if (!confirmationReady) {
    ineligibleReasons.push("Disney confirmation has not been uploaded yet.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Ready stays</p>
        <h1 className="text-3xl font-semibold text-ink">List a Ready Stay</h1>
        <p className="text-sm text-muted">
          Turn your private confirmed reservation into a publicly bookable Ready Stay.
        </p>
      </header>

      <Card className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Reservation details</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-ink">{resort?.name ?? rental.resort_code ?? "Resort"}</p>
          {confirmationReady ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              Confirmed
            </span>
          ) : null}
        </div>
        <div className="grid gap-2 text-sm text-muted md:grid-cols-2">
          <p>
            <span className="font-semibold text-ink">Dates:</span> {rental.check_in} → {rental.check_out}
          </p>
          <p>
            <span className="font-semibold text-ink">Room type:</span> {rental.room_type ?? "Pending"}
          </p>
          <p>
            <span className="font-semibold text-ink">Points:</span> {rental.points_required ?? 0}
          </p>
          <p>
            <span className="font-semibold text-ink">Sleeps:</span> {rental.party_size ?? "—"}
          </p>
        </div>
      </Card>

      {ineligibleReasons.length ? (
        <Card className="space-y-3 border border-amber-200 bg-amber-50/60">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-700">Not eligible yet</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
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
