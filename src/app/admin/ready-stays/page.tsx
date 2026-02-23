import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import { requireAdminUser } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { formatCurrency } from "@/lib/owner-portal";

export const dynamic = "force-dynamic";

type ReadyStayStatus = "draft" | "active" | "sold" | "expired" | "removed" | "all";

type ReadyStayRow = {
  id: string;
  owner_id: string;
  rental_id: string;
  status: "draft" | "active" | "sold" | "expired" | "removed";
  resort_id: string;
  check_in: string;
  check_out: string;
  points: number;
  room_type: string;
  season_type: string;
  owner_price_per_point_cents: number;
  guest_price_per_point_cents: number;
  created_at: string;
  updated_at: string;
  resorts?: {
    name?: string | null;
    calculator_code?: string | null;
  } | null;
};

const STATUS_OPTIONS: Array<{ value: ReadyStayStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "expired", label: "Expired" },
  { value: "removed", label: "Removed" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US");
}

export default async function AdminReadyStaysPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const statusParamRaw = typeof searchParams?.status === "string" ? searchParams.status : "all";
  const statusParam = (STATUS_OPTIONS.some((item) => item.value === statusParamRaw)
    ? statusParamRaw
    : "all") as ReadyStayStatus;

  await requireAdminUser("/admin/ready-stays");

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Card>
          <p className="text-sm text-muted">
            Missing service role key. Configure SUPABASE_SERVICE_ROLE_KEY to view Ready Stays monitoring.
          </p>
        </Card>
      </div>
    );
  }

  let query = adminClient
    .from("ready_stays")
    .select(
      "id, owner_id, rental_id, status, resort_id, check_in, check_out, points, room_type, season_type, owner_price_per_point_cents, guest_price_per_point_cents, created_at, updated_at, resorts(name, calculator_code)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusParam !== "all") {
    query = query.eq("status", statusParam);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/ready-stays] query failed", error);
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Card className="p-6">
          <p className="text-sm text-rose-600">Unable to load Ready Stays monitor right now.</p>
          <p className="mt-2 text-xs text-slate-500">Check Supabase logs and relation permissions.</p>
        </Card>
      </div>
    );
  }

  const rows = (data ?? []) as ReadyStayRow[];
  const activeCount = rows.filter((row) => row.status === "active").length;
  const soldCount = rows.filter((row) => row.status === "sold").length;
  const draftCount = rows.filter((row) => row.status === "draft").length;
  const totalOwnerRevenueCents = rows
    .filter((row) => row.status === "sold")
    .reduce((sum, row) => sum + row.owner_price_per_point_cents * row.points, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-muted">
          ← Back to admin
        </Link>
        <h1 className="text-2xl font-semibold text-ink">Ready Stays Monitor</h1>
        <p className="text-sm text-muted">Operational visibility for published Ready Stays inventory.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total rows</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sold</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{soldCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Draft</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{draftCount}</p>
        </Card>
      </section>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sold owner revenue (visible rows)</p>
            <p className="text-lg font-semibold text-ink">{formatCurrency(totalOwnerRevenueCents)}</p>
          </div>
          <form method="get" className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusParam}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              Apply
            </button>
          </form>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card className="p-6 text-sm text-muted">No Ready Stays found for this filter.</Card>
      ) : (
        <Card className="overflow-x-auto p-4">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Resort</th>
                <th className="px-3 py-2">Dates</th>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Points</th>
                <th className="px-3 py-2">Owner / pt</th>
                <th className="px-3 py-2">Guest / pt</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Owner ID</th>
                <th className="px-3 py-2">Public</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-ink">{row.resorts?.name ?? "Resort"}</div>
                    <div className="text-xs text-slate-500">{row.resorts?.calculator_code ?? row.resort_id}</div>
                  </td>
                  <td className="px-3 py-3">
                    {formatDate(row.check_in)} → {formatDate(row.check_out)}
                    <div className="text-xs text-slate-500">Created {formatDate(row.created_at)}</div>
                  </td>
                  <td className="px-3 py-3">{row.room_type}</td>
                  <td className="px-3 py-3">{row.points}</td>
                  <td className="px-3 py-3">{formatCurrency(row.owner_price_per_point_cents)}</td>
                  <td className="px-3 py-3">{formatCurrency(row.guest_price_per_point_cents)}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <code className="text-xs text-slate-500">{row.owner_id}</code>
                  </td>
                  <td className="px-3 py-3">
                    {row.status === "active" ? (
                      <Link href={`/ready-stays/${row.id}`} className="text-xs font-semibold text-brand hover:underline">
                        View
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
