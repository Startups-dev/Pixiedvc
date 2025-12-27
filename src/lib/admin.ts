import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServer } from './supabase';
import { emailIsAllowedForAdmin, isAdminEmailStrict } from './admin-emails';

export async function requireAdminUser(redirectPath = '/admin/owners') {
  const cookieStore = await cookies();
  const supabase = createServer(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  if (!emailIsAllowedForAdmin(user.email ?? null)) {
    redirect('/');
  }

  return { supabase, user } as const;
}

export function isAdminEmail(email?: string | null) {
  return isAdminEmailStrict(email ?? null);
}
