import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnerRentals } from "@/lib/owner-data";
import { buildMilestoneProgress, getNextOwnerAction, normalizeMilestones } from "@/lib/owner-portal";
import DevSeedRental from "@/components/owner/DevSeedRental";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Needs DVC booking", value: "needs_dvc_booking" },
  { label: "Awaiting approval", value: "awaiting_owner_approval" },
  { label: "Booked (pending agreement)", value: "booked_pending_agreement" },
  { label: "Booked", value: "booked" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

function statusPill(status: string) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]";
  switch (status) {
    case "needs_dvc_booking":
      return `${base} bg-amber-100 text-amber-700`;
    case "awaiting_owner_approval":
      return `${base} bg-amber-100 text-amber-700`;
    case "booked_pending_agreement":
      return `${base} bg-indigo-100 text-indigo-700`;
    case "booked":
      return `${base} bg-indigo-100 text-indigo-700`;
    case "completed":
      return `${base} bg-emerald-100 text-emerald-700`;
    case "cancelled":
      return `${base} bg-rose-100 text-rose-700`;
    default:
      return `${base} bg-slate-100 text-slate-600`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatPhone(value: string | null | undefined) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value;
}

function formatParty(rental: {
  adults?: number | null;
  youths?: number | null;
  booking_package?: Record<string, unknown> | null;
  party_size?: number | null;
}) {
  const pkg = rental.booking_package ?? {};
  const adults =
    typeof rental.adults === "number"
      ? rental.adults
      : typeof (pkg as any).adults === "number"
        ? (pkg as any).adults
        : null;
  const youths =
    typeof rental.youths === "number"
      ? rental.youths
      : typeof (pkg as any).youths === "number"
        ? (pkg as any).youths
        : null;

  if (adults !== null || youths !== null) {
    const adultLabel = adults === null ? "— adults" : `${adults} adult${adults === 1 ? "" : "s"}`;
    const youthLabel = youths === null ? "— kids" : `${youths} kid${youths === 1 ? "" : "s"}`;
    return `${adultLabel} · ${youthLabel}`;
  }

  if (typeof rental.party_size === "number") {
    return `${rental.party_size} guest${rental.party_size === 1 ? "" : "s"}`;
  }

  return "—";
}

export default async function OwnerRentalsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const isDev = process.env.NODE_ENV !== "production";
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/rentals");
  }

  const rentals = await getOwnerRentals(user.id, cookieStore);
  const rentalsWithMilestones = rentals.map((rental) => ({
    ...rental,
    milestones: normalizeMilestones(rental.rental_milestones ?? []),
  }));

  const filter = searchParams.status ?? "all";
  const filtered = filter === "all" ? rentalsWithMilestones : rentalsWithMilestones.filter((rental) => rental.status === filter);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Owner rentals</p>
        <h1 className="text-3xl font-semibold text-ink">Your rentals</h1>
        <p className="text-sm text-muted">Track progress, approvals, and upload milestones for each stay.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.value}
            href={`/owner/rentals?status=${item.value}`}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
              filter === item.value ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="space-y-3">
          <p className="text-sm text-muted">No rentals in this view yet.</p>
          {isDev ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Seed a demo rental tied to your account for local testing.
              <DevSeedRental className="mt-3" />
            </div>
          ) : null}
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((rental) => {
            const progress = buildMilestoneProgress(rental.milestones);
            const nextAction = getNextOwnerAction(rental.milestones);

            return (
              <Card key={rental.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {rental.resort_code} / {rental.lead_guest_name ?? "Guest TBD"}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(rental.check_in)} – {formatDate(rental.check_out)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Guest: {rental.lead_guest_name ?? "Guest TBD"}
                      {rental.lead_guest_email ? ` · ${rental.lead_guest_email}` : ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      {rental.lead_guest_phone ? `Phone: ${formatPhone(rental.lead_guest_phone)}` : "Phone: —"}
                      {" · "}
                      {`Party: ${formatParty(rental)}`}
                    </p>
                  </div>
                  <span className={statusPill(rental.status)}>{rental.status.replace(/_/g, " ")}</span>
                </div>
                <div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${progress.percent}%` }} aria-hidden />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {progress.completed} of {progress.total} milestones complete
                  </p>
                </div>
                {nextAction ? (
                  <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Next: {nextAction.label}</p>
                ) : null}
                <Link href={`/owner/rentals/${rental.id}`} className="text-xs font-semibold text-brand hover:underline">
                  View rental details
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
