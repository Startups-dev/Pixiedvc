import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runAbandonedBookingRequestRecovery, isRecoverableDraft } from '@/lib/abandoned-booking-requests';

const recoveryState = vi.hoisted(() => ({
  bookings: [
    {
      id: 'draft-1',
      renter_id: 'user-1',
      status: 'draft',
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
      lead_guest_name: 'Guest One',
      lead_guest_email: 'guest1@example.com',
      lead_guest_phone: '555-111-1111',
      address_line1: '123 Main St',
      city: 'Orlando',
      state: 'FL',
      postal_code: '32830',
      country: 'US',
      comments: null,
      check_in: '2026-06-01',
      check_out: '2026-06-05',
      primary_resort_id: 'resort-1',
      adults: 2,
      youths: 0,
      primary_resort: { name: 'Riviera Resort' },
    },
    {
      id: 'draft-2',
      renter_id: 'user-2',
      status: 'submitted',
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
      lead_guest_name: 'Guest Two',
      lead_guest_email: 'guest2@example.com',
      lead_guest_phone: '555-222-2222',
      address_line1: '456 Main St',
      city: 'Orlando',
      state: 'FL',
      postal_code: '32830',
      country: 'US',
      comments: null,
      check_in: '2026-07-01',
      check_out: '2026-07-05',
      primary_resort_id: 'resort-2',
      adults: 2,
      youths: 0,
      primary_resort: { name: 'Beach Club Villas' },
    },
    {
      id: 'draft-3',
      renter_id: 'user-3',
      status: 'draft',
      created_at: '2026-01-01T10:00:00.000Z',
      updated_at: '2026-01-01T10:00:00.000Z',
      lead_guest_name: null,
      lead_guest_email: 'guest3@example.com',
      lead_guest_phone: null,
      address_line1: null,
      city: null,
      state: null,
      postal_code: null,
      country: null,
      comments: null,
      check_in: null,
      check_out: null,
      primary_resort_id: null,
      adults: 0,
      youths: 0,
      primary_resort: null,
    },
  ],
  reminded: new Set<string>(),
  sendAbandonedGuestBookingRequestEmail: vi.fn(async ({ relatedEntityId }: { relatedEntityId: string }) => {
    recoveryState.reminded.add(relatedEntityId);
  }),
  getSupabaseAdminClient: vi.fn(() => ({
    from: (table: string) => {
      if (table === 'booking_requests') {
        return {
          select: () => ({
            eq: () => ({
              lte: () => ({
                order: () => ({
                  limit: async () => ({ data: recoveryState.bookings, error: null }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'outbound_emails') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: recoveryState.reminded.has('draft-1') ? { id: 'email-1', status: 'sent' } : null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

vi.mock('@/lib/email', () => ({
  sendAbandonedGuestBookingRequestEmail: recoveryState.sendAbandonedGuestBookingRequestEmail,
}));

vi.mock('@/lib/supabase-admin', () => ({
  getSupabaseAdminClient: recoveryState.getSupabaseAdminClient,
}));

describe('abandoned booking request recovery', () => {
  beforeEach(() => {
    recoveryState.reminded.clear();
    recoveryState.sendAbandonedGuestBookingRequestEmail.mockClear();
    recoveryState.getSupabaseAdminClient.mockClear();
    delete process.env.ABANDONED_BOOKING_DELAY_MINUTES;
  });

  it('detects only meaningful draft progress as recoverable', () => {
    expect(isRecoverableDraft(recoveryState.bookings[0])).toBe(true);
    expect(isRecoverableDraft(recoveryState.bookings[1])).toBe(false);
    expect(isRecoverableDraft(recoveryState.bookings[2])).toBe(false);
  });

  it('sends one recovery email for stale draft requests and skips completed ones', async () => {
    const result = await runAbandonedBookingRequestRecovery({
      now: new Date('2026-01-01T11:00:00.000Z'),
    });

    expect(result.ok).toBe(true);
    expect(result.candidates).toBe(1);
    expect(result.sent).toBe(1);
    expect(recoveryState.sendAbandonedGuestBookingRequestEmail).toHaveBeenCalledTimes(1);
    expect(recoveryState.sendAbandonedGuestBookingRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        templateKey: 'abandoned_guest_booking_request',
        relatedEntityId: 'draft-1',
      }),
    );
  });

  it('prevents duplicate reminder sends when an outbound email already exists', async () => {
    recoveryState.reminded.add('draft-1');

    const result = await runAbandonedBookingRequestRecovery({
      now: new Date('2026-01-01T11:00:00.000Z'),
    });

    expect(result.sent).toBe(0);
    expect(result.skipped).toContainEqual({ bookingId: 'draft-1', reason: 'already_reminded' });
    expect(recoveryState.sendAbandonedGuestBookingRequestEmail).not.toHaveBeenCalled();
  });
});
