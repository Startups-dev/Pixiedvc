import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { runMatchBookings } from '@/lib/match-bookings';

const BodySchema = z.object({
  bookingRequestId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid booking request id' }, { status: 400 });
  }
  const bookingRequestId = parsed.data.bookingRequestId ?? null;

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

  const origin = new URL(request.url).origin;
  const result = await runMatchBookings({
    client: supabase,
    origin,
    bookingId: bookingRequestId,
    dryRun: false,
    now: new Date(),
    sendEmails: true,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
