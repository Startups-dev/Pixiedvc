import { redirect } from 'next/navigation';

import { supabaseServer } from '@/lib/supabase-server';

export async function isOnboardingComplete(sb: ReturnType<typeof supabaseServer>, userId: string) {
  const { data: profile } = await sb
    .from('profiles')
    .select('onboarding_completed, onboarding_completed_at')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.onboarding_completed || profile?.onboarding_completed_at) {
    return true;
  }

  const { data: owner } = await sb.from('owners').select('id').eq('user_id', userId).maybeSingle();
  if (owner) {
    return true;
  }

  const { data: membership } = await sb
    .from('owner_memberships')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();

  return Boolean(membership);
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
    redirect('/owner/dashboard');
  }

  return user;
}
