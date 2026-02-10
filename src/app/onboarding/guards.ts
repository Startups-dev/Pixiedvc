import { redirect } from 'next/navigation';

import { supabaseServer } from '@/lib/supabase-server';
import { getHomeForRole } from '@/lib/routes/home';

export async function isOnboardingComplete(sb: ReturnType<typeof supabaseServer>, userId: string) {
  const { data: profile } = await sb
    .from('profiles')
    .select('onboarding_completed, onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.onboarding_completed || profile?.onboarding_completed_at) {
    return true;
  }
  return false;
}

export async function ensureOnboardingNotComplete(sb: ReturnType<typeof supabaseServer>, userId: string) {
  if (await isOnboardingComplete(sb, userId)) {
    throw new Error('Onboarding has already been completed.');
  }
}

export async function requireOnboardingInProgress() {
const sb = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    redirect('/login?redirect=/onboarding');
  }

  if (!user) {
    redirect('/login?redirect=/onboarding');
  }

  if (await isOnboardingComplete(sb, user.id)) {
    const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const role = (profile?.role as string | undefined) ?? null;
    redirect(getHomeForRole(role === 'owner' || role === 'guest' ? role : null));
  }

  return user;
}
