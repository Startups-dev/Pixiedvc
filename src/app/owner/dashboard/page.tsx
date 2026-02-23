import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  ensureApprovalNotifications,
  ensurePointsExpiringNotification,
  ensureResaleRestrictionNotification,
  getDisplayName,
  getNextExpiringMembership,
  hasRestrictedResaleMembership,
  getOwnerMemberships,
  getOwnerMatches,
  getOwnerNotifications,
  getOwnerPayouts,
  getOwnerProfile,
  getOwnerRentals,
  getPointsSummary,
} from "@/lib/owner-data";
import { getCanonicalResorts } from "@/lib/resorts/getResorts";
import { formatCurrency, normalizeMilestones, getMilestoneStatus } from "@/lib/owner-portal";
import { getMembershipExpirationDate, getMembershipNudge } from "@/lib/owner-nudges";
import { getOwnerPreferredBonusCents, getOwnerPreferredTier } from "@/lib/owner-rewards";
import { getPromotionsSetting } from "@/lib/promotions-settings";
import OwnerDashboardClient from "./OwnerDashboardClient";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatUseYearPeriod(start: string | null | undefined, end: string | null | undefined) {
  if (!start) return "—";
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "—";
  let endDate = end ? new Date(end) : null;
  if (!endDate || Number.isNaN(endDate.getTime())) {
    endDate = new Date(startDate);
    endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
  }
  const endISO = endDate.toISOString().slice(0, 10);
  return `${formatDate(start)} – ${formatDate(endISO)}`;
}

function getUseYearEndDate(start: string | null | undefined, end: string | null | undefined) {
  if (!start) return null;
  if (end) return end;
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;
  const endDate = new Date(startDate);
  endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  return endDate.toISOString().slice(0, 10);
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

type OwnerDashboardPageProps = {
  searchParams?: { tab?: string; mode?: string };
};

export default async function OwnerDashboardPage({ searchParams }: OwnerDashboardPageProps) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
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

  const adminClient = getSupabaseAdminClient();
  const client = adminClient ?? supabase;
  const owner = await getOwnerProfile(user.id, cookieStore);
  const readyStayOwnerIds = Array.from(
    new Set(
      [user.id, owner?.id ?? null, owner?.user_id ?? null].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    ),
  );

  const [memberships, rentals, payouts, notifications, matches, resorts, rewardsProfile, rewardsStats, rewardsFlag] =
    await Promise.all([
      getOwnerMemberships(user.id, cookieStore),
      getOwnerRentals(user.id, cookieStore),
      getOwnerPayouts(user.id, cookieStore),
      getOwnerNotifications(user.id, cookieStore),
      getOwnerMatches(user.id, cookieStore),
      getCanonicalResorts(supabase, { select: "id, name, calculator_code, slug" }),
      client.from("profiles").select("id, owner_rewards_enrolled_at").eq("id", user.id).maybeSingle(),
      owner
        ? client
            .from("owner_rewards_stats")
            .select("owner_id, lifetime_points_rented, tier")
            .eq("owner_id", owner.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      getPromotionsSetting("promotions_owner_enrollment_enabled"),
    ]);

  const { data: readyStayRows } = await client
    .from("ready_stays")
    .select("id, sold_booking_request_id, booking_request_id, check_in, check_out, points, resorts(name)")
    .in("owner_id", readyStayOwnerIds)
    .eq("status", "sold")
    .order("updated_at", { ascending: false });

  const soldBookingIds = Array.from(
    new Set(
      (readyStayRows ?? [])
        .map((row) => row.sold_booking_request_id ?? row.booking_request_id ?? null)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );

  const { data: readyStayBookings } = soldBookingIds.length
    ? await client
        .from("booking_requests")
        .select("id, status, lead_guest_name")
        .in("id", soldBookingIds)
    : { data: [] };

  const readyStayBookingById = new Map((readyStayBookings ?? []).map((booking) => [booking.id, booking]));
  const pendingReadyStayTransfers = (readyStayRows ?? [])
    .map((stay) => {
      const linkedBookingId = stay.sold_booking_request_id ?? stay.booking_request_id ?? null;
      const booking =
        linkedBookingId && readyStayBookingById.has(linkedBookingId)
          ? readyStayBookingById.get(linkedBookingId)
          : null;
      if (!booking || booking.status !== "paid_waiting_owner_transfer") return null;
      return {
        id: stay.id,
        bookingId: booking.id,
        guestName: booking.lead_guest_name ?? null,
        resortName: stay.resorts?.name ?? null,
        checkIn: stay.check_in ?? null,
        checkOut: stay.check_out ?? null,
        points: stay.points ?? null,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  await Promise.all([
    ensurePointsExpiringNotification(user.id, memberships),
    ensureApprovalNotifications(user.id, rentals),
    ensureResaleRestrictionNotification(user.id, memberships),
  ]);

  const rentalsWithMilestones = rentals.map((rental) => ({
    ...rental,
    milestones: buildDisplayMilestones(rental),
  }));

  const displayName =
    owner?.profile_display_name?.trim() ||
    owner?.profile_full_name?.trim().split(/\s+/)[0] ||
    null;
  const todayISO = new Date().toISOString().slice(0, 10);
  const visibleMemberships = memberships
    .filter((membership) => !membership.expired_assumed_at)
    .filter((membership) => {
      const endDate = getUseYearEndDate(membership.use_year_start, membership.use_year_end);
      return endDate ? endDate >= todayISO : true;
    })
    .sort((a, b) => (a.use_year_start ?? "").localeCompare(b.use_year_start ?? ""));

  const pointsSummary = getPointsSummary(visibleMemberships);
  const nextExpiring = getNextExpiringMembership(visibleMemberships);
  const showResaleRestrictionBanner = hasRestrictedResaleMembership(visibleMemberships);
  const hasPremiumOnlyMembership = visibleMemberships.some(
    (membership) => membership.matching_mode === "premium_only",
  );

  const pendingPayouts = payouts.filter((payout) => payout.status === "eligible" || payout.status === "pending");
  const pendingPayoutAmount = pendingPayouts.reduce((sum, payout) => sum + Number(payout.amount_cents ?? 0), 0);

  const pendingMatches = matches.filter((match) => match.status === "pending_owner");
  const recentMatches = pendingMatches.slice(0, 3);
  const bookingIds = matches
    .map((match) => match.booking?.id)
    .filter((id): id is string => Boolean(id));
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

  const expiringPoints = visibleMemberships
    .map((membership) => {
      const nudge = getMembershipNudge(membership);
      if (!nudge) return null;
      return {
        ...membership,
        nudge,
      };
    })
    .filter((membership): membership is any => Boolean(membership));

  const membershipRows = visibleMemberships.map((membership) => {
    const resortCode = membership.resort?.calculator_code ?? membership.resort?.slug ?? null;
    const resortLabel = resortCode ? `${membership.resort?.name ?? "Resort TBD"} (${resortCode})` : membership.resort?.name ?? "Resort TBD";
    const useYearLabel =
      membership.use_year ?? formatUseYearPeriod(membership.use_year_start, membership.use_year_end);
    const nudge = getMembershipNudge(membership);
    return {
      ...membership,
      resortLabel,
      useYearLabel,
      nudge,
    };
  });

  const nextExpiringDate = nextExpiring ? getMembershipExpirationDate(nextExpiring) : null;
  const nextExpiringNudge = nextExpiring ? getMembershipNudge(nextExpiring) : null;

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
      value: nextExpiringDate ? formatDate(nextExpiringDate) : "—",
      helper: nextExpiring?.resort?.name ?? "No expirations soon",
      badge: nextExpiringNudge
        ? {
            label: nextExpiringNudge.stage === "banking" ? "Banking" : "Expiring",
            className: nextExpiringNudge.tier.classes,
          }
        : undefined,
    },
  ];

  const rewardsEnrolled = Boolean(rewardsProfile?.data?.owner_rewards_enrolled_at);
  const rewardsEnrollmentOpen = rewardsFlag?.data ?? true;
  const lifetimePoints = Number(rewardsStats?.data?.lifetime_points_rented ?? 0);
  const bonusCents = getOwnerPreferredBonusCents(lifetimePoints);
  const tier = getOwnerPreferredTier(lifetimePoints);
  const rewardsSummary = owner
    ? {
        enrolled: rewardsEnrolled,
        enrollmentOpen: rewardsEnrollmentOpen,
        lifetimePoints,
        bonusCents,
        tierLabel: tier,
      }
    : null;

  const tabParam = searchParams?.tab ?? "overview";
  const listingsMode = searchParams?.mode === "add" ? "add" : "hub";
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "matches", label: "Matches" },
    { id: "earnings", label: "Earnings" },
    { id: "rewards", label: "Rewards" },
    { id: "listings", label: "Listings" },
    { id: "payouts", label: "Payouts", comingSoon: true },
    { id: "documents", label: "Documents", comingSoon: true },
  ];
  const activeTab = tabs.some((tab) => tab.id === tabParam) ? tabParam : "overview";

  return (
    <OwnerDashboardClient
      activeTab={activeTab}
      listingsMode={listingsMode}
      tabs={tabs}
      displayName={displayName}
      showOnboardingMessage={showOnboardingMessage}
      showResaleRestrictionBanner={showResaleRestrictionBanner}
      hasPremiumOnlyMembership={hasPremiumOnlyMembership}
      tiles={tiles}
      pendingMatches={pendingMatches}
      recentMatches={recentMatches}
      matchItems={matchItems}
      membershipRows={membershipRows}
      visibleMemberships={visibleMemberships}
      resorts={resorts as { id: string; name: string; calculator_code: string | null }[]}
      notifications={notifications}
      expiringPoints={expiringPoints}
      approvalNeeded={approvalNeeded}
      confirmationNeeded={confirmationNeeded}
      pendingReadyStayTransfers={pendingReadyStayTransfers}
      pendingPayoutAmount={pendingPayoutAmount}
      pendingPayouts={pendingPayouts}
      rewardsSummary={rewardsSummary}
    />
  );
}
