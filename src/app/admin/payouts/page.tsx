import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import PayoutsClient from "./PayoutsClient";

type RentalRow = {
  id: string;
  check_in: string | null;
  check_out: string | null;
  resort_code: string | null;
  booking_package: Record<string, unknown> | null;
  owner_user_id: string | null;
};

type PayoutRow = {
  id: string;
  rental_id: string;
  owner_user_id: string | null;
  stage: number | null;
  amount_cents: number | null;
  status: string | null;
  eligible_at: string | null;
  released_at: string | null;
  created_at: string | null;
  rentals?: RentalRow | null;
};

export default async function AdminPayoutsPage() {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!emailIsAllowedForAdmin(user.email ?? null)) {
    redirect("/");
  }

  const adminClient = getSupabaseAdminClient() ?? authClient;

  const { data: payouts } = await adminClient
    .from("payout_ledger")
    .select(
      `
      id,
      rental_id,
      owner_user_id,
      stage,
      amount_cents,
      status,
      eligible_at,
      released_at,
      created_at,
      rentals:rentals!payout_ledger_rental_id_fkey(
        id,
        check_in,
        check_out,
        resort_code,
        booking_package,
        owner_user_id
      )
    `,
    )
    .in("status", ["eligible", "pending"])
    .order("eligible_at", { ascending: true })
    .order("created_at", { ascending: true });

  const rows = (payouts as PayoutRow[]) ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Payout Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manual releases for 70% and 30% owner payouts.
        </p>
      </div>

      <PayoutsClient initialRows={rows} />
    </main>
  );
}
