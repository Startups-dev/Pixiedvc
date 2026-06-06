import { beforeEach, describe, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  syncOwnerNewsletterSubscriber: vi.fn(),
}));

type ProfileRow = {
  role: string | null;
  display_name: string | null;
  full_name: string | null;
  country?: string | null;
  onboarding_completed?: boolean | null;
  onboarding_completed_at?: string | null;
};

type OwnerMembershipRow = {
  owner_legal_full_name: string | null;
};

type OwnerUpsertPayload = Record<string, unknown> | null;
type ProfileUpdatePayload = Record<string, unknown> | null;
type OwnerVerificationPayload = Record<string, unknown> | null;

let profile: ProfileRow | null;
let ownerMembership: OwnerMembershipRow | null;
let ownerUpsertPayload: OwnerUpsertPayload;
let profileUpdatePayload: ProfileUpdatePayload;
let ownerVerificationPayload: OwnerVerificationPayload;
let authUpdateUser: ReturnType<typeof vi.fn>;
let supabaseMock: {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    updateUser: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
};

function createProfilesSelectChain(data: ProfileRow | null) {
  return {
    eq: () => ({
      maybeSingle: async () => ({ data, error: null }),
    }),
  };
}

function createOwnerMembershipSelectChain(data: OwnerMembershipRow | null) {
  return {
    eq: () => ({
      not: () => ({
        order: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data, error: null }),
          }),
        }),
      }),
    }),
  };
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: () => supabaseMock,
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: () => null,
}));

vi.mock('@/lib/owner-newsletter', () => ({
  syncOwnerNewsletterSubscriber: state.syncOwnerNewsletterSubscriber,
}));

vi.mock('@/lib/founding-owner-bonus', () => ({
  maybeGrantFoundingOwnerBonus: vi.fn().mockResolvedValue({ error: null }),
}));

import { completeOnboarding } from '@/app/onboarding/actions';

describe('completeOnboarding owner newsletter opt-in', () => {
  beforeEach(() => {
    profile = {
      role: 'owner',
      display_name: 'Jane Owner',
      full_name: 'Jane Owner',
      country: 'US',
      onboarding_completed: false,
      onboarding_completed_at: null,
    };
    ownerMembership = {
      owner_legal_full_name: 'Jane Owner',
    };
    ownerUpsertPayload = null;
    profileUpdatePayload = null;
    ownerVerificationPayload = null;
    authUpdateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
    state.syncOwnerNewsletterSubscriber.mockReset();

    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'owner-1',
              email: 'owner@example.com',
              user_metadata: { role: 'owner' },
            },
          },
          error: null,
        }),
        updateUser: authUpdateUser,
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => createProfilesSelectChain(profile),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            update: (payload: Record<string, unknown>) => ({
              eq: async () => {
                profileUpdatePayload = payload;
                return { error: null };
              },
            }),
          };
        }

        if (table === 'owner_memberships') {
          return {
            select: () => createOwnerMembershipSelectChain(ownerMembership),
          };
        }

        if (table === 'owners') {
          return {
            upsert: async (payload: Record<string, unknown>) => {
              ownerUpsertPayload = payload;
              return { error: null };
            },
          };
        }

        if (table === 'owner_verifications') {
          return {
            upsert: async (payload: Record<string, unknown>) => {
              ownerVerificationPayload = payload;
              return { error: null };
            },
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };
  });

  test('checked opt-in stores owner consent and syncs subscriber before agreement step', async () => {
    const result = await completeOnboarding({ newsletterOptIn: true });

    expect(result).toEqual({ ok: true, next: '/owner/onboarding/agreement' });
    expect(ownerUpsertPayload).toMatchObject({
      id: 'owner-1',
      user_id: 'owner-1',
      newsletter_opt_in: true,
      newsletter_opt_in_source: 'owner_onboarding',
    });
    expect(ownerUpsertPayload?.newsletter_opt_in_at).toEqual(expect.any(String));
    expect(state.syncOwnerNewsletterSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@example.com',
        fullName: 'Jane Owner',
        userId: 'owner-1',
        country: 'US',
      }),
    );
    expect(profileUpdatePayload).toMatchObject({
      onboarding_completed: true,
    });
    expect(ownerVerificationPayload).toMatchObject({
      owner_id: 'owner-1',
      status: 'not_started',
    });
  });

  test('unchecked opt-in stores false and does not subscribe owner', async () => {
    const result = await completeOnboarding({ newsletterOptIn: false });

    expect(result).toEqual({ ok: true, next: '/owner/onboarding/agreement' });
    expect(ownerUpsertPayload).toMatchObject({
      newsletter_opt_in: false,
      newsletter_opt_in_at: null,
      newsletter_opt_in_source: null,
    });
    expect(state.syncOwnerNewsletterSubscriber).not.toHaveBeenCalled();
  });
});
