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

export async function getCurrentUserAdminState(supabaseParam?: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const supabase = supabaseParam ?? (await createSupabaseServerClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profileRole: null, appRole: null, isAdmin: false } as const;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const profileRole = profile?.role ?? null;
  const appRole = (user.app_metadata?.role as string | undefined) ?? null;

  return {
    supabase,
    user,
    profileRole,
    appRole,
    isAdmin: isUserAdmin({
      profileRole,
      appRole,
      email: user.email ?? null,
    }),
  } as const;
}

export async function requireAdminUser(redirectPath = '/admin/owners') {
  const { supabase, user, isAdmin } = await getCurrentUserAdminState();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(redirectPath)}&admin=1`);
  }

  if (!isAdmin) {
    redirect('/');
  }

  return { supabase, user } as const;
}

export function isAdminEmail(email?: string | null) {
  return isAdminEmailStrict(email ?? null);
}
