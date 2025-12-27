import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { createServer } from '@/lib/supabase';
import { emailIsAllowedForAdmin } from '@/lib/admin-emails';

export async function POST(request: Request) {
  const { ownerId, body } = await request.json();

  if (!ownerId || !body) {
    return NextResponse.json({ error: 'Missing ownerId or body' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServer(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase.from('owner_comments').insert({
    owner_id: ownerId,
    author_id: user.id,
    body,
    kind: 'note',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
