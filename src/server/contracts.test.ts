import { describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/supabaseServer', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import * as contracts from './contracts';

describe('ensureGuestAgreementForBooking', () => {
  test('does not send guest email during owner confirmation', async () => {
    const sendSpy = vi.spyOn(contracts, 'sendContractEmail').mockResolvedValue({
      contract: {} as any,
      sentToOwner: false,
      sentToGuest: false,
      skipped: {},
    });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'booking_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'b1', renter_id: 'r1' }, error: null }),
              })),
            })),
          };
        }
        if (table === 'owners') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'owner-profile' }, error: null }),
              })),
            })),
          };
        }
        if (table === 'contracts') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 123, guest_accept_token: 'guest-token', owner_accept_token: 'owner-token' },
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'owner_memberships') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            })),
          };
        }
        if (table === 'booking_request_guests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          };
        }
        if (table === 'rentals') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
      }),
    } as unknown as { from: (table: string) => unknown };

    await contracts.ensureGuestAgreementForBooking({
      supabase,
      ownerId: 'owner-1',
      bookingRequestId: 'b1',
      rentalId: 'r1',
      confirmationNumber: 'ABC123',
    });

    expect(sendSpy).not.toHaveBeenCalled();
  });
});
