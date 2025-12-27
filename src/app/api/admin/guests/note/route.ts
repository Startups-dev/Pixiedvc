import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServer } from '@/lib/supabase';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';

export async function POST(request: Request) {
  const { requestId, body } = await request.json();

  if (!requestId || !body?.trim()) {
    return NextResponse.json({ error: 'Missing requestId or note body' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServer(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase.from('guest_request_activity').insert({
    request_id: requestId,
    author_id: user.id,
    kind: 'note',
    body: body.trim(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
