'use server';

import { ensureOnboardingNotComplete } from './guards';
import { supabaseServer } from '@/lib/supabase-server';

async function ensureProfileRow(sb: ReturnType<typeof supabaseServer>, userId: string) {
  const { error } = await sb
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' });

  if (error) {
    throw new Error(error.message);
  }
}

export async function setRole(role: 'owner' | 'guest') {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  await ensureOnboardingNotComplete(sb, user.id);
  await ensureProfileRow(sb, user.id);

  const { error } = await sb
    .from('profiles')
    .update({ role })
    .eq('id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  await sb.auth.updateUser({
    data: {
      ...(user.user_metadata ?? {}),
      role,
    },
  });

  return { ok: true };
}

export async function saveProfile(input: {
  display_name?: string;
  full_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  payout_email?: string;
  payout_email_same_as_login?: boolean;
  dvc_member_last4?: string;
}) {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  await ensureOnboardingNotComplete(sb, user.id);
  await ensureProfileRow(sb, user.id);

  const { error } = await sb
    .from('profiles')
    .update({
      display_name: input.display_name,
      full_name: input.full_name,
      phone: input.phone,
      address_line1: input.address_line1,
      address_line2: input.address_line2,
      city: input.city,
      region: input.region,
      postal_code: input.postal_code,
      country: input.country,
      payout_email: input.payout_email,
      payout_email_same_as_login: input.payout_email_same_as_login ?? true,
      dvc_member_last4: input.dvc_member_last4,
    })
    .eq('id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export type ContractInput = {
  resort_id: string;
  use_year: string;
  contract_year?: number;
  points_owned?: number;
  points_available?: number;
};

export async function saveOwnerContracts(contracts: ContractInput[]) {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  await ensureOnboardingNotComplete(sb, user.id);
  const validContracts = contracts.filter((contract) => contract.resort_id);
  const totalOwned = validContracts.reduce((sum, contract) => sum + (contract.points_owned ?? 0), 0);
  const totalAvailable = validContracts.reduce((sum, contract) => sum + (contract.points_available ?? 0), 0);

  const ownerPayload = {
    id: user.id,
    user_id: user.id,
    verification: 'pending' as const,
    home_resort: validContracts[0]?.resort_id ?? null,
    use_year: validContracts[0]?.use_year ?? null,
    points_owned: totalOwned || null,
    points_available: totalAvailable || null,
  };

  const { error: ownerError } = await sb.from('owners').upsert(ownerPayload, { onConflict: 'id' });
  if (ownerError) {
    throw new Error(ownerError.message);
  }

  if (validContracts.length) {
    const rows = validContracts.map((contract) => ({
      owner_id: user.id,
      resort_id: contract.resort_id,
      use_year: contract.use_year,
      contract_year: contract.contract_year ?? null,
      points_owned: contract.points_owned ?? null,
      points_available: contract.points_available ?? null,
    }));

    const { error } = await sb
      .from('owner_memberships')
      .upsert(rows, { onConflict: 'owner_id,resort_id,use_year,contract_year' });
    if (error) {
      throw new Error(error.message);
    }
  }

  return { ok: true };
}

export async function saveGuestPrefs(input: { dates_pref?: string; favorite_resorts?: string[] }) {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  await ensureOnboardingNotComplete(sb, user.id);
  const { error } = await sb
    .from('guest_preferences')
    .upsert(
      {
        user_id: user.id,
        dates_pref: input.dates_pref ?? null,
        favorite_resorts: input.favorite_resorts?.length ? input.favorite_resorts : null,
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function completeOnboarding() {
  const sb = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  await ensureOnboardingNotComplete(sb, user.id);
  await ensureProfileRow(sb, user.id);

  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error } = await sb
    .from('profiles')
    .update({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  await sb.auth.updateUser({
    data: {
      ...(user.user_metadata ?? {}),
      onboarding_completed: true,
      role: profile?.role ?? user.user_metadata?.role,
    },
  });

  if (profile?.role === 'owner') {
    await sb
      .from('owner_verifications')
      .upsert(
        { owner_id: user.id, status: 'not_started' },
        { onConflict: 'owner_id', ignoreDuplicates: true },
      );
  }

  return { ok: true, next: profile?.role === 'owner' ? '/owner' : '/guest' };
}
