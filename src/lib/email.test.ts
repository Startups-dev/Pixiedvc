import { beforeEach, describe, expect, it, vi } from 'vitest';

const emailTestState = vi.hoisted(() => ({
  insertRecords: [] as Record<string, unknown>[],
  updateRecords: [] as Array<{ id: string; payload: Record<string, unknown> }>,
  nextLogId: 1,
  getSupabaseAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table !== 'outbound_emails') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        insert: (payload: Record<string, unknown>) => {
          emailTestState.insertRecords.push(payload);
          const id = `log-${emailTestState.nextLogId++}`;
          return {
            select: () => ({
              maybeSingle: async () => ({ data: { id }, error: null }),
            }),
          };
        },
        update: (payload: Record<string, unknown>) => ({
          eq: async (_column: string, id: string) => {
            emailTestState.updateRecords.push({ id, payload });
            return { error: null };
          },
        }),
      };
    },
  })),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: emailTestState.getSupabaseAdminClient,
}));

import {
  sendBookingConfirmationEmail,
  sendOwnerMatchEmail,
  sendReadyStayBookingPackageToOwner,
} from '@/lib/email';

describe('email outbound logging', () => {
  beforeEach(() => {
    emailTestState.insertRecords.length = 0;
    emailTestState.updateRecords.length = 0;
    emailTestState.nextLogId = 1;
    emailTestState.getSupabaseAdminClient.mockClear();
    vi.restoreAllMocks();
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.RESEND_FROM_EMAIL = 'bookings@pixiedvc.com';
  });

  it('logs guest booking confirmation as sent and captures the Resend message id', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 're_123' }),
    }) as typeof fetch;

    await sendBookingConfirmationEmail({
      to: 'guest@example.com',
      name: 'Guest',
      resortName: 'Riviera Resort',
      checkIn: '2026-06-01',
      checkOut: '2026-06-05',
      tripUrl: 'https://pixiedvc.com/trips/request-123',
      templateKey: 'guest_booking_confirmation',
      recipientUserId: '11111111-1111-1111-1111-111111111111',
      relatedEntityType: 'booking_request',
      relatedEntityId: '22222222-2222-2222-2222-222222222222',
      metadata: {
        bookingId: '22222222-2222-2222-2222-222222222222',
      },
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as { subject: string; text: string; html?: string };
    expect(payload.subject).toBe('We received your PixieDVC stay request');
    expect(payload.text).toContain('No payment is required at this stage.');
    expect(payload.html).toContain('PixieDVC');
    expect(payload.html).toContain('View Request');
    expect(emailTestState.insertRecords).toHaveLength(1);
    expect(emailTestState.insertRecords[0]).toMatchObject({
      template_key: 'guest_booking_confirmation',
      recipient_email: 'guest@example.com',
      recipient_user_id: '11111111-1111-1111-1111-111111111111',
      related_entity_type: 'booking_request',
      related_entity_id: '22222222-2222-2222-2222-222222222222',
      status: 'pending',
      provider: 'resend',
    });
    expect(emailTestState.updateRecords).toHaveLength(1);
    expect(emailTestState.updateRecords[0]).toMatchObject({
      id: 'log-1',
      payload: {
        status: 'sent',
        provider_message_id: 're_123',
        error_message: null,
      },
    });
  });

  it('logs owner match email failures without changing send semantics', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'provider rejected request',
    }) as typeof fetch;

    await expect(
      sendOwnerMatchEmail({
        to: 'owner@example.com',
        ownerName: 'Owner',
        guestName: 'Guest',
        resortName: 'Grand Floridian Villas',
        checkIn: '2026-11-10',
        checkOut: '2026-11-14',
        points: 120,
        acceptUrl: 'https://pixiedvc.com/api/matches/owner/accept?matchId=33333333-3333-3333-3333-333333333333',
        declineUrl: 'https://pixiedvc.com/api/matches/owner/decline?matchId=33333333-3333-3333-3333-333333333333',
        templateKey: 'owner_match_waiting',
        relatedEntityType: 'booking_match',
        relatedEntityId: '33333333-3333-3333-3333-333333333333',
        metadata: {
          bookingId: '44444444-4444-4444-4444-444444444444',
          matchId: '33333333-3333-3333-3333-333333333333',
        },
      }),
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(1);
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as { text: string; html?: string };
    expect(payload.text).toContain('Guest: Guest');
    expect(payload.text).toContain('Points needed: 120 pts');
    expect(payload.text).toContain('https://pixiedvc.com/api/matches/owner/accept');
    expect(payload.html).toContain('24 hours');
    expect(payload.html).not.toContain('localhost');
    expect(emailTestState.insertRecords[0]).toMatchObject({
      template_key: 'owner_match_waiting',
      recipient_email: 'owner@example.com',
      related_entity_type: 'booking_match',
      related_entity_id: '33333333-3333-3333-3333-333333333333',
    });
    expect(emailTestState.updateRecords[0]).toMatchObject({
      id: 'log-1',
      payload: {
        status: 'failed',
        error_message: 'provider rejected request',
      },
    });
  });

  it('logs ready stay booking package emails once per send', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 're_456' }),
    }) as typeof fetch;

    await sendReadyStayBookingPackageToOwner({
      to: 'owner@example.com',
      ownerName: 'Owner',
      resortName: 'BoardWalk Villas',
      roomType: 'Studio',
      checkIn: '2026-05-30',
      checkOut: '2026-06-02',
      points: 40,
      guestName: 'Guest',
      guestEmail: 'guest@example.com',
      guestPhone: '555-555-5555',
      accessibilityRequired: false,
      notes: null,
      guests: [],
      transferUrl: 'https://pixiedvc.com/owner/ready-stays',
      templateKey: 'ready_stay_booking_package',
      recipientUserId: '55555555-5555-5555-5555-555555555555',
      relatedEntityType: 'ready_stay',
      relatedEntityId: '66666666-6666-6666-6666-666666666666',
      metadata: {
        bookingId: '77777777-7777-7777-7777-777777777777',
        readyStayId: '66666666-6666-6666-6666-666666666666',
      },
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as { subject: string; text: string; html?: string };
    expect(payload.subject).toBe('PixieDVC - Ready Stay booking package');
    expect(payload.text).toContain('Open owner action page: https://pixiedvc.com/owner/ready-stays');
    expect(payload.html).toContain('Open Owner Dashboard');
    expect(payload.html).not.toContain('localhost');
    expect(emailTestState.insertRecords).toHaveLength(1);
    expect(emailTestState.updateRecords).toHaveLength(1);
    expect(emailTestState.insertRecords[0]).toMatchObject({
      template_key: 'ready_stay_booking_package',
      recipient_email: 'owner@example.com',
    });
  });

  it('sendPlainEmail still sends text fallback and optional html', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 're_789' }),
    }) as typeof fetch;

    const { sendPlainEmail } = await import('@/lib/email');

    await sendPlainEmail({
      to: 'guest@example.com',
      subject: 'Plain Email',
      body: 'Fallback text body',
      html: '<p>HTML body</p>',
      context: 'plain email test',
      templateKey: 'plain_test',
    });

    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as { text: string; html?: string };
    expect(payload.text).toBe('Fallback text body');
    expect(payload.html).toBe('<p>HTML body</p>');
  });
});
