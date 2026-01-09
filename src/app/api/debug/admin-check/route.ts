import { NextResponse } from 'next/server';

import { adminEmails, adminListIsEmpty, emailIsAllowedForAdmin } from '@/lib/admin-emails';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email ?? null;

  return NextResponse.json({
    isAuthenticated: Boolean(user),
    userEmail,
    isAllowedAdmin: emailIsAllowedForAdmin(userEmail),
    adminListIsEmpty: adminListIsEmpty(),
    adminEmailsCount: adminEmails().length,
  });
}
