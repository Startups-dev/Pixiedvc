'use server';

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
  const sb = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

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

export async function saveProfile(input: { display_name?: string; phone?: string }) {
  const sb = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  await ensureProfileRow(sb, user.id);

  const { error } = await sb
    .from('profiles')
    .update({
      display_name: input.display_name,
      phone: input.phone,
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
  const sb = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

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

  const { error: deleteError } = await sb.from('owner_memberships').delete().eq('owner_id', user.id);
  if (deleteError) {
    throw new Error(deleteError.message);
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

    const { error } = await sb.from('owner_memberships').insert(rows);
    if (error) {
      throw new Error(error.message);
    }
  }

  return { ok: true };
}

export async function saveGuestPrefs(input: { dates_pref?: string; favorite_resorts?: string[] }) {
  const sb = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

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
  const sb = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await sb.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

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
    .update({ onboarding_completed: true })
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

  return { ok: true, next: profile?.role === 'owner' ? '/owner' : '/guest' };
}
