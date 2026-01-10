import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from './supabase-server';
import { emailIsAllowedForAdmin, isAdminEmailStrict } from './admin-emails';

export async function requireAdminUser(redirectPath = '/admin/owners') {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}&admin=1`);
  }

  if (!emailIsAllowedForAdmin(user.email ?? null)) {
    redirect('/');
  }

  return { supabase, user } as const;
}

export function isAdminEmail(email?: string | null) {
  return isAdminEmailStrict(email ?? null);
}
