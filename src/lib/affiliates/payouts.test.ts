import { describe, expect, it } from 'vitest';

import { normalizeDateOnly, rangesOverlap } from './payouts';

describe('rangesOverlap', () => {
  it('returns true for overlapping ranges', () => {
    const startA = normalizeDateOnly(new Date('2024-01-01T00:00:00Z'));
    const endA = normalizeDateOnly(new Date('2024-01-10T00:00:00Z'));
    const startB = normalizeDateOnly(new Date('2024-01-05T00:00:00Z'));
    const endB = normalizeDateOnly(new Date('2024-01-20T00:00:00Z'));
    expect(rangesOverlap(startA, endA, startB, endB)).toBe(true);
  });

  it('returns false for non-overlapping ranges', () => {
    const startA = normalizeDateOnly(new Date('2024-01-01T00:00:00Z'));
    const endA = normalizeDateOnly(new Date('2024-01-10T00:00:00Z'));
    const startB = normalizeDateOnly(new Date('2024-01-11T00:00:00Z'));
    const endB = normalizeDateOnly(new Date('2024-01-20T00:00:00Z'));
    expect(rangesOverlap(startA, endA, startB, endB)).toBe(false);
  });
});
