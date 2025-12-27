import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

type BookingRow = {
  id: string;
  primary_resort_id: string | null;
  total_points: number | null;
  status: string;
  check_in: string | null;
  check_out: string | null;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  primary_resort?: { name: string | null } | null;
  booking_matches?: { status: string | null }[] | null;
};

type MembershipRow = {
  id: string;
  owner_id: string;
  resort_id: string;
  points_available: number | null;
  owner?: {
    id: string;
    verification: string | null;
    profiles?: { email?: string | null } | { email?: string | null }[] | null;
  } | null;
};

type BookingDiagnostic = {
  id: string;
  status: string;
  primary_resort_id: string | null;
  total_points: number | null;
  resort_name: string | null;
  hasPendingMatch: boolean;
  membershipsRawCount: number;
  membershipsVerifiedCount: number;
  chosenMembershipId: string | null;
  chosenMembershipPoints: number | null;
  chosenOwnerVerification: string | null;
  chosenOwnerEmail: string | null;
};

type DiagnosticEntry = {
  booking: BookingDiagnostic;
  reasons: string[];
};

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Service role key not configured' },
      { status: 500 }
    );
  }

  const { data: bookings, error: bookingError } = await client
    .from('booking_requests')
    .select(
      `
        id,
        primary_resort_id,
        total_points,
        status,
        check_in,
        check_out,
        lead_guest_name,
        lead_guest_email,
        primary_resort:resorts(name),
        booking_matches(status)
      `
    )
    .eq('status', 'submitted')
    .limit(50);

  if (bookingError) {
    return NextResponse.json(
      { error: bookingError.message },
      { status: 500 }
    );
  }

  const diagnostics: DiagnosticEntry[] = [];

  for (const booking of (bookings ?? []) as BookingRow[]) {
    const reasons: string[] = [];
    const info: BookingDiagnostic = {
      id: booking.id,
      status: booking.status,
      primary_resort_id: booking.primary_resort_id,
      total_points: booking.total_points,
      resort_name: booking.primary_resort?.name ?? null,
      hasPendingMatch: false,
      membershipsRawCount: 0,
      membershipsVerifiedCount: 0,
      chosenMembershipId: null,
      chosenMembershipPoints: null,
      chosenOwnerVerification: null,
      chosenOwnerEmail: null,
    };

    if (!booking.primary_resort_id) reasons.push("no primary_resort_id");
    if (!booking.total_points || booking.total_points <= 0)
      reasons.push("invalid total_points");

    const hasPendingMatch =
      (booking.booking_matches ?? []).some((m) => m.status === "pending_owner");
    info.hasPendingMatch = hasPendingMatch;
    if (hasPendingMatch) reasons.push("already has pending match");

    if (!booking.primary_resort_id) {
      diagnostics.push({ booking: info, reasons });
      continue;
    }

    const { data: memberships, error: membershipError } = await client
      .from("owner_memberships")
      .select(
        `
          id,
          owner_id,
          resort_id,
          points_available,
          owner:owners!inner (
            id,
            verification,
            profiles:profiles!owners_user_id_fkey(*)
          )
        `
      )
      .eq("resort_id", booking.primary_resort_id)
      .order("points_available", { ascending: true })
      .limit(20);

    if (membershipError) {
      reasons.push("membership query error");
      diagnostics.push({ booking: info, reasons });
      continue;
    }

    const items = (memberships ?? []) as MembershipRow[];
    info.membershipsRawCount = items.length;

    const enoughPoints = items.filter(
      (m) => (m.points_available ?? 0) >= (booking.total_points ?? 0)
    );

    if (enoughPoints.length === 0)
      reasons.push("no memberships with enough points");

    const verified = enoughPoints.filter((m) => {
      const profile = Array.isArray(m.owner?.profiles)
        ? m.owner?.profiles[0]
        : m.owner?.profiles;
      return (
        m.owner?.verification === "verified" &&
        !!profile?.email
      );
    });

    info.membershipsVerifiedCount = verified.length;

    if (verified.length === 0) {
      reasons.push("no verified owners with email");
      diagnostics.push({ booking: info, reasons });
      continue;
    }

    const best = verified[0];
    info.chosenMembershipId = best.id;
    info.chosenMembershipPoints = best.points_available;
    info.chosenOwnerVerification = best.owner?.verification;

    const profile = Array.isArray(best.owner?.profiles)
      ? best.owner?.profiles[0]
      : best.owner?.profiles;

    info.chosenOwnerEmail = profile?.email ?? null;

    reasons.push("booking IS matchable");

    diagnostics.push({ booking: info, reasons });
  }

  return NextResponse.json({
    bookingCount: diagnostics.length,
    diagnostics,
  });
}
