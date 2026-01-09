import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { calculatePayoutAmountCents, getPayoutStageForMilestone } from "@/lib/owner-portal";

export async function POST(request: Request, { params }: { params: { rentalId: string } }) {
  const cookieStore = await cookies();
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { code, status, occurred_at } = payload ?? {};

  if (!code || !status) {
    return NextResponse.json({ error: "Missing milestone details" }, { status: 400 });
  }

  const { rentalId } = params;
  const client = getSupabaseAdminClient() ?? authClient;

  const { data: rental } = await client
    .from("rentals")
    .select("id, owner_user_id, rental_amount_cents")
    .eq("id", rentalId)
    .maybeSingle();

  if (!rental) {
    return NextResponse.json({ error: "Rental not found" }, { status: 404 });
  }

  const { error } = await client
    .from("rental_milestones")
    .upsert({
      rental_id: rentalId,
      code,
      status,
      occurred_at: occurred_at ?? new Date().toISOString(),
    })
    .eq("rental_id", rentalId)
    .eq("code", code);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (status === "completed") {
    const stage = getPayoutStageForMilestone(code);
    if (stage) {
      const amountCents = calculatePayoutAmountCents(rental.rental_amount_cents, stage);
      await client
        .from("payout_ledger")
        .upsert({
          rental_id: rentalId,
          owner_user_id: rental.owner_user_id,
          stage,
          amount_cents: amountCents,
          status: "eligible",
          eligible_at: new Date().toISOString(),
        })
        .eq("rental_id", rentalId)
        .eq("stage", stage);

      if (stage === 30) {
        await client
          .from("notifications")
          .insert({
            user_id: rental.owner_user_id,
            type: "final_payout_eligible",
            title: "Final payout now eligible",
            body: "Check-out is complete. Your final payout is now eligible for release.",
            link: "/owner/payouts",
          });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
