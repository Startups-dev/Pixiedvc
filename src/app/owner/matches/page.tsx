import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnerMatches } from "@/lib/owner-data";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default async function OwnerMatchesPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/matches");
  }

  const matches = await getOwnerMatches(user.id, cookieStore);
  const pendingMatches = matches.filter((match) => match.status === "pending_owner");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Owner matches</p>
        <h1 className="text-3xl font-semibold text-ink">Pending owner requests</h1>
        <p className="text-sm text-slate-600">
          Review each booking package while your points are reserved.
        </p>
      </header>

      {pendingMatches.length === 0 ? (
        <Card className="p-6 text-sm text-muted">
          No pending matches right now. We will notify you as soon as a guest is ready for your approval.
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingMatches.map((match) => {
            const booking = match.booking;
            const resortName = booking?.primary_resort?.name ?? "Resort TBD";
            const points = booking?.total_points ?? match.points_reserved ?? 0;
            return (
              <Card key={match.id} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="order-2 space-y-2 sm:order-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">Booking request</p>
                  <h2 className="text-lg font-semibold text-ink">{resortName}</h2>
                  <p className="text-sm text-slate-600">
                    {formatDate(booking?.check_in ?? null)} → {formatDate(booking?.check_out ?? null)} · {points.toLocaleString("en-US")} pts
                  </p>
                  <p className="text-xs text-slate-500">Received {formatDate(match.created_at)}</p>
                </div>
                <Link
                  href={`/owner/matches/${match.id}`}
                  className="order-1 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(14,116,255,0.35)] sm:order-2"
                >
                  View booking package
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
