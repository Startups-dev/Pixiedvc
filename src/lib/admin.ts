import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from './supabase-server';
import { emailIsAllowedForAdmin, isAdminEmailStrict } from './admin-emails';

export function isUserAdmin(input: {
  profileRole?: string | null;
  appRole?: string | null;
  email?: string | null;
}) {
  return (
    input.profileRole === 'admin' ||
    input.appRole === 'admin' ||
    emailIsAllowedForAdmin(input.email ?? null)
  );
}

export async function requireAdminUser(redirectPath = '/admin/owners') {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}&admin=1`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const appRole = (user.app_metadata?.role as string | undefined) ?? null;
  if (
    !isUserAdmin({
      profileRole: profile?.role ?? null,
      appRole,
      email: user.email ?? null,
    })
  ) {
    redirect('/');
  }

  return { supabase, user } as const;
}

export function isAdminEmail(email?: string | null) {
  return isAdminEmailStrict(email ?? null);
}
