alter table public.rentals
  add column if not exists booking_package jsonb not null default '{}'::jsonb,
  add column if not exists disney_confirmation_number text;

alter table public.rentals
  drop constraint if exists rentals_status_check;

alter table public.rentals
  add constraint rentals_status_check
  check (
    status in (
      'matched',
      'awaiting_owner_approval',
      'approved',
      'booked',
      'stay_in_progress',
      'completed',
      'cancelled',
      'draft',
      'needs_dvc_booking',
      'booked_pending_agreement',
      'agreement_sent',
      'signed',
      'paid_70',
      'checked_out',
      'paid_balance'
    )
  );

alter table public.booking_matches
  drop constraint if exists booking_matches_status_check;

alter table public.booking_matches
  add constraint booking_matches_status_check
  check (status in ('pending_owner','accepted','declined','booked'));
