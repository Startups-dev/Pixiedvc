'use server';

import { ensureOnboardingNotComplete } from './guards';
import { supabaseServer } from '@/lib/supabase-server';
import { getHomeForRole } from '@/lib/routes/home';

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
  use_year_start?: string;
  borrowing_enabled?: boolean;
  max_points_to_borrow?: number;
  points_owned?: number;
  points_available?: number;
  vacation_points?: Array<{
    use_year: number;
    available: number;
    holding: number;
  }>;
};

export async function saveOwnerContracts(input: {
  contracts: ContractInput[];
  matching_mode: 'premium_only' | 'premium_then_standard';
  allow_standard_rate_fallback: boolean;
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
  const validContracts = input.contracts.filter((contract) => contract.resort_id);
  const totalOwned = validContracts.reduce((sum, contract) => {
    if (contract.vacation_points?.length) {
      return sum + contract.vacation_points.reduce((inner, row) => inner + (row.available ?? 0) + (row.holding ?? 0), 0);
    }
    return sum + (contract.points_owned ?? 0);
  }, 0);
  const totalAvailable = validContracts.reduce((sum, contract) => {
    if (contract.vacation_points?.length) {
      return sum + contract.vacation_points.reduce((inner, row) => inner + (row.available ?? 0), 0);
    }
    return sum + (contract.points_available ?? 0);
  }, 0);

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
    console.error('[onboarding] failed to upsert owner', {
      code: ownerError.code,
      message: ownerError.message,
      details: ownerError.details,
      hint: ownerError.hint,
    });
    throw new Error(ownerError.message);
  }

  if (validContracts.length) {
    const listedAt = new Date().toISOString();
    const resortIds = Array.from(
      new Set(validContracts.map((contract) => contract.resort_id).filter(Boolean)),
    );
    const existingMemberships =
      resortIds.length > 0
        ? await sb
            .from('owner_memberships')
            .select('resort_id, use_year, use_year_start, allow_standard_rate_fallback')
            .eq('owner_id', user.id)
            .in('resort_id', resortIds)
        : { data: [], error: null };
    if (existingMemberships.error) {
      console.error('[onboarding] failed to load existing memberships', {
        code: existingMemberships.error.code,
        message: existingMemberships.error.message,
        details: existingMemberships.error.details,
        hint: existingMemberships.error.hint,
      });
    }
    const membershipPreferenceMap = new Map(
      (existingMemberships.data ?? []).map((row) => [
        `${row.resort_id}:${row.use_year ?? 'none'}:${row.use_year_start ?? 'none'}`,
        row.allow_standard_rate_fallback,
      ]),
    );
    const rows = validContracts.map((contract) => ({
      owner_id: user.id,
      resort_id: contract.resort_id,
      use_year: contract.use_year,
      use_year_start: contract.use_year_start ?? null,
      points_owned:
        contract.vacation_points?.length
          ? contract.vacation_points.reduce((inner, row) => inner + (row.available ?? 0) + (row.holding ?? 0), 0)
          : (contract.points_owned ?? null),
      points_available:
        contract.vacation_points?.length
          ? contract.vacation_points.reduce((inner, row) => inner + (row.available ?? 0), 0)
          : (contract.points_available ?? null),
      matching_mode: input.matching_mode,
      allow_standard_rate_fallback:
        membershipPreferenceMap.get(
          `${contract.resort_id}:${contract.use_year ?? 'none'}:${contract.use_year_start ?? 'none'}`,
        ) ?? input.allow_standard_rate_fallback,
      premium_only_listed_at: listedAt,
      borrowing_enabled: contract.borrowing_enabled ?? false,
      max_points_to_borrow: contract.max_points_to_borrow ?? null,
    }));

    const { data: savedMemberships, error } = await sb
      .from('owner_memberships')
      .upsert(rows, { onConflict: 'owner_id,resort_id,use_year,use_year_start' })
      .select('id, resort_id, use_year, use_year_start');
    if (error) {
      console.error('[onboarding] failed to upsert owner memberships', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(error.message);
    }

    const membershipMap = new Map(
      (savedMemberships ?? []).map((row) => [
        `${row.resort_id}:${row.use_year ?? 'none'}:${row.use_year_start ?? 'none'}`,
        row.id,
      ]),
    );

    const pointsRows = validContracts.flatMap((contract) => {
      const membershipId = membershipMap.get(
        `${contract.resort_id}:${contract.use_year ?? 'none'}:${contract.use_year_start ?? 'none'}`,
      );
      if (!membershipId || !contract.vacation_points?.length) return [];
      return contract.vacation_points
        .filter((row) => [2025, 2026, 2027].includes(row.use_year))
        .map((row) => ({
          owner_membership_id: membershipId,
          use_year: row.use_year,
          available: Math.max(0, Number(row.available) || 0),
          holding: Math.max(0, Number(row.holding) || 0),
          updated_at: new Date().toISOString(),
        }));
    });

    if (pointsRows.length) {
      const { error: pointsError } = await sb
        .from('owner_membership_use_year_points')
        .upsert(pointsRows, { onConflict: 'owner_membership_id,use_year' });
      if (pointsError) {
        throw new Error(pointsError.message);
      }

      const pointsAvailableByMembership = new Map<string | number, number>();
      for (const row of pointsRows) {
        pointsAvailableByMembership.set(
          row.owner_membership_id,
          (pointsAvailableByMembership.get(row.owner_membership_id) ?? 0) + row.available,
        );
      }

      for (const [membershipId, availableSum] of pointsAvailableByMembership.entries()) {
        const { error: syncError } = await sb
          .from('owner_memberships')
          .update({ points_available: availableSum })
          .eq('id', membershipId as any);
        if (syncError) {
          throw new Error(syncError.message);
        }
      }
    }
  }

  return { ok: true };
}

export async function saveOwnerLegalInfo(input: {
  owner_legal_full_name: string;
  co_owner_legal_full_name?: string;
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

  const { error } = await sb
    .from('owner_memberships')
    .update({
      owner_legal_full_name: input.owner_legal_full_name,
      co_owner_legal_full_name: input.co_owner_legal_full_name ?? null,
    })
    .eq('owner_id', user.id);

  if (error) {
    throw new Error(error.message);
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

  if (profile?.role === 'owner') {
    const { data: ownerMembership, error: ownerMembershipError } = await sb
      .from('owner_memberships')
      .select('owner_legal_full_name')
      .eq('owner_id', user.id)
      .not('owner_legal_full_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ownerMembershipError) {
      throw new Error(ownerMembershipError.message);
    }

    if (!ownerMembership?.owner_legal_full_name) {
      throw new Error('Owner legal full name is required to complete onboarding.');
    }
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

  const role = profile?.role === 'owner' || profile?.role === 'guest' ? profile?.role : null;
  if (role === 'owner') {
    return { ok: true, next: '/owner/onboarding/agreement' };
  }
  return { ok: true, next: getHomeForRole(role) };
}
