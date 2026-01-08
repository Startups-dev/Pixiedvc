import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";

import PrivateInventoryTable from "@/components/admin/PrivateInventoryTable";

export const dynamic = "force-dynamic";

type PrivateInventoryRow = {
  id: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  urgency_window: string;
  points_expiry_date: string | null;
  use_year: string | null;
  points_available: number;
  home_resort: string | null;
  resorts_allowed: string[] | null;
  travel_date_flexibility: string | null;
  already_booked: boolean;
  existing_confirmation_number: string | null;
  existing_reservation_details: Record<string, unknown> | null;
  min_net_to_owner_usd: number | null;
  fastest_possible: boolean;
  status: string;
  internal_notes: string | null;
  assigned_to: string | null;
  offered_to_guest_email: string | null;
  hold_until: string | null;
  closed_reason: string | null;
};

export default async function PrivateInventoryAdminPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent("/admin/private-inventory")}`);
  }

  const { data: profileRow } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profileRow?.role ?? null;
  const isStaffRole = role === "staff" || role === "admin";
  const isAllowed = emailIsAllowedForAdmin(user.email) || isStaffRole;

  if (!isAllowed) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-slate-900">403</h1>
        <p className="mt-2 text-sm text-slate-600">You do not have access to private inventory.</p>
      </main>
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const client = supabaseAdmin ?? supabase;

  const { data, error } = await client
    .from("private_inventory")
    .select(
      "id, created_at, updated_at, owner_id, urgency_window, points_expiry_date, use_year, points_available, home_resort, resorts_allowed, travel_date_flexibility, already_booked, existing_confirmation_number, existing_reservation_details, min_net_to_owner_usd, fastest_possible, status, internal_notes, assigned_to, offered_to_guest_email, hold_until, closed_reason",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm text-slate-600">Unable to load private inventory.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
        <h1 className="text-3xl font-semibold text-slate-900">Private inventory</h1>
        <p className="text-sm text-slate-600">
          Review urgent placement submissions, assign reviewers, and track outcomes.
        </p>
      </header>

      <PrivateInventoryTable initial={(data ?? []) as PrivateInventoryRow[]} />
    </main>
  );
}
