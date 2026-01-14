export type MatchingPresetKey =
  | 'needs_attention'
  | 'expiring_today'
  | 'upcoming_checkins_7d'
  | 'cancelled_cleanup'
  | 'paid_rentals'
  | 'stale_unanswered'
  | 'unmatched_guests'
  | 'unmatched_owners';

export type MatchingPreset = {
  key: MatchingPresetKey;
  label: string;
  description: string;
  hint: string;
  params: Record<string, string>;
};

export const MATCHING_PRESETS: MatchingPreset[] = [
  {
    key: 'needs_attention',
    label: 'Needs attention',
    description: 'Pending owner matches expiring within 24 hours.',
    hint: 'Showing pending owner matches expiring in the next 24 hours.',
    params: {
      matchStatus: 'pending_owner',
      hasRental: 'false',
      __relativeExpiresToHours: '24',
    },
  },
  {
    key: 'expiring_today',
    label: 'Expiring today',
    description: 'Matches that expire today (local time).',
    hint: 'Showing matches whose expiration is today.',
    params: {
      __expiresToday: '1',
    },
  },
  {
    key: 'upcoming_checkins_7d',
    label: 'Check-ins (7 days)',
    description: 'Bookings checking in within 7 days.',
    hint: 'Showing bookings checking in within the next 7 days.',
    params: {
      __relativeCheckInDays: '7',
      bookingStatus: 'submitted',
    },
  },
  {
    key: 'cancelled_cleanup',
    label: 'Cancelled → cleanup',
    description: 'Cancelled bookings that still have matches.',
    hint: 'Showing cancelled bookings that still have an active match (cleanup needed).',
    params: {
      bookingStatus: 'cancelled',
    },
  },
  {
    key: 'paid_rentals',
    label: 'Paid rentals',
    description: 'Rentals with payout released.',
    hint: 'Showing rentals where payouts have been released.',
    params: {
      hasRental: 'true',
      payoutStatus: 'released',
    },
  },
  {
    key: 'stale_unanswered',
    label: 'Stale / unanswered',
    description: 'Matches pending too long without a rental.',
    hint: 'Showing matches older than 48 hours that haven’t progressed.',
    params: {
      hasRental: 'false',
      matchStatus: 'pending_owner',
      __relativeMatchCreatedOlderHours: '48',
    },
  },
  {
    key: 'unmatched_guests',
    label: 'Unmatched guests',
    description: 'Guests waiting for a match.',
    hint: 'Showing guests without matches who need placement.',
    params: {
      __scope: 'unmatched_guests',
    },
  },
  {
    key: 'unmatched_owners',
    label: 'Unmatched owners',
    description: 'Owners with active inventory and no matches.',
    hint: 'Showing owners with inventory who need a match.',
    params: {
      __scope: 'unmatched_owners',
    },
  },
];
