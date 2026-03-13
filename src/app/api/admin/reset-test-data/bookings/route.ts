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
};

export async function POST(request: Request) {
  if (process.env.ALLOW_ADMIN_RESET !== 'true') {
    return NextResponse.json({ error: 'Reset disabled in production.' }, { status: 403 });
  }

  const payload = (await request.json().catch(() => ({}))) as { code?: string };
  if (payload.code !== REQUIRED_CODE) {
    return NextResponse.json({ error: 'Invalid confirmation code.' }, { status: 403 });
  }

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
    booking_requests_deleted: Number(row.booking_requests_deleted ?? 0),
    renter_requests_deleted: Number(row.renter_requests_deleted ?? 0),
    rentals_deleted: Number(row.rentals_deleted ?? 0),
    confirmed_bookings_deleted: Number(row.confirmed_bookings_deleted ?? 0),
  });
}
