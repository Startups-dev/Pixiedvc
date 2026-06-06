import { beforeEach, describe, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  syncOwnerNewsletterSubscriber: vi.fn(),
}));

const createSupabaseServerClient = vi.fn();
const getSupabaseAdminClient = vi.fn();
const emailIsAllowedForAdmin = vi.fn();
const maybeGrantFoundingOwnerBonus = vi.fn();

let verificationUpdatePayload: Record<string, unknown> | null;
let ownerUpdatePayload: Record<string, unknown> | null;
let ownerLookupRow: Record<string, unknown> | null;

function makeAdminClient() {
  return {
    from: (table: string) => {
      if (table === 'owner_verifications') {
        return {
          update: (payload: Record<string, unknown>) => ({
            eq: async () => {
              verificationUpdatePayload = payload;
              return { error: null };
            },
          }),
        };
      }

      if (table === 'owners') {
        return {
          update: (payload: Record<string, unknown>) => ({
            eq: async () => {
              ownerUpdatePayload = payload;
              return { error: null };
            },
          }),
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: ownerLookupRow, error: null }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: () => createSupabaseServerClient(),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: () => getSupabaseAdminClient(),
}));

vi.mock('@/lib/admin-emails', () => ({
  emailIsAllowedForAdmin: (...args: unknown[]) => emailIsAllowedForAdmin(...args),
}));

vi.mock('@/lib/founding-owner-bonus', () => ({
  maybeGrantFoundingOwnerBonus: (...args: unknown[]) => maybeGrantFoundingOwnerBonus(...args),
}));

vi.mock('@/lib/owner-newsletter', () => ({
  syncOwnerNewsletterSubscriber: state.syncOwnerNewsletterSubscriber,
}));

import { POST } from '@/app/api/admin/owners/verifications/[ownerId]/approve/route';

describe('POST /api/admin/owners/verifications/[ownerId]/approve', () => {
  beforeEach(() => {
    verificationUpdatePayload = null;
    ownerUpdatePayload = null;
    ownerLookupRow = {
      id: 'owner-1',
      user_id: 'user-1',
      email: null,
      newsletter_opt_in: true,
      profiles: {
        email: 'owner@example.com',
        full_name: 'Jane Owner',
        country: 'US',
      },
    };
    state.syncOwnerNewsletterSubscriber.mockReset();
    createSupabaseServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        }),
      },
    });
    getSupabaseAdminClient.mockReturnValue(makeAdminClient());
    emailIsAllowedForAdmin.mockReturnValue(true);
    maybeGrantFoundingOwnerBonus.mockResolvedValue({ error: null });
  });

  test('re-syncs opted-in owners after verification approval', async () => {
    const response = await POST(new Request('http://localhost/api/admin/owners/verifications/owner-1/approve', {
      method: 'POST',
    }), { params: Promise.resolve({ ownerId: 'owner-1' }) });

    expect(response.status).toBe(307);
    expect(verificationUpdatePayload).toMatchObject({
      status: 'approved',
    });
    expect(ownerUpdatePayload).toMatchObject({
      verification: 'verified',
    });
    expect(state.syncOwnerNewsletterSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@example.com',
        fullName: 'Jane Owner',
        userId: 'user-1',
        country: 'US',
      }),
    );
  });
});
