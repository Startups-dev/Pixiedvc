import { NextResponse } from 'next/server';

import { isUserAdmin } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const REQUIRED_CODE = '2828';

type ResetResponseRow = {
  booking_requests_deleted: number;
  renter_requests_deleted: number;
  rentals_deleted: number;
  confirmed_bookings_deleted: number;
  booking_matches_deleted: number;
  booking_request_guests_deleted: number;
  guest_request_activity_deleted: number;
  contracts_deleted: number;
  contract_events_deleted: number;
  rental_milestones_deleted: number;
  rental_documents_deleted: number;
  rental_exceptions_deleted: number;
  payout_ledger_deleted: number;
};

export async function POST(request: Request) {
  const sessionClient = await createSupabaseServerClient();
  const adminClient = getSupabaseAdminClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  let profileRole: string | null = null;
  if (user?.id) {
    const { data: profile } = await sessionClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    profileRole = profile?.role ?? null;
  }

  const appRole = (user?.app_metadata?.role as string | undefined) ?? null;
  if (
    !user ||
    !isUserAdmin({
      profileRole,
      appRole,
      email: user.email ?? null,
    })
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (process.env.ALLOW_ADMIN_RESET !== 'true') {
    return NextResponse.json({ error: 'Reset disabled in this environment.' }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as { code?: string };
  if (payload.code !== REQUIRED_CODE) {
    return NextResponse.json({ error: 'Invalid confirmation code.' }, { status: 403 });
  }

  if (!adminClient) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
  }

  const { data, error } = await adminClient.rpc('admin_reset_test_data_bookings');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (Array.isArray(data) ? data[0] : null) as ResetResponseRow | null;
  if (!row) {
    return NextResponse.json({ error: 'Reset returned no result.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    booking_requests_deleted: Number(row.booking_requests_deleted ?? 0),
    renter_requests_deleted: Number(row.renter_requests_deleted ?? 0),
    rentals_deleted: Number(row.rentals_deleted ?? 0),
    confirmed_bookings_deleted: Number(row.confirmed_bookings_deleted ?? 0),
    booking_matches_deleted: Number(row.booking_matches_deleted ?? 0),
    booking_request_guests_deleted: Number(row.booking_request_guests_deleted ?? 0),
    guest_request_activity_deleted: Number(row.guest_request_activity_deleted ?? 0),
    contracts_deleted: Number(row.contracts_deleted ?? 0),
    contract_events_deleted: Number(row.contract_events_deleted ?? 0),
    rental_milestones_deleted: Number(row.rental_milestones_deleted ?? 0),
    rental_documents_deleted: Number(row.rental_documents_deleted ?? 0),
    rental_exceptions_deleted: Number(row.rental_exceptions_deleted ?? 0),
    payout_ledger_deleted: Number(row.payout_ledger_deleted ?? 0),
  });
}
