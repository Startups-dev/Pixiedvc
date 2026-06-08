import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import AdminTestingClient from "./AdminTestingClient";

export const dynamic = "force-dynamic";

type TestRow = {
  id: string;
  title: string | null;
  status: string;
  check_in: string;
  check_out: string;
  room_type: string | null;
  points: number;
  is_visible_publicly: boolean;
  test_notes: string | null;
  test_guest_total_cents: number | null;
  test_owner_payout_cents: number | null;
  created_at: string;
  resorts?: { name?: string | null; slug?: string | null } | null;
};

export default async function AdminTestingPage() {
  const { user } = await requireAdminUser("/admin/testing");
  const adminClient = getSupabaseAdminClient();

  if (!adminClient) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-2">
            <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to admin
            </Link>
            <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Testing / QA</h1>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  const [{ data: resorts }, { data: rows }] = await Promise.all([
    adminClient.from("resorts").select("id, name, slug, calculator_code").order("name", { ascending: true }),
    adminClient
      .from("ready_stays")
      .select(
        "id, title, status, check_in, check_out, room_type, points, is_visible_publicly, test_notes, test_guest_total_cents, test_owner_payout_cents, created_at, resorts(name, slug)",
      )
      .eq("is_test_listing", true)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
        <header className="space-y-2">
          <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to admin
          </Link>
          <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Testing / QA</h1>
          <p className="text-sm text-[#b4b4b4]">
            Create controlled test Ready Stays for checkout, Stripe, email, and notification validation.
          </p>
        </header>

        <AdminTestingClient
          adminUserId={user.id}
          resorts={(resorts ?? []) as Array<{ id: string; name: string; slug: string | null; calculator_code: string | null }>}
          rows={(rows ?? []) as TestRow[]}
        />
      </div>
    </div>
  );
}
