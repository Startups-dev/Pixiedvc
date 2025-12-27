import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createServer } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type GuestRequest = {
  id: string;
  status: string;
  created_at: string;
  check_in: string | null;
  check_out: string | null;
  room_type: string | null;
  adults: number | null;
  children: number | null;
  max_price_per_point: number | null;
  resort: {
    name: string;
  } | null;
};

const statusStyles: Record<string, string> = {
  submitted: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-900",
  matched: "bg-indigo-100 text-indigo-900",
  confirmed: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-rose-100 text-rose-900",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export default async function GuestDashboard() {
  const cookieStore = await cookies();
  const supabase = createServer(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/guest");
  }

  const { data } = await supabase
    .from("renter_requests")
    .select("id, status, created_at, check_in, check_out, room_type, adults, children, max_price_per_point, resort:resorts(name)")
    .eq("renter_id", user.id)
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as GuestRequest[];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-3 rounded-3xl bg-white p-8 shadow-[0_20px_60px_rgba(15,33,72,0.12)]">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Guest concierge</p>
        <h1 className="text-3xl font-semibold text-slate-900">Plan your next stay, {user.email}</h1>
        <p className="text-slate-600">
          Follow each request from deposit through confirmation. When you are ready for a new adventure, launch the builder to send us your dream
          itinerary.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/stay-builder"
            className="rounded-full bg-[#4b6aff] px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(75,106,255,0.4)] hover:opacity-90"
          >
            Launch Trip Builder
          </Link>
          <Link href="/requests/new" className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Submit manual request
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Your stay requests</h2>
        <p className="text-sm text-slate-500">We update statuses as soon as owners respond or itineraries change.</p>
        {requests.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            No requests yet. Use the Trip Builder to send your first concierge plan.
          </div>
        ) : (
          <div className="mt-6 divide-y divide-slate-100">
            {requests.map((request) => (
              <article key={request.id} className="grid gap-4 py-4 text-sm text-slate-700 md:grid-cols-[2fr_1fr_1fr]">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resort</p>
                  <p className="text-base font-semibold text-slate-900">{request.resort?.name ?? 'Any resort'}</p>
                  <p className="text-xs text-slate-500">
                    Requested {dateFormatter.format(new Date(request.created_at))} · {request.room_type ?? 'Room type TBD'} · {adultsLabel(request)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dates</p>
                  <p className="text-base font-medium">
                    {formatRange(request.check_in, request.check_out)}
                  </p>
                  {request.max_price_per_point ? (
                    <p className="text-xs text-slate-500">Cap ${request.max_price_per_point.toFixed(2)} / pt</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-start gap-2 md:items-end">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusStyles[request.status] ?? 'bg-slate-100 text-slate-700'}`}>
                    {request.status}
                  </span>
                  <Link href="/contact" className="text-sm font-semibold text-indigo-600 hover:underline">
                    Talk to concierge
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatRange(start?: string | null, end?: string | null) {
  if (!start && !end) {
    return "Flexible";
  }
  if (start && end) {
    return `${dateFormatter.format(new Date(start))} → ${dateFormatter.format(new Date(end))}`;
  }
  if (start) {
    return dateFormatter.format(new Date(start));
  }
  return dateFormatter.format(new Date(end!));
}

function adultsLabel(request: GuestRequest) {
  const adults = request.adults ?? 0;
  const children = request.children ?? 0;
  const parts = [];
  if (adults) {
    parts.push(`${adults} adult${adults === 1 ? "" : "s"}`);
  }
  if (children) {
    parts.push(`${children} kid${children === 1 ? "" : "s"}`);
  }
  return parts.length ? parts.join(" · ") : "No party size set";
}
