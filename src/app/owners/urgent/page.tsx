import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import PrivateInventoryForm from "@/components/PrivateInventoryForm";

export const dynamic = "force-dynamic";

type SubmissionRow = {
  id: string;
  created_at: string;
  status: string;
  urgency_window: string;
  points_available: number;
  points_expiry_date: string | null;
  home_resort: string | null;
  resorts_allowed: string[] | null;
  already_booked: boolean;
  fastest_possible: boolean;
  min_net_to_owner_usd: number | null;
};

export default async function OwnerUrgentPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owners/urgent");
  }

  const { data: ownerRow } = await supabase
    .from("owners")
    .select("verification")
    .eq("id", user.id)
    .maybeSingle();

  const verification = ownerRow?.verification ?? "not_started";
  if (verification !== "verified") {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Urgent Placement</p>
          <h1 className="text-2xl font-semibold text-slate-900">Verify ownership to submit</h1>
          <p className="text-sm text-slate-600">
            Urgent placement inventory is reserved for verified owners. Complete verification first, then return to
            submit urgent points.
          </p>
        </header>
        <Link
          href="/owners/verify"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Verify ownership
        </Link>
      </main>
    );
  }

  const { data: submissions } = await supabase
    .from("private_inventory")
    .select(
      "id, created_at, status, urgency_window, points_available, points_expiry_date, home_resort, resorts_allowed, already_booked, fastest_possible, min_net_to_owner_usd",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Urgent Placement</p>
        <h1 className="text-3xl font-semibold text-slate-900">Private placement request</h1>
        <p className="text-sm text-slate-600">
          Share urgent points or confirmed reservations for private placement. Listings are only visible to PixieDVC
          staff.
        </p>
      </header>

      <PrivateInventoryForm ownerId={user.id} initialSubmissions={(submissions ?? []) as SubmissionRow[]} />
    </main>
  );
}
