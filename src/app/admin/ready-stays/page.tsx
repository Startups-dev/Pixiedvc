import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import { requireAdminUser } from "@/lib/admin";
import { READY_STAYS_SHOWCASE_FLAGS } from "@/lib/ready-stays/showcase-config";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import AdminReadyStaysManager from "@/app/admin/ready-stays/AdminReadyStaysManager";

export const dynamic = "force-dynamic";

function toPublicRentalDocUrl(path: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!baseUrl || !path) return null;
  return `${baseUrl}/storage/v1/object/public/rental-docs/${path}`;
}

type ReadyStayRow = {
  id: string;
  slug: string | null;
  title: string | null;
  short_description: string | null;
  status: "draft" | "active" | "sold" | "expired" | "paused" | "removed";
  verification_status: "not_submitted" | "proof_uploaded" | "submitted" | "approved" | "rejected" | null;
  verification_submitted_at: string | null;
  verification_approved_at: string | null;
  verification_rejected_at: string | null;
  verification_review_notes: string | null;
  reservation_proof_path: string | null;
  reservation_proof_name: string | null;
  reservation_proof_uploaded_at: string | null;
  reservation_proof_public_url?: string | null;
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
  original_guest_price_per_point_cents: number | null;
  price_reduced_at: string | null;
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays Admin</h1>
            <Link
              href="/admin/ready-stays/history"
              className="rounded-full border border-[#3a3a3a] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b4b4b4] hover:text-[#ececec]"
            >
              View History
            </Link>
          </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays Admin</h1>
            <Link
              href="/admin/ready-stays/history"
              className="rounded-full border border-[#3a3a3a] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b4b4b4] hover:text-[#ececec]"
            >
              View History
            </Link>
          </div>
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
        "id, slug, title, short_description, status, verification_status, verification_submitted_at, verification_approved_at, verification_rejected_at, verification_review_notes, reservation_proof_path, reservation_proof_name, reservation_proof_uploaded_at, featured, priority, sort_override, placement_home, placement_resort, placement_search, check_in, check_out, points, sleeps, image_url, badge, cta_label, href, expires_at, owner_id, rental_id, resort_id, room_type, season_type, owner_price_per_point_cents, guest_price_per_point_cents, original_guest_price_per_point_cents, price_reduced_at, created_at, updated_at, resorts(name, slug)",
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
  const rentalIdsMissingProof = readyStayRows
    .filter((row) => !row.reservation_proof_path && row.rental_id)
    .map((row) => row.rental_id);
  const fallbackProofByRentalId = new Map<
    string,
    { storage_path: string | null; original_name: string | null; created_at: string | null }
  >();

  if (rentalIdsMissingProof.length) {
    const { data: rentalDocs } = await adminClient
      .from("rental_documents")
      .select("rental_id, storage_path, created_at, meta")
      .in("rental_id", rentalIdsMissingProof)
      .eq("type", "disney_confirmation_email")
      .order("created_at", { ascending: false });

    for (const doc of rentalDocs ?? []) {
      if (!doc.rental_id || fallbackProofByRentalId.has(doc.rental_id)) continue;
      fallbackProofByRentalId.set(doc.rental_id, {
        storage_path: doc.storage_path ?? null,
        original_name: typeof doc.meta?.original_name === "string" ? doc.meta.original_name : null,
        created_at: doc.created_at ?? null,
      });
    }
  }

  const rowsWithProofFallback = readyStayRows.map((row) => {
    const fallbackProof = fallbackProofByRentalId.get(row.rental_id);
    return {
      ...row,
      status:
        row.status === "active" && row.verification_status === "proof_uploaded"
          ? ("draft" as ReadyStayRow["status"])
          : row.status,
      reservation_proof_path: row.reservation_proof_path ?? fallbackProof?.storage_path ?? null,
      reservation_proof_name: row.reservation_proof_name ?? fallbackProof?.original_name ?? null,
      reservation_proof_uploaded_at: row.reservation_proof_uploaded_at ?? fallbackProof?.created_at ?? null,
    };
  });

  const readyStayRowsWithProof = rowsWithProofFallback.map((row) => ({
    ...row,
    reservation_proof_public_url: toPublicRentalDocUrl(row.reservation_proof_path),
  }));

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-12 text-[#ececec]">
        <header className="space-y-2">
          <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to admin
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold" style={{ color: "#64748b" }}>Ready Stays Admin</h1>
            <Link
              href="/admin/ready-stays/history"
              className="rounded-full border border-[#3a3a3a] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b4b4b4] hover:text-[#ececec]"
            >
              View History
            </Link>
          </div>
          <p className="text-sm text-[#b4b4b4]">Manage live visibility, placements, priority, and merchandising details.</p>
        </header>

        <AdminReadyStaysManager rows={readyStayRowsWithProof} resorts={resortRows} />
      </div>
    </div>
  );
}
