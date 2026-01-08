import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card, Button } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  ensureApprovalNotifications,
  ensurePointsExpiringNotification,
  getDisplayName,
  getNextExpiringMembership,
  getOwnerMemberships,
  getOwnerMatches,
  getOwnerNotifications,
  getOwnerPayouts,
  getOwnerProfile,
  getOwnerRentals,
  getPointsSummary,
} from "@/lib/owner-data";
import {
  formatCurrency,
  getMilestoneStatus,
  normalizeMilestones,
} from "@/lib/owner-portal";
import StatTiles from "@/components/owner/StatTiles";
import MatchedRequestsInbox from "@/components/owner/MatchedRequestsInbox";
import OwnerMembershipManager from "@/components/owner/OwnerMembershipManager";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function buildDisplayMilestones(rental: any) {
  const milestones = normalizeMilestones(rental.rental_milestones ?? []);
  const bookingPackage = (rental.booking_package ?? {}) as Record<string, unknown>;
  const leadGuestName = rental.lead_guest_name ?? (bookingPackage.lead_guest_name as string | null) ?? null;
  const leadGuestEmail = rental.lead_guest_email ?? (bookingPackage.lead_guest_email as string | null) ?? null;
  const leadGuestPhone = rental.lead_guest_phone ?? (bookingPackage.lead_guest_phone as string | null) ?? null;
  const depositPaid = typeof bookingPackage.deposit_paid === "number" ? bookingPackage.deposit_paid : null;

  const shouldGuestVerified = Boolean(
    rental.guest_user_id || (leadGuestName && leadGuestEmail && leadGuestPhone),
  );
  const shouldPaymentVerified = typeof depositPaid === "number" && depositPaid >= 99;
  const shouldPackageReady = Boolean(Object.keys(bookingPackage).length);
  const shouldBookingCompleted = Boolean(rental.dvc_confirmation_number);

  return milestones.map((milestone) => {
    if (milestone.code === "guest_verified" && shouldGuestVerified) {
      return { ...milestone, status: "completed", occurred_at: milestone.occurred_at ?? new Date().toISOString() };
    }
    if (milestone.code === "payment_verified" && shouldPaymentVerified) {
      return { ...milestone, status: "completed", occurred_at: milestone.occurred_at ?? new Date().toISOString() };
    }
    if (milestone.code === "booking_package_sent" && shouldPackageReady) {
      return { ...milestone, status: "completed", occurred_at: milestone.occurred_at ?? new Date().toISOString() };
    }
    if (milestone.code === "owner_booked" && shouldBookingCompleted) {
      return { ...milestone, status: "completed", occurred_at: milestone.occurred_at ?? new Date().toISOString() };
    }
    return milestone;
  });
}

export default async function OwnerDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/dashboard");
  }

  const onboardingMessage = cookieStore.get("onboarding_completed_message");
  const showOnboardingMessage = Boolean(onboardingMessage);
  if (onboardingMessage) {
    cookieStore.delete("onboarding_completed_message");
  }

  const [owner, memberships, rentals, payouts, notifications, matches, resorts] = await Promise.all([
    getOwnerProfile(user.id, cookieStore),
    getOwnerMemberships(user.id, cookieStore),
    getOwnerRentals(user.id, cookieStore),
    getOwnerPayouts(user.id, cookieStore),
    getOwnerNotifications(user.id, cookieStore),
    getOwnerMatches(user.id, cookieStore),
    supabase.from("resorts").select("id, name, calculator_code").order("name"),
  ]);

  await Promise.all([
    ensurePointsExpiringNotification(user.id, memberships),
    ensureApprovalNotifications(user.id, rentals),
  ]);

  const rentalsWithMilestones = rentals.map((rental) => ({
    ...rental,
    milestones: buildDisplayMilestones(rental),
  }));

  const displayName = getDisplayName(owner, user.email ?? null);
  const pointsSummary = getPointsSummary(memberships);
  const nextExpiring = getNextExpiringMembership(memberships);

  const pendingPayouts = payouts.filter((payout) => payout.status === "eligible" || payout.status === "pending");
  const pendingPayoutAmount = pendingPayouts.reduce((sum, payout) => sum + Number(payout.amount_cents ?? 0), 0);

  const pendingMatches = matches.filter((match) => match.status === "pending_owner");
  const recentMatches = pendingMatches.slice(0, 3);

  const bookingIds = matches
    .map((match) => match.booking?.id)
    .filter((id): id is string => Boolean(id));
  const adminClient = getSupabaseAdminClient();
  const guestRows = adminClient && bookingIds.length
    ? await adminClient
        .from("booking_request_guests")
        .select("id, booking_id, title, first_name, last_name, email, phone, age_category, age, created_at")
        .in("booking_id", bookingIds)
    : { data: [] };
  const guestsByBookingId = new Map<string, any[]>();
  (guestRows.data ?? []).forEach((guest) => {
    const key = guest.booking_id as string;
    const list = guestsByBookingId.get(key) ?? [];
    list.push(guest);
    guestsByBookingId.set(key, list);
  });

  const rentalsByMatchId = new Map(
    rentals
      .filter((rental) => Boolean(rental.match_id))
      .map((rental) => [rental.match_id as string, rental]),
  );

  const matchItems = matches.map((match) => ({
    match,
    rental: match.id ? rentalsByMatchId.get(match.id) ?? null : null,
    guests: match.booking?.id ? guestsByBookingId.get(match.booking.id) ?? [] : [],
  }));

  const activeRentals = rentalsWithMilestones.filter((rental) => !["completed", "cancelled"].includes(rental.status));
  const approvalNeeded = activeRentals.filter(
    (rental) => getMilestoneStatus("owner_approved", rental.milestones) !== "completed",
  );
  const confirmationNeeded = activeRentals.filter((rental) => {
    const approved = getMilestoneStatus("owner_approved", rental.milestones) === "completed";
    const confirmation = getMilestoneStatus("disney_confirmation_uploaded", rental.milestones) === "completed";
    return approved && !confirmation;
  });

  const expiringPoints = memberships.filter((membership) => {
    if (!membership.points_expiration_date) return false;
    const expiry = new Date(membership.points_expiration_date).getTime();
    if (Number.isNaN(expiry)) return false;
    const daysLeft = (expiry - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 45;
  });

  const membershipRows = memberships.map((membership) => {
    const resortCode = membership.resort?.calculator_code ?? membership.resort?.slug ?? null;
    const resortLabel = resortCode ? `${membership.resort?.name ?? "Resort TBD"} (${resortCode})` : membership.resort?.name ?? "Resort TBD";
    const useYearLabel =
      membership.use_year ??
      (membership.use_year_start && membership.use_year_end
        ? `${formatDate(membership.use_year_start)} – ${formatDate(membership.use_year_end)}`
        : "Unknown");
    return {
      ...membership,
      resortLabel,
      useYearLabel,
    };
  });

  const tiles = [
    {
      label: "Available points",
      value: pointsSummary.available.toLocaleString("en-US"),
      helper: "Total across memberships",
    },
    {
      label: "Rented points",
      value: pointsSummary.rented.toLocaleString("en-US"),
      helper: "Booked to guests",
    },
    {
      label: "Pending payouts",
      value: formatCurrency(pendingPayoutAmount),
      helper: `${pendingPayouts.length} payouts pending release`,
    },
    {
      label: "Next expiring",
      value: nextExpiring?.points_expiration_date ? formatDate(nextExpiring.points_expiration_date) : "—",
      helper: nextExpiring?.resort?.name ?? "No expirations soon",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      {showOnboardingMessage ? (
        <Card className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-900 shadow-sm">
          Thanks for finishing onboarding. Everything you need stays here on the dashboard.
        </Card>
      ) : null}
      <header className="space-y-4 rounded-[36px] bg-[#0f2148] px-8 py-10 text-white shadow-[0_40px_80px_rgba(15,33,72,0.35)]">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">{displayName}’s dashboard</p>
        <h1 className="text-3xl font-semibold">Welcome back, {displayName}</h1>
        <p className="text-sm text-white/75">
          Track every rental milestone, upload confirmations, and stay ahead of payout releases.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="ghost">
            <Link href="/owner/rentals">View rentals</Link>
          </Button>
          <Button asChild>
            <Link href="/owner/payouts">View payouts</Link>
          </Button>
        </div>
      </header>

      <StatTiles tiles={tiles} />

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Pending owner action</p>
            <h2 className="text-xl font-semibold text-ink">
              {pendingMatches.length} matches awaiting your review
            </h2>
          </div>
          <Link href="/owner/matches" className="text-xs font-semibold text-brand hover:underline">
            View all matches
          </Link>
        </div>
        {pendingMatches.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
            No pending matches right now. We will notify you as soon as a guest is ready for your approval.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {recentMatches.map((match) => {
              const booking = match.booking;
              const resortName = booking?.primary_resort?.name ?? "Resort TBD";
              const points = booking?.total_points ?? match.points_reserved ?? 0;
              return (
                <Link key={match.id} href={`/owner/matches/${match.id}`} className="group">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 transition group-hover:border-brand/50">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Match</p>
                    <p className="mt-2 text-base font-semibold text-ink">{resortName}</p>
                    <p className="text-sm text-slate-600">
                      {formatDate(booking?.check_in ?? null)} → {formatDate(booking?.check_out ?? null)}
                    </p>
                    <p className="text-xs text-slate-500">{points.toLocaleString("en-US")} pts reserved</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Points overview</p>
          <h2 className="text-xl font-semibold text-ink">Membership breakdown</h2>
        </div>
        {membershipRows.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">No memberships on file yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-2 py-3">Resort</th>
                  <th className="px-2 py-3">Use year</th>
                  <th className="px-2 py-3">Contract year</th>
                  <th className="px-2 py-3">Owned</th>
                  <th className="px-2 py-3">Available</th>
                  <th className="px-2 py-3">Reserved</th>
                  <th className="px-2 py-3">Rented</th>
                  <th className="px-2 py-3">Expiring</th>
                </tr>
              </thead>
              <tbody>
                {membershipRows.map((membership) => (
                  <tr key={membership.id} className="border-b border-slate-100">
                    <td className="px-2 py-3 font-semibold text-ink">{membership.resortLabel}</td>
                    <td className="px-2 py-3">{membership.useYearLabel}</td>
                    <td className="px-2 py-3">{membership.contract_year ?? "—"}</td>
                    <td className="px-2 py-3">{membership.points_owned?.toLocaleString("en-US") ?? "—"}</td>
                    <td className="px-2 py-3">{membership.points_available?.toLocaleString("en-US") ?? "—"}</td>
                    <td className="px-2 py-3">{membership.points_reserved?.toLocaleString("en-US") ?? "—"}</td>
                    <td className="px-2 py-3">{membership.points_rented?.toLocaleString("en-US") ?? "—"}</td>
                    <td className="px-2 py-3">
                      {membership.points_expiration_date ? formatDate(membership.points_expiration_date) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OwnerMembershipManager
        memberships={memberships}
        resorts={(resorts.data ?? []) as { id: string; name: string; calculator_code: string | null }[]}
      />

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <MatchedRequestsInbox matches={matchItems} />

        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Action needed</p>
            <h2 className="text-xl font-semibold text-ink">Stay ahead</h2>
          </div>
          <div className="space-y-3 text-sm text-muted">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
              <span>Approvals waiting</span>
              <span className="font-semibold text-ink">{approvalNeeded.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
              <span>Confirmations to upload</span>
              <span className="font-semibold text-ink">{confirmationNeeded.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
              <span>Points expiring soon</span>
              <span className="font-semibold text-ink">{expiringPoints.length}</span>
            </div>
          </div>
          <Button asChild variant="ghost" fullWidth>
            <Link href="/owner/notifications">Review notifications ({notifications.length})</Link>
          </Button>
        </Card>
      </section>
    </div>
  );
}
