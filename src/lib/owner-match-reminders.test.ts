import { beforeEach, describe, expect, it, vi } from 'vitest';

const reminderState = vi.hoisted(() => ({
  matches: [] as Array<Record<string, unknown>>,
  emailLogs: [] as Array<Record<string, unknown>>,
  lastPayload: null as Record<string, unknown> | null,
  sendOwnerMatchReminderEmail: vi.fn(async (payload: Record<string, unknown>) => {
    reminderState.lastPayload = payload;
  }),
  getSupabaseAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'booking_matches') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: reminderState.matches, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'outbound_emails') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                in: async () => ({ data: reminderState.emailLogs, error: null }),
              }),
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
    sendOwnerMatchReminderEmail: reminderState.sendOwnerMatchReminderEmail,
  };
});

import { runOwnerMatchReminders } from '@/lib/owner-match-reminders';

describe('runOwnerMatchReminders', () => {
  beforeEach(() => {
    reminderState.matches = [];
    reminderState.emailLogs = [];
    reminderState.lastPayload = null;
    reminderState.sendOwnerMatchReminderEmail.mockClear();
    reminderState.getSupabaseAdminClient.mockClear();
    process.env.OWNER_MATCH_REMINDER_HOURS = '18';
  });

  it('sends one reminder for an old pending owner match with an original sent email', async () => {
    reminderState.matches = [
      {
        id: 'match-1',
        booking_id: 'booking-1',
        owner_id: 'owner-1',
        status: 'pending_owner',
        created_at: '2026-02-01T00:00:00.000Z',
        responded_at: null,
        booking: {
          id: 'booking-1',
          status: 'pending_owner',
          availability_status: 'confirmed',
          total_points: 120,
          check_in: '2026-11-10',
          check_out: '2026-11-14',
          lead_guest_name: 'Helena Aranha',
          primary_resort: { name: 'Grand Floridian Villas' },
        },
        owner: {
          id: 'owner-1',
          display_name: 'Owner Name',
          payout_email: null,
          profiles: {
            id: 'profile-1',
            email: 'owner@example.com',
            payout_email: null,
            display_name: 'Owner Name',
          },
        },
      },
    ];
    reminderState.emailLogs = [
      {
        id: 'email-1',
        template_key: 'owner_match_waiting',
        status: 'sent',
        related_entity_id: 'match-1',
        created_at: '2026-02-01T00:10:00.000Z',
        sent_at: '2026-02-01T00:10:00.000Z',
      },
    ];

    const result = await runOwnerMatchReminders({
      now: new Date('2026-02-02T00:30:00.000Z'),
    });

    expect(result.ok).toBe(true);
    expect(result.sent).toBe(1);
    expect(reminderState.sendOwnerMatchReminderEmail).toHaveBeenCalledTimes(1);
    expect(reminderState.lastPayload).toMatchObject({
      to: 'owner@example.com',
      templateKey: 'owner_match_waiting_reminder',
      relatedEntityId: 'match-1',
      points: 120,
      guestName: 'Helena Aranha',
    });
  });

  it('skips recent matches below the reminder threshold', async () => {
    reminderState.matches = [
      {
        id: 'match-1',
        booking_id: 'booking-1',
        owner_id: 'owner-1',
        status: 'pending_owner',
        created_at: '2026-02-01T00:00:00.000Z',
        responded_at: null,
        booking: {
          id: 'booking-1',
          status: 'pending_owner',
          availability_status: 'confirmed',
          total_points: 120,
          check_in: '2026-11-10',
          check_out: '2026-11-14',
          lead_guest_name: 'Helena Aranha',
          primary_resort: { name: 'Grand Floridian Villas' },
        },
        owner: {
          id: 'owner-1',
          display_name: 'Owner Name',
          payout_email: null,
          profiles: {
            id: 'profile-1',
            email: 'owner@example.com',
            payout_email: null,
            display_name: 'Owner Name',
          },
        },
      },
    ];
    reminderState.emailLogs = [
      {
        id: 'email-1',
        template_key: 'owner_match_waiting',
        status: 'sent',
        related_entity_id: 'match-1',
        created_at: '2026-02-01T12:10:00.000Z',
        sent_at: '2026-02-01T12:10:00.000Z',
      },
    ];

    const result = await runOwnerMatchReminders({
      now: new Date('2026-02-02T00:00:00.000Z'),
    });

    expect(result.sent).toBe(0);
    expect(result.skipped).toContainEqual({ matchId: 'match-1', reason: 'below_threshold' });
    expect(reminderState.sendOwnerMatchReminderEmail).not.toHaveBeenCalled();
  });

  it('prevents duplicate reminders when one already exists', async () => {
    reminderState.matches = [
      {
        id: 'match-1',
        booking_id: 'booking-1',
        owner_id: 'owner-1',
        status: 'pending_owner',
        created_at: '2026-02-01T00:00:00.000Z',
        responded_at: null,
        booking: {
          id: 'booking-1',
          status: 'pending_owner',
          availability_status: 'confirmed',
          total_points: 120,
          check_in: '2026-11-10',
          check_out: '2026-11-14',
          lead_guest_name: 'Helena Aranha',
          primary_resort: { name: 'Grand Floridian Villas' },
        },
        owner: {
          id: 'owner-1',
          display_name: 'Owner Name',
          payout_email: null,
          profiles: {
            id: 'profile-1',
            email: 'owner@example.com',
            payout_email: null,
            display_name: 'Owner Name',
          },
        },
      },
    ];
    reminderState.emailLogs = [
      {
        id: 'email-1',
        template_key: 'owner_match_waiting',
        status: 'sent',
        related_entity_id: 'match-1',
        created_at: '2026-02-01T00:10:00.000Z',
        sent_at: '2026-02-01T00:10:00.000Z',
      },
      {
        id: 'email-2',
        template_key: 'owner_match_waiting_reminder',
        status: 'sent',
        related_entity_id: 'match-1',
        created_at: '2026-02-01T20:10:00.000Z',
        sent_at: '2026-02-01T20:10:00.000Z',
      },
    ];

    const result = await runOwnerMatchReminders({
      now: new Date('2026-02-02T12:00:00.000Z'),
    });

    expect(result.sent).toBe(0);
    expect(result.skipped).toContainEqual({ matchId: 'match-1', reason: 'already_reminded' });
    expect(reminderState.sendOwnerMatchReminderEmail).not.toHaveBeenCalled();
  });

  it('skips matches when the original owner email was never sent', async () => {
    reminderState.matches = [
      {
        id: 'match-1',
        booking_id: 'booking-1',
        owner_id: 'owner-1',
        status: 'pending_owner',
        created_at: '2026-02-01T00:00:00.000Z',
        responded_at: null,
        booking: {
          id: 'booking-1',
          status: 'pending_owner',
          availability_status: 'confirmed',
          total_points: 120,
          check_in: '2026-11-10',
          check_out: '2026-11-14',
          lead_guest_name: 'Helena Aranha',
          primary_resort: { name: 'Grand Floridian Villas' },
        },
        owner: {
          id: 'owner-1',
          display_name: 'Owner Name',
          payout_email: null,
          profiles: {
            id: 'profile-1',
            email: 'owner@example.com',
            payout_email: null,
            display_name: 'Owner Name',
          },
        },
      },
    ];
    reminderState.emailLogs = [
      {
        id: 'email-1',
        template_key: 'owner_match_waiting',
        status: 'failed',
        related_entity_id: 'match-1',
        created_at: '2026-02-01T00:10:00.000Z',
        sent_at: null,
      },
    ];

    const result = await runOwnerMatchReminders({
      now: new Date('2026-02-02T12:00:00.000Z'),
    });

    expect(result.sent).toBe(0);
    expect(result.skipped).toContainEqual({ matchId: 'match-1', reason: 'original_email_missing' });
    expect(reminderState.sendOwnerMatchReminderEmail).not.toHaveBeenCalled();
  });

  it('skips safely when the owner has no resolvable email', async () => {
    reminderState.matches = [
      {
        id: 'match-1',
        booking_id: 'booking-1',
        owner_id: 'owner-1',
        status: 'pending_owner',
        created_at: '2026-02-01T00:00:00.000Z',
        responded_at: null,
        booking: {
          id: 'booking-1',
          status: 'pending_owner',
          availability_status: 'confirmed',
          total_points: 120,
          check_in: '2026-11-10',
          check_out: '2026-11-14',
          lead_guest_name: 'Helena Aranha',
          primary_resort: { name: 'Grand Floridian Villas' },
        },
        owner: {
          id: 'owner-1',
          display_name: 'Owner Name',
          payout_email: null,
          profiles: {
            id: 'profile-1',
            email: null,
            payout_email: null,
            display_name: 'Owner Name',
          },
        },
      },
    ];
    reminderState.emailLogs = [
      {
        id: 'email-1',
        template_key: 'owner_match_waiting',
        status: 'sent',
        related_entity_id: 'match-1',
        created_at: '2026-02-01T00:10:00.000Z',
        sent_at: '2026-02-01T00:10:00.000Z',
      },
    ];

    const result = await runOwnerMatchReminders({
      now: new Date('2026-02-02T12:00:00.000Z'),
    });

    expect(result.ok).toBe(true);
    expect(result.sent).toBe(0);
    expect(result.skipped).toContainEqual({ matchId: 'match-1', reason: 'owner_email_missing' });
    expect(reminderState.sendOwnerMatchReminderEmail).not.toHaveBeenCalled();
  });
});
