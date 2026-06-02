import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeState = vi.hoisted(() => ({
  upsertCalls: [] as Record<string, unknown>[],
  ingestCalls: [] as Record<string, unknown>[],
  adminMissing: false,
  upsertError: null as { message: string } | null,
  ingestError: null as Error | null,
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: vi.fn(() => {
    if (routeState.adminMissing) return null;
    return {
      from: (table: string) => {
        if (table !== 'email_leads') {
          throw new Error(`Unexpected table: ${table}`);
        }
        return {
          upsert: async (payload: Record<string, unknown>) => {
            routeState.upsertCalls.push(payload);
            return { error: routeState.upsertError };
          },
        };
      },
    };
  }),
}));

vi.mock('@/lib/email-subscribers', () => ({
  ingestSubscriber: vi.fn(async (payload: Record<string, unknown>) => {
    routeState.ingestCalls.push(payload);
    if (routeState.ingestError) {
      throw routeState.ingestError;
    }
    return { id: 'subscriber-1' };
  }),
}));

import { POST } from '@/app/api/email-leads/route';

describe('POST /api/email-leads', () => {
  beforeEach(() => {
    routeState.upsertCalls.length = 0;
    routeState.ingestCalls.length = 0;
    routeState.adminMissing = false;
    routeState.upsertError = null;
    routeState.ingestError = null;
    vi.restoreAllMocks();
  });

  it('preserves legacy email lead capture and syncs to email_subscribers', async () => {
    const response = await POST(
      new Request('http://localhost/api/email-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'guest@example.com', source: 'hero_bar' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(routeState.upsertCalls).toEqual([{ email: 'guest@example.com', source: 'hero_bar' }]);
    expect(routeState.ingestCalls[0]).toMatchObject({
      email: 'guest@example.com',
      source: 'hero_bar',
      tags: ['newsletter_subscriber', 'guest_lead'],
      explicitConsent: true,
      emailPreferences: { marketing: true },
    });
  });

  it('returns success even if subscriber sync fails after the legacy lead write', async () => {
    routeState.ingestError = new Error('subscriber sync failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(
      new Request('http://localhost/api/email-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'guest@example.com', source: 'bottom_cta' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(routeState.upsertCalls).toHaveLength(1);
    expect(errorSpy).toHaveBeenCalledWith(
      '[email-leads] failed to sync subscriber',
      expect.objectContaining({ email: 'guest@example.com', source: 'bottom_cta', message: 'subscriber sync failed' }),
    );
  });
});
