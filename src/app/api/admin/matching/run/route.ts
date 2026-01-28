import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { runMatchBookings } from '@/lib/match-bookings';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const { bookingRequestId, bookingId } = await request.json().catch(() => ({}));
  const requestedId = typeof bookingRequestId === 'string' ? bookingRequestId : bookingId;

  const cookieStore = await cookies();
  const sessionClient = await createSupabaseServerClient();
  const adminClient = getSupabaseAdminClient();
  const supabase = adminClient ?? sessionClient;
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (requestedId && typeof requestedId === 'string' && !UUID_REGEX.test(requestedId)) {
    return NextResponse.json({ ok: false, error: 'Invalid booking request id' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const result = await runMatchBookings({
    client: supabase,
    origin,
    bookingId: typeof requestedId === 'string' ? requestedId : null,
    dryRun: false,
    now: new Date(),
    sendEmails: true,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
