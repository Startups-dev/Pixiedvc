import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import { requireAdminUser } from "@/lib/admin";
import { READY_STAYS_SHOWCASE_FLAGS } from "@/lib/ready-stays/showcase-config";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import AdminReadyStaysManager from "@/app/admin/ready-stays/AdminReadyStaysManager";

export const dynamic = "force-dynamic";

type ReadyStayRow = {
  id: string;
  slug: string | null;
  title: string | null;
  short_description: string | null;
  status: "draft" | "active" | "sold" | "expired" | "paused" | "removed";
  featured: boolean;
  priority: number;
  sort_override: number | null;
  placement_home: boolean;
  placement_resort: boolean;
  placement_search: boolean;
  check_in: string;
  check_out: string;
  points: number;
  sleeps: number | null;
  image_url: string | null;
  badge: string | null;
  cta_label: string | null;
  href: string | null;
  expires_at: string | null;
  owner_id: string;
  rental_id: string;
  resort_id: string;
  room_type: string;
  season_type: string;
  owner_price_per_point_cents: number;
  guest_price_per_point_cents: number;
  created_at: string;
  updated_at: string;
  resorts?: {
    name?: string | null;
    slug?: string | null;
  } | null;
};

export default async function AdminReadyStaysPage() {
  await requireAdminUser("/admin/ready-stays");

  if (!READY_STAYS_SHOWCASE_FLAGS.enableReadyStaysAdmin) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-2">
            <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to admin
            </Link>
            <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays Admin</h1>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Ready Stays admin controls are disabled. Set <code>READY_STAYS_ADMIN=true</code> to enable.
          </Card>
        </div>
      </div>
    );
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-2">
            <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to admin
            </Link>
            <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays Admin</h1>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  const [{ data: rows, error: rowsError }, { data: resorts, error: resortsError }] = await Promise.all([
    adminClient
      .from("ready_stays")
      .select(
        "id, slug, title, short_description, status, featured, priority, sort_override, placement_home, placement_resort, placement_search, check_in, check_out, points, sleeps, image_url, badge, cta_label, href, expires_at, owner_id, rental_id, resort_id, room_type, season_type, owner_price_per_point_cents, guest_price_per_point_cents, created_at, updated_at, resorts(name, slug)",
      )
      .order("created_at", { ascending: false })
      .limit(300),
    adminClient.from("resorts").select("id, name, slug").order("name", { ascending: true }),
  ]);

  if (rowsError || resortsError) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-2">
            <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to admin
            </Link>
            <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays Admin</h1>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
            <p className="text-sm text-[#ff6b6b]">Unable to load Ready Stays admin data right now.</p>
            <p className="mt-2 text-xs text-[#8e8ea0]">
              {rowsError?.message ?? resortsError?.message ?? "Unknown error"}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const readyStayRows = (rows ?? []) as ReadyStayRow[];
  const resortRows = ((resorts ?? []) as Array<{ id: string; name: string; slug: string | null }>);

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
        <header className="space-y-2">
          <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to admin
          </Link>
          <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays Admin</h1>
          <p className="text-sm text-[#b4b4b4]">Manage live visibility, placements, priority, and merchandising details.</p>
        </header>

        <AdminReadyStaysManager rows={readyStayRows} resorts={resortRows} />
      </div>
    </div>
  );
}
