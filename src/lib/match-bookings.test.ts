import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { runMatchBookings } from '@/lib/match-bookings';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

const shouldRun = Boolean(supabaseUrl && serviceRoleKey);

describe('booking matcher integration', () => {
  if (!shouldRun) {
    it.skip('requires Supabase service role env vars', () => {});
    return;
  }

  it('creates a booking_match when an eligible membership exists', async () => {
    const admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    const resortId = crypto.randomUUID();
    const ownerId = crypto.randomUUID();
    const calculatorCode = `TST${Date.now().toString().slice(-5)}`;
    const bookingYear = 2026;
    const email = `match_test_${Date.now()}@example.com`;
    const password = `MatchTest_${Date.now()}!`;

    const { data: userResult, error: userError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    expect(userError).toBeNull();
    expect(userResult?.user).toBeTruthy();

    const userId = userResult!.user!.id;

    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      email,
      display_name: 'Test Owner',
      role: 'owner',
      onboarding_completed: true,
      payout_email: email,
    });
    expect(profileError).toBeNull();

    const { error: resortError } = await admin.from('resorts').insert({
      id: resortId,
      slug: `test-resort-${Date.now()}`,
      name: 'Test Resort',
      calculator_code: calculatorCode,
    });
    expect(resortError).toBeNull();

    const { error: ownerError } = await admin.from('owners').insert({
      id: ownerId,
      user_id: userId,
      email,
      display_name: 'Test Owner',
      verification: 'verified',
    });
    expect(ownerError).toBeNull();

    const { error: verificationError } = await admin
      .from('owner_verifications')
      .upsert({
        owner_id: ownerId,
        status: 'approved',
        approved_at: new Date().toISOString(),
      });
    expect(verificationError).toBeNull();

    const { data: membership, error: membershipErr } = await admin
      .from('owner_memberships')
      .insert({
        owner_id: ownerId,
        resort_id: resortId,
        use_year: 'January',
        contract_year: bookingYear,
        points_owned: 200,
        points_available: 200,
        points_reserved: 0,
        borrowing_enabled: false,
        max_points_to_borrow: 0,
      })
      .select('id')
      .single();
    expect(membershipErr).toBeNull();
    const membershipId = membership!.id;
    expect(membershipId).toBeTruthy();

    const { data: bookingRows, error: bookingError } = await admin
      .from('booking_requests')
      .insert({
        status: 'pending_match',
        check_in: `${bookingYear}-01-14`,
        check_out: `${bookingYear}-01-21`,
        primary_resort_id: resortId,
        total_points: 109,
        lead_guest_name: 'Mr. Test Owner',
        lead_guest_email: email,
        deposit_due: 99,
        deposit_paid: 99,
      })
      .select('id')
      .limit(1);
    expect(bookingError).toBeNull();

    const bookingId = bookingRows?.[0]?.id;
    expect(bookingId).toBeTruthy();

    const result = await runMatchBookings({
      client: admin,
      origin: 'http://localhost:3000',
      bookingId,
      sendEmails: false,
    });

    expect(result.ok).toBe(true);
    expect(result.matchesCreated).toBe(1);
    expect(result.matchIds.length).toBe(1);

    const { data: matchRow, error: matchError } = await admin
      .from('booking_matches')
      .select('id, booking_id, owner_id, status')
      .eq('booking_id', bookingId)
      .maybeSingle();

    expect(matchError).toBeNull();
    expect(matchRow?.booking_id).toBe(bookingId);
    expect(matchRow?.owner_id).toBe(ownerId);
    expect(matchRow?.status).toBe('pending_owner');
  });
});
