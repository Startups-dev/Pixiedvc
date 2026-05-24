import { beforeEach, describe, expect, it, vi } from 'vitest';

const reminderState = vi.hoisted(() => ({
  contracts: [] as Array<Record<string, unknown>>,
  emailLogs: [] as Array<Record<string, unknown>>,
  ownerPayloads: [] as Array<Record<string, unknown>>,
  guestPayloads: [] as Array<Record<string, unknown>>,
  sendContractOwnerAgreementReminderEmail: vi.fn(async (payload: Record<string, unknown>) => {
    reminderState.ownerPayloads.push(payload);
  }),
  sendContractGuestAgreementReminderEmail: vi.fn(async (payload: Record<string, unknown>) => {
    reminderState.guestPayloads.push(payload);
  }),
  getSupabaseAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'contracts') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: reminderState.contracts, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'outbound_emails') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({ data: reminderState.emailLogs, error: null }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: reminderState.getSupabaseAdminClient,
}));

vi.mock('@/lib/email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email')>('@/lib/email');
  return {
    ...actual,
    sendContractOwnerAgreementReminderEmail: reminderState.sendContractOwnerAgreementReminderEmail,
    sendContractGuestAgreementReminderEmail: reminderState.sendContractGuestAgreementReminderEmail,
  };
});

import { runUnsignedAgreementReminders } from '@/lib/unsigned-agreement-reminders';

describe('runUnsignedAgreementReminders', () => {
  beforeEach(() => {
    reminderState.contracts = [];
    reminderState.emailLogs = [];
    reminderState.ownerPayloads = [];
    reminderState.guestPayloads = [];
    reminderState.sendContractOwnerAgreementReminderEmail.mockClear();
    reminderState.sendContractGuestAgreementReminderEmail.mockClear();
    reminderState.getSupabaseAdminClient.mockClear();
    process.env.UNSIGNED_AGREEMENT_REMINDER_HOURS = '24';
  });

  it('sends only the owner reminder when owner signature is missing', async () => {
    reminderState.contracts = [
      {
        id: 101,
        owner_id: 'owner-1',
        booking_request_id: 'booking-1',
        status: 'sent',
        sent_at: '2026-05-20T00:00:00.000Z',
        owner_accept_token: 'owner-token',
        guest_accept_token: 'guest-token',
        owner_accepted_at: null,
        guest_accepted_at: '2026-05-20T12:00:00.000Z',
        snapshot: {
          ownerEmail: 'owner@example.com',
          ownerName: 'Owner Name',
          renterName: 'Guest Name',
          summary: {
            resortName: 'Riviera Resort',
            accommodationType: 'Deluxe Studio',
            checkIn: '2026-06-01',
            checkOut: '2026-06-05',
            pointsRented: 72,
            totalPayableByGuestCents: 180000,
            paidNowCents: 126000,
          },
        },
        signed_copy_emailed_at: null,
      },
    ];
    reminderState.emailLogs = [
      {
        id: 'log-1',
        template_key: 'contract_owner_agreement',
        status: 'sent',
        related_entity_id: null,
        created_at: '2026-05-20T00:10:00.000Z',
        sent_at: '2026-05-20T00:10:00.000Z',
        metadata: { contractId: 101 },
      },
    ];

    const result = await runUnsignedAgreementReminders({
      now: new Date('2026-05-21T10:30:00.000Z'),
    });

    expect(result.ok).toBe(true);
    expect(result.sent).toBe(1);
    expect(reminderState.ownerPayloads).toHaveLength(1);
    expect(reminderState.guestPayloads).toHaveLength(0);
    expect(reminderState.ownerPayloads[0]).toMatchObject({
      templateKey: 'contract_owner_agreement_reminder',
      to: 'owner@example.com',
      agreementUrl: 'http://localhost:3000/contracts/owner-token',
    });
  });

  it('sends only the guest reminder when guest signature is missing', async () => {
    reminderState.contracts = [
      {
        id: 102,
        owner_id: 'owner-1',
        booking_request_id: 'booking-2',
        status: 'sent',
        sent_at: '2026-05-20T00:00:00.000Z',
        owner_accept_token: 'owner-token',
        guest_accept_token: 'guest-token',
        owner_accepted_at: '2026-05-20T08:00:00.000Z',
        guest_accepted_at: null,
        snapshot: {
          renterEmail: 'guest@example.com',
          renterName: 'Guest Name',
          summary: {
            resortName: 'Beach Club Villas',
            accommodationType: '1 Bedroom',
            checkIn: '2026-08-10',
            checkOut: '2026-08-15',
            pointsRented: 130,
            totalPayableByGuestCents: 240000,
            paidNowCents: 168000,
          },
        },
        signed_copy_emailed_at: null,
      },
    ];
    reminderState.emailLogs = [
      {
        id: 'log-2',
        template_key: 'contract_guest_agreement',
        status: 'sent',
        related_entity_id: null,
        created_at: '2026-05-20T00:10:00.000Z',
        sent_at: '2026-05-20T00:10:00.000Z',
        metadata: { contractId: 102 },
      },
    ];

    const result = await runUnsignedAgreementReminders({
      now: new Date('2026-05-21T10:30:00.000Z'),
    });

    expect(result.ok).toBe(true);
    expect(result.sent).toBe(1);
    expect(reminderState.ownerPayloads).toHaveLength(0);
    expect(reminderState.guestPayloads).toHaveLength(1);
    expect(reminderState.guestPayloads[0]).toMatchObject({
      templateKey: 'contract_guest_agreement_reminder',
      to: 'guest@example.com',
    });
  });

  it('skips already accepted contracts and duplicate reminders', async () => {
    reminderState.contracts = [
      {
        id: 103,
        owner_id: 'owner-1',
        booking_request_id: 'booking-3',
        status: 'accepted',
        sent_at: '2026-05-20T00:00:00.000Z',
        owner_accept_token: 'owner-token',
        guest_accept_token: 'guest-token',
        owner_accepted_at: '2026-05-20T08:00:00.000Z',
        guest_accepted_at: '2026-05-20T09:00:00.000Z',
        snapshot: {},
        signed_copy_emailed_at: '2026-05-20T09:05:00.000Z',
      },
      {
        id: 104,
        owner_id: 'owner-1',
        booking_request_id: 'booking-4',
        status: 'sent',
        sent_at: '2026-05-20T00:00:00.000Z',
        owner_accept_token: 'owner-token',
        guest_accept_token: 'guest-token',
        owner_accepted_at: null,
        guest_accepted_at: null,
        snapshot: {
          ownerEmail: 'owner@example.com',
          renterEmail: 'guest@example.com',
        },
        signed_copy_emailed_at: null,
      },
    ];
    reminderState.emailLogs = [
      {
        id: 'log-3',
        template_key: 'contract_owner_agreement',
        status: 'sent',
        related_entity_id: null,
        created_at: '2026-05-20T00:10:00.000Z',
        sent_at: '2026-05-20T00:10:00.000Z',
        metadata: { contractId: 104 },
      },
      {
        id: 'log-4',
        template_key: 'contract_owner_agreement_reminder',
        status: 'sent',
        related_entity_id: null,
        created_at: '2026-05-20T08:10:00.000Z',
        sent_at: '2026-05-20T08:10:00.000Z',
        metadata: { contractId: 104 },
      },
      {
        id: 'log-5',
        template_key: 'contract_guest_agreement',
        status: 'sent',
        related_entity_id: null,
        created_at: '2026-05-20T00:11:00.000Z',
        sent_at: '2026-05-20T00:11:00.000Z',
        metadata: { contractId: 104 },
      },
      {
        id: 'log-6',
        template_key: 'contract_guest_agreement_reminder',
        status: 'sent',
        related_entity_id: null,
        created_at: '2026-05-20T08:11:00.000Z',
        sent_at: '2026-05-20T08:11:00.000Z',
        metadata: { contractId: 104 },
      },
    ];

    const result = await runUnsignedAgreementReminders({
      now: new Date('2026-05-21T10:30:00.000Z'),
    });

    expect(result.ok).toBe(true);
    expect(result.sent).toBe(0);
    expect(result.skipped).toContainEqual({ contractId: 104, role: 'owner', reason: 'already_reminded' });
    expect(result.skipped).toContainEqual({ contractId: 104, role: 'guest', reason: 'already_reminded' });
  });

  it('skips safely when recipient email or token is missing', async () => {
    reminderState.contracts = [
      {
        id: 105,
        owner_id: 'owner-1',
        booking_request_id: 'booking-5',
        status: 'sent',
        sent_at: '2026-05-20T00:00:00.000Z',
        owner_accept_token: null,
        guest_accept_token: 'guest-token',
        owner_accepted_at: null,
        guest_accepted_at: null,
        snapshot: {
          ownerEmail: 'owner@example.com',
          renterEmail: null,
        },
        signed_copy_emailed_at: null,
      },
    ];
    reminderState.emailLogs = [
      {
        id: 'log-7',
        template_key: 'contract_owner_agreement',
        status: 'sent',
        related_entity_id: null,
        created_at: '2026-05-20T00:10:00.000Z',
        sent_at: '2026-05-20T00:10:00.000Z',
        metadata: { contractId: 105 },
      },
      {
        id: 'log-8',
        template_key: 'contract_guest_agreement',
        status: 'sent',
        related_entity_id: null,
        created_at: '2026-05-20T00:11:00.000Z',
        sent_at: '2026-05-20T00:11:00.000Z',
        metadata: { contractId: 105 },
      },
    ];

    const result = await runUnsignedAgreementReminders({
      now: new Date('2026-05-21T10:30:00.000Z'),
    });

    expect(result.ok).toBe(true);
    expect(result.sent).toBe(0);
    expect(result.skipped).toContainEqual({ contractId: 105, role: 'owner', reason: 'signing_url_missing' });
    expect(result.skipped).toContainEqual({ contractId: 105, role: 'guest', reason: 'recipient_email_missing' });
  });
});
