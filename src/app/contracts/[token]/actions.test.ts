import { describe, expect, test, vi } from 'vitest';

import { acceptContractAction } from './actions';

vi.mock('next/headers', () => ({
  headers: () =>
    new Headers({
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'vitest',
    }),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const sendOwnerAgreementSignedEmail = vi.fn();
const sendGuestAgreementSignedEmail = vi.fn();

type ContractRow = {
  id: number;
  owner_accept_token: string;
  guest_accept_token: string;
  booking_request_id: string | null;
  status: string;
  signed_copy_emailed_at: string | null;
  snapshot: Record<string, unknown>;
};

let contractRow: ContractRow = {
  id: 1,
  owner_accept_token: 'owner-token',
  guest_accept_token: 'guest-token',
  booking_request_id: null,
  status: 'sent',
  signed_copy_emailed_at: null,
  snapshot: {
    renterName: 'Test Guest',
    guestEmail: 'guest@example.com',
    parties: { guest: { email: 'guest@example.com' } },
    ownerEmail: 'owner@example.com',
    ownerName: 'Owner',
    resortName: 'Test Resort',
    checkIn: '2026-06-18',
    checkOut: '2026-06-22',
  },
};

vi.mock('@/lib/email', () => ({
  sendOwnerAgreementSignedEmail: (...args: any[]) => sendOwnerAgreementSignedEmail(...args),
  sendGuestAgreementSignedEmail: (...args: any[]) => sendGuestAgreementSignedEmail(...args),
}));

vi.mock('@/server/contracts', () => ({
  logContractEvent: vi.fn(),
}));

type SupabaseMock = {
  from: (table: string) => {
    select: () => {
      or?: () => { maybeSingle: () => Promise<{ data: ContractRow; error: null }> };
      eq?: () => { maybeSingle: () => Promise<{ data: ContractRow; error: null }> };
    };
    update?: () => { eq: () => Promise<{ error: null }> };
  };
};

vi.mock('@/lib/supabase-service-client', () => ({
  createServiceClient: (): SupabaseMock => ({
    from: (table: string) => {
      if (table === 'contracts') {
        const selectChain = {
          or: () => ({
            maybeSingle: async () => ({
              data: contractRow,
              error: null,
            }),
          }),
          eq: () => ({
            maybeSingle: async () => ({
              data: contractRow,
              error: null,
            }),
          }),
        };
        return {
          select: () => ({
            ...selectChain,
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      return {
        select: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
      };
    },
  }),
}));

beforeEach(() => {
  sendOwnerAgreementSignedEmail.mockClear();
  sendGuestAgreementSignedEmail.mockClear();
  contractRow = {
    id: 1,
    owner_accept_token: 'owner-token',
    guest_accept_token: 'guest-token',
    booking_request_id: null,
    status: 'sent',
    signed_copy_emailed_at: null,
    snapshot: {
      renterName: 'Test Guest',
      guestEmail: 'guest@example.com',
      parties: { guest: { email: 'guest@example.com' } },
      ownerEmail: 'owner@example.com',
      ownerName: 'Owner',
      resortName: 'Test Resort',
      checkIn: '2026-06-18',
      checkOut: '2026-06-22',
    },
  };
});

describe('acceptContractAction', () => {
  test('sends guest signed email on acceptance', async () => {
    const formData = new FormData();
    formData.set('token', 'guest-token');
    formData.set('confirm', 'on');

    await acceptContractAction({}, formData);

    expect(sendGuestAgreementSignedEmail).toHaveBeenCalledTimes(1);
    expect(sendOwnerAgreementSignedEmail).toHaveBeenCalledTimes(1);
  });

  test('does not resend signed email when already sent', async () => {
    contractRow = {
      ...contractRow,
      id: 2,
      signed_copy_emailed_at: new Date().toISOString(),
    };

    const formData = new FormData();
    formData.set('token', 'guest-token');
    formData.set('confirm', 'on');

    await acceptContractAction({}, formData);

    expect(sendGuestAgreementSignedEmail).not.toHaveBeenCalled();
  });

  test('missing guest email does not throw', async () => {
    contractRow = {
      ...contractRow,
      id: 3,
      snapshot: {
        renterName: 'Test Guest',
        ownerEmail: 'owner@example.com',
        ownerName: 'Owner',
        resortName: 'Test Resort',
        checkIn: '2026-06-18',
        checkOut: '2026-06-22',
      },
    };

    const formData = new FormData();
    formData.set('token', 'guest-token');
    formData.set('confirm', 'on');

    await expect(acceptContractAction({}, formData)).resolves.toMatchObject({
      error: 'Payment could not be started. Please try again.',
    });
    expect(sendGuestAgreementSignedEmail).not.toHaveBeenCalled();
  });
});
