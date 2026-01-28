import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type GuestRequest = {
  id: string;
  status: string;
  created_at: string;
  check_in: string | null;
  check_out: string | null;
  room_type: string | null;
  adults: number | null;
  youths: number | null;
  total_points: number | null;
  resort: {
    name: string;
  } | null;
};

const statusStyles: Record<string, string> = {
  submitted: "bg-slate-100 text-slate-700",
  pending_match: "bg-amber-100 text-amber-900",
  pending_owner: "bg-amber-100 text-amber-900",
  matched: "bg-indigo-100 text-indigo-900",
  confirmed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-rose-100 text-rose-900",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export default async function GuestDashboard() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/guest");
  }

  const { data } = await supabase
    .from("booking_requests")
    .select("id, status, created_at, check_in, check_out, room_type:primary_room, adults, youths, total_points, resort:resorts!booking_requests_primary_resort_id_fkey(name)")
    .eq("renter_id", user.id)
    .in("status", ["submitted", "pending_match", "pending_owner", "matched", "confirmed", "cancelled"])
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as GuestRequest[];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="rounded-3xl bg-[#0B1B3A] px-8 py-12 text-white shadow-sm">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-white/60">Requests</p>
          <h1 className="text-3xl font-semibold text-white !text-white">Your Requests</h1>
          <p className="max-w-xl text-white/70">
            Track your requests from submission to booking.
          </p>
          <p className="text-xs text-white/50">
            Your requests will be fulfilled real soon!
          </p>
        </div>
      </header>

      <section id="requests-list" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Requests</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {requests.length}
            </span>
          </div>
        </div>
        {requests.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            No requests yet. Use the Trip Builder to send your first concierge plan.
          </div>
        ) : (
          <div className="mt-6 divide-y divide-slate-100">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/guest/requests/${request.id}`}
                className="block py-3 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <div className="grid gap-4 px-2 md:grid-cols-[2fr_1.4fr_1fr] md:items-center">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-900">{request.resort?.name ?? "Any resort"}</p>
                    <p className="text-xs text-slate-500">
                      {request.room_type ?? "Room type TBD"} · {adultsLabel(request)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900">
                      {renderDateRange(request.check_in, request.check_out)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatNights(request.check_in, request.check_out)} · {request.total_points ? `${request.total_points} points` : "Points TBD"}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusStyles[request.status] ?? "bg-slate-100 text-slate-700"}`}>
                      {formatStatus(request.status)}
                    </span>
                    <span className="text-sm font-semibold text-indigo-600">
                      {actionLabel(request.status)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-[#0B1B3A] px-8 py-10 text-white shadow-sm">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-white !text-white">Need a new request?</h2>
          <p className="text-sm text-white/70">
            Use Trip Builder to create a new request in a guided way.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/plan"
            className="rounded-[12px] border border-white/40 px-4 py-2 text-sm font-semibold text-white/90 hover:border-white/60 hover:text-white"
          >
            Open Trip Builder
          </Link>
          <Link href="/requests/new" className="text-sm font-semibold text-white/70 hover:text-white/90">
            Or submit a manual request
          </Link>
        </div>
      </section>
    </div>
  );
}

function renderDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) {
    return "Flexible";
  }
  if (start && end) {
    return (
      <>
        <span className="rounded-md border border-emerald-400 px-2 py-0.5">
          {dateFormatter.format(new Date(start))}
        </span>
        <span className="text-slate-400">→</span>
        <span className="rounded-md border border-rose-400 px-2 py-0.5">
          {dateFormatter.format(new Date(end))}
        </span>
      </>
    );
  }
  if (start) {
    return (
      <span className="rounded-md border border-emerald-400 px-2 py-0.5">
        {dateFormatter.format(new Date(start))}
      </span>
    );
  }
  return (
    <span className="rounded-md border border-rose-400 px-2 py-0.5">
      {dateFormatter.format(new Date(end!))}
    </span>
  );
}

function adultsLabel(request: GuestRequest) {
  const adults = request.adults ?? 0;
  const children = request.youths ?? 0;
  const parts = [];
  if (adults) {
    parts.push(`${adults} adult${adults === 1 ? "" : "s"}`);
  }
  if (children) {
    parts.push(`${children} kid${children === 1 ? "" : "s"}`);
  }
  return parts.length ? parts.join(" · ") : "No party size set";
}

function formatStatus(status: string) {
  if (status === "pending_match" || status === "pending_owner") return "pending";
  return status;
}

function actionLabel(_status: string) {
  return "View details";
}

function formatNights(start?: string | null, end?: string | null) {
  if (!start || !end) return "Nights TBD";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  if (Number.isNaN(diff) || diff <= 0) return "Nights TBD";
  const nights = Math.round(diff / (1000 * 60 * 60 * 24));
  return `${nights} night${nights === 1 ? "" : "s"}`;
}
