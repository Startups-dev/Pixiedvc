import { describe, expect, it, vi, afterEach } from 'vitest';

import { computePaymentSchedule } from './schedule';

describe('computePaymentSchedule 90-day cutoff', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses 100% due at booking when check-in is < 90 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T00:00:00Z'));

    const schedule = computePaymentSchedule({
      booking: {
        check_in: '2026-04-30',
        guest_total_cents: 220000,
        deposit_due: 99,
      },
      transactions: [],
      total_tax_cents: 0,
    });

    const expectedBooking = Math.max(220000 - 9900, 0);
    expect(schedule.due_booking_cents).toBe(expectedBooking);
    expect(schedule.due_checkin_cents).toBe(0);
  });

  it('uses split schedule when check-in is >= 90 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T00:00:00Z'));

    const schedule = computePaymentSchedule({
      booking: {
        check_in: '2026-05-02',
        guest_total_cents: 220000,
        deposit_due: 99,
      },
      transactions: [],
      total_tax_cents: 0,
    });

    const expectedBooking = Math.max(Math.round(220000 * 0.7) - 9900, 0);
    const expectedCheckin = 220000 - Math.round(220000 * 0.7);

    expect(schedule.due_booking_cents).toBe(expectedBooking);
    expect(schedule.due_checkin_cents).toBe(expectedCheckin);
  });
});
