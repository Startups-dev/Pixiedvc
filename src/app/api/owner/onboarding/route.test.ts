import { beforeEach, describe, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({
  syncOwnerNewsletterSubscriber: vi.fn(),
}));

let ownerRecord: { id: string; metadata?: Record<string, unknown> | null } | null;
let upsertPayload: Record<string, unknown> | null;
let profileUpsertPayload: Record<string, unknown> | null;
let authUpdatePayload: Record<string, unknown> | null;

const createSupabaseServerClient = vi.fn();
const getSupabaseAdminClient = vi.fn();

function makeAdminClient() {
  return {
    from: (table: string) => {
      if (table === 'owners') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: ownerRecord, error: null }),
            }),
          }),
          upsert: async (payload: Record<string, unknown>) => {
            upsertPayload = payload;
            ownerRecord = { id: String(payload.id), metadata: (payload.metadata as Record<string, unknown>) ?? null };
            return { error: null };
          },
          update: (payload: Record<string, unknown>) => ({
            eq: () => ({
              is: async () => {
                void payload;
                return { error: null };
              },
            }),
          }),
        };
      }

      if (table === 'profiles') {
        return {
          upsert: async (payload: Record<string, unknown>) => {
            profileUpsertPayload = payload;
            return { error: null };
          },
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

vi.mock('@/lib/owner-newsletter', () => ({
  syncOwnerNewsletterSubscriber: state.syncOwnerNewsletterSubscriber,
}));

import { POST } from '@/app/api/owner/onboarding/route';

describe('POST /api/owner/onboarding', () => {
  beforeEach(() => {
    ownerRecord = null;
    upsertPayload = null;
    profileUpsertPayload = null;
    authUpdatePayload = null;
    state.syncOwnerNewsletterSubscriber.mockReset();
    createSupabaseServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'owner-1', email: 'owner@example.com', user_metadata: {} } },
        }),
        updateUser: vi.fn().mockImplementation(async (payload) => {
          authUpdatePayload = payload;
          return { data: { user: null }, error: null };
        }),
      },
    });
    getSupabaseAdminClient.mockReturnValue(makeAdminClient());
  });

  test('checked opt-in stores consent fields and syncs subscriber', async () => {
    const request = new Request('http://localhost/api/owner/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerLegalName: 'Jane Owner',
        newsletterOptIn: true,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(upsertPayload).toMatchObject({
      newsletter_opt_in: true,
      newsletter_opt_in_source: 'owner_onboarding',
    });
    expect(upsertPayload?.newsletter_opt_in_at).toEqual(expect.any(String));
    expect(state.syncOwnerNewsletterSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'owner@example.com',
        fullName: 'Jane Owner',
        userId: 'owner-1',
      }),
    );
    expect(profileUpsertPayload).toMatchObject({
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'owner',
      onboarding_completed: true,
    });
    expect(profileUpsertPayload?.onboarding_completed_at).toEqual(expect.any(String));
    expect(authUpdatePayload).toEqual({
      data: {
        onboarding_completed: true,
        role: 'owner',
      },
    });
  });

  test('unchecked opt-in stores false and does not sync subscriber', async () => {
    const request = new Request('http://localhost/api/owner/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerLegalName: 'Jane Owner',
        newsletterOptIn: false,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(upsertPayload).toMatchObject({
      newsletter_opt_in: false,
      newsletter_opt_in_at: null,
      newsletter_opt_in_source: null,
    });
    expect(state.syncOwnerNewsletterSubscriber).not.toHaveBeenCalled();
  });
});
