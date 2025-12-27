'use server';

import { supabaseServer } from '@/lib/supabase-server';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { resolveCalculatorCode } from '@/lib/resort-calculator';
import { quoteStay } from 'pixiedvc-calculator/engine/calc';
import type { RoomCode, ViewCode } from 'pixiedvc-calculator/engine/types';

export async function saveStayBuilderStepOne(input: {
  bookingId: string;
  checkIn: string;
  checkOut: string;
  resortId: string;
  requiresAccessibility: boolean;
  roomType?: RoomCode;
  viewCode?: ViewCode;
}) {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const nights = calculateNights(input.checkIn, input.checkOut);

  let totalPoints: number | null = null;

  if (nights && input.resortId && input.roomType && input.viewCode && input.checkIn) {
    const { data: resortMeta, error: resortError } = await sb
      .from('resorts')
      .select('slug, calculator_code')
      .eq('id', input.resortId)
      .maybeSingle();

    if (resortError) {
      console.error('Failed to load resort for estimator', resortError);
    } else {
      const calculatorCode = resolveCalculatorCode(resortMeta);
      if (calculatorCode) {
        try {
          const quote = quoteStay({
            resortCode: calculatorCode,
            room: input.roomType,
            view: input.viewCode,
            checkIn: input.checkIn,
            nights,
          });
          totalPoints = quote.totalPoints;
        } catch (calcError) {
          console.error('Failed to calculate stay quote', calcError);
        }
      }
    }
  }

  const payload = {
    check_in: input.checkIn || null,
    check_out: input.checkOut || null,
    nights,
    primary_resort_id: input.resortId || null,
    primary_room: input.roomType ?? null,
    primary_view: input.viewCode ?? null,
    requires_accessibility: input.requiresAccessibility,
    total_points: totalPoints,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from('booking_requests')
    .update(payload)
    .eq('id', input.bookingId)
    .eq('renter_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true, nights };
}

export async function saveTravelerDetails(input: {
  bookingId: string;
  title?: string;
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  marketingSource?: string;
  notes?: string;
}) {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  if (input.email !== input.confirmEmail) {
    throw new Error('Emails do not match');
  }

  const payload = {
    lead_guest_name: [input.title, input.firstName, input.lastName].filter(Boolean).join(' ').trim(),
    lead_guest_email: input.email,
    lead_guest_phone: input.phone,
    address_line1: input.addressLine1,
    address_line2: input.addressLine2 ?? null,
    city: input.city,
    state: input.state,
    postal_code: input.postalCode,
    country: input.country,
    marketing_source: input.marketingSource ?? null,
    comments: input.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from('booking_requests')
    .update(payload)
    .eq('id', input.bookingId)
    .eq('renter_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}

export async function saveGuestRoster(input: {
  bookingId: string;
  guests: {
    title?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    ageCategory: 'adult' | 'youth';
  }[];
}) {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const filtered = input.guests.filter((guest) => guest.firstName && guest.lastName);

  const adults = filtered.filter((guest) => guest.ageCategory === 'adult').length;
  const youths = filtered.filter((guest) => guest.ageCategory === 'youth').length;

  const { error: updateError } = await sb
    .from('booking_requests')
    .update({ adults, youths, updated_at: new Date().toISOString() })
    .eq('id', input.bookingId)
    .eq('renter_id', user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await sb.from('booking_request_guests').delete().eq('booking_id', input.bookingId);

  if (filtered.length) {
    const rows = filtered.map((guest) => ({
      booking_id: input.bookingId,
      title: guest.title ?? null,
      first_name: guest.firstName,
      last_name: guest.lastName,
      email: guest.email ?? null,
      phone: guest.phone ?? null,
      age_category: guest.ageCategory,
    }));
    const { error } = await sb.from('booking_request_guests').insert(rows);
    if (error) {
      throw new Error(error.message);
    }
  }

  return { ok: true, adults, youths };
}

export async function submitStayRequest(input: { bookingId: string; acceptTerms: boolean; acknowledgeInsurance: boolean }) {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  if (!input.acceptTerms || !input.acknowledgeInsurance) {
    throw new Error('Please accept the disclosures before submitting.');
  }

  const { error } = await sb
    .from('booking_requests')
    .update({
      status: 'submitted',
      accepted_terms: true,
      accepted_insurance: input.acknowledgeInsurance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.bookingId)
    .eq('renter_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  const { data: booking, error: bookingError } = await sb
    .from('booking_requests')
    .select(
      'lead_guest_email, lead_guest_name, check_in, check_out, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)'
    )
    .eq('id', input.bookingId)
    .maybeSingle();

  if (bookingError) {
    console.error('Failed to load booking for confirmation email', bookingError);
  } else if (booking?.lead_guest_email) {
    await sendBookingConfirmationEmail({
      to: booking.lead_guest_email,
      name: booking.lead_guest_name,
      resortName: booking.primary_resort?.name ?? undefined,
      checkIn: booking.check_in ?? undefined,
      checkOut: booking.check_out ?? undefined,
    });
  }

  return { ok: true };
}

function calculateNights(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) {
    return null;
  }
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  if (Number.isNaN(diff) || diff <= 0) {
    return null;
  }
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
