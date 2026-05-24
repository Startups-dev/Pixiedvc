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
  sendAbandonedGuestBookingRequestEmail,
  sendConciergeHandoffNotification,
  sendContractGuestAgreementEmail,
  sendContractGuestAgreementReminderEmail,
  sendContractOwnerAgreementEmail,
  sendContractOwnerAgreementReminderEmail,
  sendBookingConfirmationEmail,
  sendGuestAgreementSignedEmail,
  sendOwnerMatchEmail,
  sendOwnerMatchReminderEmail,
  sendOwnerAgreementSignedEmail,
  sendReadyStayLinkReadyEmail,
  sendReadyStayBookingPackageToOwner,
  sendReadyStayRejectedEmail,
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

  it('sends abandoned booking recovery emails with html and text', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 're_1201' }),
    }) as typeof fetch;

    await sendAbandonedGuestBookingRequestEmail({
      to: 'guest@example.com',
      guestName: 'Guest',
      resortName: 'Riviera Resort',
      checkIn: '2026-06-01',
      checkOut: '2026-06-05',
      resumeUrl: 'https://pixiedvc.com/stay-builder',
      templateKey: 'abandoned_guest_booking_request',
      recipientUserId: '11111111-1111-1111-1111-111111111111',
      relatedEntityType: 'booking_request',
      relatedEntityId: '22222222-2222-2222-2222-222222222222',
      metadata: { bookingId: '22222222-2222-2222-2222-222222222222' },
    });

    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as { subject: string; text: string; html?: string };
    expect(payload.subject).toBe('Still planning your Disney villa stay?');
    expect(payload.text).toContain('No payment is required to submit a request.');
    expect(payload.html).toContain('Continue Your Request');
    expect(payload.html).not.toContain('localhost');
    expect(emailTestState.insertRecords[0]).toMatchObject({
      template_key: 'abandoned_guest_booking_request',
      recipient_email: 'guest@example.com',
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

  it('logs owner match reminder emails with html and text', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 're_1240' }),
    }) as typeof fetch;

    await sendOwnerMatchReminderEmail({
      to: 'owner@example.com',
      ownerName: 'Owner',
      guestName: 'Guest',
      resortName: 'BoardWalk Villas',
      checkIn: '2026-05-30',
      checkOut: '2026-06-02',
      points: 40,
      acceptUrl: 'https://pixiedvc.com/api/matches/owner/accept?matchId=33333333-3333-3333-3333-333333333333',
      declineUrl: 'https://pixiedvc.com/api/matches/owner/decline?matchId=33333333-3333-3333-3333-333333333333',
      templateKey: 'owner_match_waiting_reminder',
      relatedEntityType: 'booking_match',
      relatedEntityId: '33333333-3333-3333-3333-333333333333',
      metadata: {
        bookingId: '44444444-4444-4444-4444-444444444444',
        matchId: '33333333-3333-3333-3333-333333333333',
      },
    });

    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as { subject: string; text: string; html?: string };
    expect(payload.subject).toBe('Reminder: guest request waiting at BoardWalk Villas');
    expect(payload.text).toContain('Just a quick reminder');
    expect(payload.text).toContain('Points needed: 40 pts');
    expect(payload.html).toContain('Respond to Request');
    expect(emailTestState.insertRecords[0]).toMatchObject({
      template_key: 'owner_match_waiting_reminder',
      recipient_email: 'owner@example.com',
      related_entity_type: 'booking_match',
      related_entity_id: '33333333-3333-3333-3333-333333333333',
    });
    expect(emailTestState.updateRecords[0]).toMatchObject({
      id: 'log-1',
      payload: {
        status: 'sent',
        provider_message_id: 're_1240',
        error_message: null,
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

  it('sends branded owner contract agreement emails with html and logs the subject', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 're_901' }),
    }) as typeof fetch;

    await sendContractOwnerAgreementEmail({
      to: 'owner@example.com',
      ownerName: 'Owner',
      guestName: 'Guest',
      resortName: 'Riviera Resort',
      roomType: 'Deluxe Studio',
      checkIn: '2026-06-01',
      checkOut: '2026-06-05',
      points: 72,
      totalUsd: '$1,800.00',
      agreementUrl: 'https://pixiedvc.com/contracts/owner-token',
      templateKey: 'contract_owner_agreement',
      relatedEntityType: 'contract',
      relatedEntityId: '123',
      metadata: { contractId: 123 },
    });

    const request = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as { subject: string; text: string; html?: string };
    expect(payload.subject).toBe('PixieDVC - Owner agreement ready for review');
    expect(payload.text).toContain('Review and sign: https://pixiedvc.com/contracts/owner-token');
    expect(payload.html).toContain('Review &amp; Sign');
    expect(emailTestState.insertRecords[0]).toMatchObject({
      subject: 'PixieDVC - Owner agreement ready for review',
      template_key: 'contract_owner_agreement',
    });
  });

  it('sends guest agreement and signed follow-up templates with html', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 're_902' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 're_903' }),
      }) as typeof fetch;

    await sendContractGuestAgreementEmail({
      to: 'guest@example.com',
      guestName: 'Guest',
      resortName: 'Beach Club Villas',
      roomType: '1 Bedroom',
      checkIn: '2026-08-10',
      checkOut: '2026-08-15',
      points: 130,
      totalUsd: '$2,400.00',
      paidNowUsd: '$1,680.00',
      agreementUrl: 'https://pixiedvc.com/contracts/guest-token',
      templateKey: 'contract_guest_agreement',
      relatedEntityType: 'contract',
      relatedEntityId: '124',
      metadata: { contractId: 124 },
    });

    await sendGuestAgreementSignedEmail({
      to: 'guest@example.com',
      guestName: 'Guest',
      resortName: 'Beach Club Villas',
      checkIn: '2026-08-10',
      checkOut: '2026-08-15',
      agreementUrl: 'https://pixiedvc.com/contracts/guest-token',
      templateKey: 'guest_agreement_signed',
      relatedEntityType: 'contract',
      relatedEntityId: '124',
      metadata: { contractId: 124 },
    });

    const firstPayload = JSON.parse(
      String(((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit).body),
    ) as { text: string; html?: string };
    const secondPayload = JSON.parse(
      String(((fetch as ReturnType<typeof vi.fn>).mock.calls[1]?.[1] as RequestInit).body),
    ) as { text: string; html?: string };

    expect(firstPayload.text).toContain('Due now: $1,680.00');
    expect(firstPayload.html).not.toContain('localhost');
    expect(secondPayload.text).toContain('Our concierge team will follow up');
    expect(secondPayload.html).toContain('View Agreement');
  });

  it('sends contract reminder templates with html', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 're_9041' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 're_9042' }),
      }) as typeof fetch;

    await sendContractOwnerAgreementReminderEmail({
      to: 'owner@example.com',
      ownerName: 'Owner',
      guestName: 'Guest',
      resortName: 'Riviera Resort',
      roomType: 'Deluxe Studio',
      checkIn: '2026-06-01',
      checkOut: '2026-06-05',
      points: 72,
      totalUsd: '$1,800.00',
      agreementUrl: 'https://pixiedvc.com/contracts/owner-token',
      templateKey: 'contract_owner_agreement_reminder',
      relatedEntityType: 'contract',
      metadata: { contractId: 123, recipientRole: 'owner' },
    });

    await sendContractGuestAgreementReminderEmail({
      to: 'guest@example.com',
      guestName: 'Guest',
      resortName: 'Beach Club Villas',
      roomType: '1 Bedroom',
      checkIn: '2026-08-10',
      checkOut: '2026-08-15',
      points: 130,
      totalUsd: '$2,400.00',
      paidNowUsd: '$1,680.00',
      agreementUrl: 'https://pixiedvc.com/contracts/guest-token',
      templateKey: 'contract_guest_agreement_reminder',
      relatedEntityType: 'contract',
      metadata: { contractId: 124, recipientRole: 'guest' },
    });

    const ownerPayload = JSON.parse(
      String(((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit).body),
    ) as { subject: string; text: string; html?: string };
    const guestPayload = JSON.parse(
      String(((fetch as ReturnType<typeof vi.fn>).mock.calls[1]?.[1] as RequestInit).body),
    ) as { subject: string; text: string; html?: string };

    expect(ownerPayload.subject).toBe('Reminder: your PixieDVC owner agreement is ready');
    expect(ownerPayload.text).toContain('Just a quick reminder');
    expect(ownerPayload.html).toContain('Review &amp; Sign');
    expect(guestPayload.subject).toBe('Reminder: your PixieDVC rental agreement is ready');
    expect(guestPayload.text).toContain('Completing the agreement helps keep your reservation moving forward.');
    expect(guestPayload.html).not.toContain('localhost');
  });

  it('sends ready stay operational emails with html', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 're_904' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 're_905' }) }) as typeof fetch;

    await sendReadyStayLinkReadyEmail({
      to: 'guest@example.com',
      guestName: 'Guest',
      confirmationNumber: 'ABC123',
      tripUrl: 'https://pixiedvc.com/my-trip/booking-1',
      templateKey: 'ready_stay_link_ready',
      recipientUserId: 'guest-1',
      relatedEntityType: 'booking_request',
      relatedEntityId: 'booking-1',
      metadata: { bookingId: 'booking-1' },
    });

    await sendReadyStayRejectedEmail({
      to: 'owner@example.com',
      ownerName: 'Owner',
      resortName: 'Animal Kingdom Villas',
      roomType: 'Savanna View',
      dates: '6/1/2026 - 6/5/2026',
      reason: 'Please clarify the reservation details.',
      templateKey: 'ready_stay_rejected',
      recipientUserId: 'owner-1',
      relatedEntityType: 'ready_stay',
      relatedEntityId: 'stay-1',
      metadata: { readyStayId: 'stay-1' },
    });

    const firstPayload = JSON.parse(
      String(((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit).body),
    ) as { subject: string; html?: string };
    const secondPayload = JSON.parse(
      String(((fetch as ReturnType<typeof vi.fn>).mock.calls[1]?.[1] as RequestInit).body),
    ) as { html?: string };

    expect(firstPayload.subject).toBe('Your Disney reservation is ready to link');
    expect(firstPayload.html).toContain('Open Trip');
    expect(secondPayload.html).toContain('More information needed');
    expect(secondPayload.html).toContain('Please clarify the reservation details.');
  });

  it('sends concierge handoff and escalation emails with branded html', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 're_906' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 're_907' }) }) as typeof fetch;

    await sendConciergeHandoffNotification({
      conversationId: 'conv-1',
      name: 'Guest',
      email: 'guest@example.com',
      message: 'Need help with Riviera availability.',
      pageUrl: 'https://pixiedvc.com/guides/riviera',
      source: 'handoff',
    });

    await sendConciergeHandoffNotification({
      conversationId: 'conv-2',
      email: 'guest@example.com',
      message: 'Escalating issue',
      pageUrl: 'https://pixiedvc.com/support',
      source: 'escalate',
    });

    const handoffPayload = JSON.parse(
      String(((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit).body),
    ) as { subject: string; html?: string };
    const escalationPayload = JSON.parse(
      String(((fetch as ReturnType<typeof vi.fn>).mock.calls[1]?.[1] as RequestInit).body),
    ) as { subject: string; html?: string };

    expect(handoffPayload.subject).toBe('New concierge follow-up request');
    expect(handoffPayload.html).toContain('Concierge follow-up requested');
    expect(escalationPayload.subject).toBe('Support case escalated for concierge follow-up');
    expect(escalationPayload.html).toContain('Support case escalated');
  });

  it('sends owner agreement signed notifications with html', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 're_908' }),
    }) as typeof fetch;

    await sendOwnerAgreementSignedEmail({
      to: 'owner@example.com',
      ownerName: 'Owner',
      guestName: 'Guest',
      resortName: 'Copper Creek',
      checkIn: '2026-09-01',
      checkOut: '2026-09-06',
      rentalUrl: 'https://pixiedvc.com/owner/rentals/1',
      templateKey: 'owner_agreement_signed',
      relatedEntityType: 'contract',
      relatedEntityId: '125',
      metadata: { contractId: 125 },
    });

    const payload = JSON.parse(String(((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit).body)) as {
      subject: string;
      html?: string;
    };
    expect(payload.subject).toBe('PixieDVC - Guest agreement completed');
    expect(payload.html).toContain('View Reservation');
  });
});
