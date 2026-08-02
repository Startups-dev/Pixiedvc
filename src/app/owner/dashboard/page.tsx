import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  type BookingRequestGuestRow,
  type RentalRow,
  hasRestrictedResaleMembership,
  getOwnerMemberships,
  getOwnerMatches,
  getOwnerNotifications,
  getOwnerPayouts,
  getOwnerProfile,
  getOwnerRentals,
} from "@/lib/owner-data";
import { getCanonicalResorts } from "@/lib/resorts/getResorts";
import { normalizeMilestones } from "@/lib/owner-portal";
import { getOwnerPreferredBonusCents, getOwnerPreferredTier } from "@/lib/owner-rewards";
import { getPromotionsSetting } from "@/lib/promotions-settings";
import { requireOwnerAccess } from "@/lib/owner/requireOwnerAccess";
import { getActiveFoundingOwnerBonusCents, isActiveFoundingOwner } from "@/lib/founding-owner-bonus";
import {
  buildOwnerDashboardViewModel,
  type OwnerDashboardRentalRow,
} from "@/lib/owner/dashboard-view-model";
import OwnerDashboardClient from "./OwnerDashboardClient";

export const dynamic = "force-dynamic";

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


type DashboardPageRentalRow = RentalRow & OwnerDashboardRentalRow;

function buildDisplayMilestones(rental: DashboardPageRentalRow) {
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
  searchParams?: Promise<{ tab?: string; mode?: string }> | { tab?: string; mode?: string };
};

type ReadyStayDashboardRow = {
  id: string;
  sold_booking_request_id: string | null;
  booking_request_id: string | null;
  check_in: string | null;
  check_out: string | null;
  points: number | null;
  resorts: { name: string | null } | { name: string | null }[] | null;
};

function getReadyStayResortName(stay: ReadyStayDashboardRow) {
  const resort = Array.isArray(stay.resorts) ? stay.resorts[0] : stay.resorts;
  return resort?.name ?? null;
}

export default async function OwnerDashboardPage({ searchParams }: OwnerDashboardPageProps) {
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const cookieStore = await cookies();
  const ownerCookieStore = cookieStore as unknown as Parameters<typeof requireOwnerAccess>[1];
  const { user } = await requireOwnerAccess("/owner/dashboard", ownerCookieStore);
  const supabase = await createSupabaseServerClient();

  const onboardingMessage = cookieStore.get("onboarding_completed_message");
  const showOnboardingMessage = Boolean(onboardingMessage);
  if (onboardingMessage) {
    cookieStore.delete("onboarding_completed_message");
  }

  const adminClient = getSupabaseAdminClient();
  const client = adminClient ?? supabase;
  const owner = await getOwnerProfile(user.id, ownerCookieStore);
  const readyStayOwnerIds = Array.from(
    new Set(
      [user.id, owner?.id ?? null, owner?.user_id ?? null].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      ),
    ),
  );

  const [memberships, rentals, payouts, notifications, matches, resorts, rewardsProfile, rewardsStats, rewardsFlag] =
    await Promise.all([
      getOwnerMemberships(user.id, ownerCookieStore),
      getOwnerRentals(user.id, ownerCookieStore),
      getOwnerPayouts(user.id, ownerCookieStore),
      getOwnerNotifications(user.id, ownerCookieStore),
      getOwnerMatches(user.id, ownerCookieStore),
      getCanonicalResorts(supabase as unknown as Parameters<typeof getCanonicalResorts>[0], { select: "id, name, calculator_code, slug" }),
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
  const pendingReadyStayTransfers = ((readyStayRows ?? []) as ReadyStayDashboardRow[])
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
        resortName: getReadyStayResortName(stay),
        checkIn: stay.check_in ?? null,
        checkOut: stay.check_out ?? null,
        points: stay.points ?? null,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const rentalsWithMilestones = (rentals as OwnerDashboardRentalRow[]).map((rental) => ({
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

  const showResaleRestrictionBanner = hasRestrictedResaleMembership(visibleMemberships);

  const pendingPayouts = payouts.filter((payout) => payout.status === "eligible" || payout.status === "pending");
  const pendingPayoutAmount = pendingPayouts.reduce((sum, payout) => sum + Number(payout.amount_cents ?? 0), 0);
  const bookingIds = matches
    .map((match) => match.booking?.id)
    .filter((id): id is string => Boolean(id));
  const guestRows = adminClient && bookingIds.length
    ? await adminClient
        .from("booking_request_guests")
        .select("id, booking_id, title, first_name, last_name, email, phone, age_category, age, created_at")
        .in("booking_id", bookingIds)
    : { data: [] };
  const guestsByBookingId = new Map<string, BookingRequestGuestRow[]>();
  ((guestRows.data ?? []) as BookingRequestGuestRow[]).forEach((guest) => {
    const key = guest.booking_id as string;
    const list = guestsByBookingId.get(key) ?? [];
    list.push(guest);
    guestsByBookingId.set(key, list);
  });

  const rentalsByMatchId = new Map(
    rentalsWithMilestones
      .filter((rental) => Boolean(rental.match_id))
      .map((rental) => [rental.match_id as string, rental]),
  );

  const matchItems = matches.map((match) => ({
    match,
    rental: match.id ? rentalsByMatchId.get(match.id) ?? null : null,
    guests: match.booking?.id ? guestsByBookingId.get(match.booking.id) ?? [] : [],
  }));


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
  const foundingOwnerBonusCents = getActiveFoundingOwnerBonusCents(owner);
  const foundingOwnerSummary = owner && isActiveFoundingOwner(owner)
    ? {
        active: true,
        bonusCents: foundingOwnerBonusCents,
        expiresAt: owner.founding_owner_bonus_expires_at ?? null,
      }
    : null;

  const overview = buildOwnerDashboardViewModel({
    owner,
    memberships,
    rentals: rentals as OwnerDashboardRentalRow[],
    payouts,
    notifications,
    matches,
    pendingReadyStayTransfers,
  });

  const tabParam = resolvedSearchParams?.tab ?? "overview";
  const listingsMode = resolvedSearchParams?.mode === "add" ? "add" : "hub";
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
      overview={overview}
      showOnboardingMessage={showOnboardingMessage}
      showResaleRestrictionBanner={showResaleRestrictionBanner}
      matchItems={matchItems}
      resorts={resorts as { id: string; name: string; calculator_code: string | null }[]}
      pendingPayoutAmount={pendingPayoutAmount}
      pendingPayouts={pendingPayouts}
      rewardsSummary={rewardsSummary}
      foundingOwnerSummary={foundingOwnerSummary}
    />
  );
}
