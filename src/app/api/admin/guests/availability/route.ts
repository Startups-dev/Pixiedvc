import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';

export async function POST(request: Request) {
  const { requestId, availabilityStatus, note } = await request.json();

  if (!requestId || !availabilityStatus) {
    return NextResponse.json({ error: 'Missing requestId or availabilityStatus' }, { status: 400 });
  }

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

  const { data: updatedRequest, error: updateError } = await supabase.rpc(
    'confirm_booking_availability',
    {
      request_id: requestId,
      availability_status: availabilityStatus,
      note: note ?? null,
      actor_id: user.id,
    },
  );

  const updatedRow = Array.isArray(updatedRequest) ? updatedRequest[0] : updatedRequest;

  if (updateError || !updatedRow) {
    return NextResponse.json({ error: updateError?.message ?? 'Request not found' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    id: updatedRow.id,
    availability_status: updatedRow.availability_status,
    availability_checked_at: updatedRow.availability_checked_at,
  });
}
