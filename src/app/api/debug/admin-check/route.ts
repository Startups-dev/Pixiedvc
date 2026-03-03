import { NextResponse } from 'next/server';

import { emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !emailIsAllowedForAdmin(user.email ?? null)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userEmail = user?.email ?? null;

  return NextResponse.json({
    isAuthenticated: Boolean(user),
    userEmail,
    isAllowedAdmin: emailIsAllowedForAdmin(userEmail),
  });
}
