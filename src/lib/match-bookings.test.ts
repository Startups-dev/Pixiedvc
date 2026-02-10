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
        use_year_start: `${bookingYear}-01-01`,
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

  it('rejects stays that extend beyond use year end', async () => {
    const admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    const resortId = crypto.randomUUID();
    const ownerId = crypto.randomUUID();
    const calculatorCode = `TST${Date.now().toString().slice(-5)}`;
    const email = `match_out_of_range_${Date.now()}@example.com`;
    const password = `MatchTest_${Date.now()}!`;

    const { data: userResult } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    const userId = userResult!.user!.id;

    await admin.from('profiles').upsert({
      id: userId,
      email,
      display_name: 'Test Owner',
      role: 'owner',
      onboarding_completed: true,
      payout_email: email,
    });

    await admin.from('resorts').insert({
      id: resortId,
      slug: `test-resort-${Date.now()}`,
      name: 'Test Resort',
      calculator_code: calculatorCode,
    });

    await admin.from('owners').insert({
      id: ownerId,
      user_id: userId,
      email,
      display_name: 'Test Owner',
      verification: 'verified',
    });

    await admin.from('owner_verifications').upsert({
      owner_id: ownerId,
      status: 'approved',
      approved_at: new Date().toISOString(),
    });

    await admin.from('owner_memberships').insert({
      owner_id: ownerId,
      resort_id: resortId,
      use_year: 'January',
      use_year_start: `2026-01-01`,
      use_year_end: `2026-12-31`,
      points_owned: 200,
      points_available: 200,
      points_reserved: 0,
      borrowing_enabled: false,
      max_points_to_borrow: 0,
    });

    const { data: bookingRows } = await admin
      .from('booking_requests')
      .insert({
        status: 'pending_match',
        check_in: `2026-12-28`,
        check_out: `2027-01-02`,
        primary_resort_id: resortId,
        total_points: 80,
        lead_guest_name: 'Test Guest',
        lead_guest_email: email,
        deposit_due: 99,
        deposit_paid: 99,
      })
      .select('id')
      .limit(1);

    const bookingId = bookingRows?.[0]?.id;
    const result = await runMatchBookings({
      client: admin,
      origin: 'http://localhost:3000',
      bookingId,
      sendEmails: false,
    });

    expect(result.matchesCreated).toBe(0);
  });

  it('allows stays that checkout on use year end', async () => {
    const admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    const resortId = crypto.randomUUID();
    const ownerId = crypto.randomUUID();
    const calculatorCode = `TST${Date.now().toString().slice(-5)}`;
    const email = `match_on_end_${Date.now()}@example.com`;
    const password = `MatchTest_${Date.now()}!`;

    const { data: userResult } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    const userId = userResult!.user!.id;

    await admin.from('profiles').upsert({
      id: userId,
      email,
      display_name: 'Test Owner',
      role: 'owner',
      onboarding_completed: true,
      payout_email: email,
    });

    await admin.from('resorts').insert({
      id: resortId,
      slug: `test-resort-${Date.now()}`,
      name: 'Test Resort',
      calculator_code: calculatorCode,
    });

    await admin.from('owners').insert({
      id: ownerId,
      user_id: userId,
      email,
      display_name: 'Test Owner',
      verification: 'verified',
    });

    await admin.from('owner_verifications').upsert({
      owner_id: ownerId,
      status: 'approved',
      approved_at: new Date().toISOString(),
    });

    await admin.from('owner_memberships').insert({
      owner_id: ownerId,
      resort_id: resortId,
      use_year: 'January',
      use_year_start: `2026-01-01`,
      use_year_end: `2026-12-31`,
      points_owned: 200,
      points_available: 200,
      points_reserved: 0,
      borrowing_enabled: false,
      max_points_to_borrow: 0,
    });

    const { data: bookingRows } = await admin
      .from('booking_requests')
      .insert({
        status: 'pending_match',
        check_in: `2026-12-27`,
        check_out: `2026-12-31`,
        primary_resort_id: resortId,
        total_points: 80,
        lead_guest_name: 'Test Guest',
        lead_guest_email: email,
        deposit_due: 99,
        deposit_paid: 99,
      })
      .select('id')
      .limit(1);

    const bookingId = bookingRows?.[0]?.id;
    const result = await runMatchBookings({
      client: admin,
      origin: 'http://localhost:3000',
      bookingId,
      sendEmails: false,
    });

    expect(result.matchesCreated).toBe(1);
  });

  it('borrows from next bucket when within cap', async () => {
    const admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    const resortId = crypto.randomUUID();
    const ownerId = crypto.randomUUID();
    const calculatorCode = `TST${Date.now().toString().slice(-5)}`;
    const email = `match_borrow_${Date.now()}@example.com`;
    const password = `MatchTest_${Date.now()}!`;

    const { data: userResult } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    const userId = userResult!.user!.id;

    await admin.from('profiles').upsert({
      id: userId,
      email,
      display_name: 'Test Owner',
      role: 'owner',
      onboarding_completed: true,
      payout_email: email,
    });

    await admin.from('resorts').insert({
      id: resortId,
      slug: `test-resort-${Date.now()}`,
      name: 'Test Resort',
      calculator_code: calculatorCode,
    });

    await admin.from('owners').insert({
      id: ownerId,
      user_id: userId,
      email,
      display_name: 'Test Owner',
      verification: 'verified',
    });

    await admin.from('owner_verifications').upsert({
      owner_id: ownerId,
      status: 'approved',
      approved_at: new Date().toISOString(),
    });

    await admin.from('owner_memberships').insert([
      {
        owner_id: ownerId,
        resort_id: resortId,
        use_year: 'January',
        use_year_start: `2026-01-01`,
        use_year_end: `2026-12-31`,
        points_owned: 80,
        points_available: 80,
        points_reserved: 0,
        borrowing_enabled: true,
        max_points_to_borrow: 40,
      },
      {
        owner_id: ownerId,
        resort_id: resortId,
        use_year: 'January',
        use_year_start: `2027-01-01`,
        use_year_end: `2027-12-31`,
        points_owned: 40,
        points_available: 40,
        points_reserved: 0,
        borrowing_enabled: true,
        max_points_to_borrow: 40,
      },
    ]);

    const { data: bookingRows } = await admin
      .from('booking_requests')
      .insert({
        status: 'pending_match',
        check_in: `2026-06-01`,
        check_out: `2026-06-05`,
        primary_resort_id: resortId,
        total_points: 100,
        lead_guest_name: 'Test Guest',
        lead_guest_email: email,
        deposit_due: 99,
        deposit_paid: 99,
      })
      .select('id')
      .limit(1);

    const bookingId = bookingRows?.[0]?.id;
    const result = await runMatchBookings({
      client: admin,
      origin: 'http://localhost:3000',
      bookingId,
      sendEmails: false,
    });

    expect(result.matchesCreated).toBe(1);

    const { data: matchRow } = await admin
      .from('booking_matches')
      .select('points_reserved_current, points_reserved_borrowed, borrow_membership_id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    expect(matchRow?.points_reserved_current).toBe(80);
    expect(matchRow?.points_reserved_borrowed).toBe(20);
    expect(matchRow?.borrow_membership_id).toBeTruthy();
  });

  it('prefers earliest-expiring bucket when multiple candidates qualify', async () => {
    const admin = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false },
    });

    const resortId = crypto.randomUUID();
    const calculatorCode = `TST${Date.now().toString().slice(-5)}`;

    await admin.from('resorts').insert({
      id: resortId,
      slug: `test-resort-${Date.now()}`,
      name: 'Test Resort',
      calculator_code: calculatorCode,
    });

    const ownerAEmail = `match_early_${Date.now()}@example.com`;
    const ownerBEmail = `match_late_${Date.now()}@example.com`;

    const ownerAUser = await admin.auth.admin.createUser({
      email: ownerAEmail,
      password: `MatchTest_${Date.now()}!`,
      email_confirm: true,
    });
    const ownerBUser = await admin.auth.admin.createUser({
      email: ownerBEmail,
      password: `MatchTest_${Date.now()}!`,
      email_confirm: true,
    });

    const ownerAId = crypto.randomUUID();
    const ownerBId = crypto.randomUUID();

    await admin.from('profiles').upsert([
      {
        id: ownerAUser.data!.user!.id,
        email: ownerAEmail,
        display_name: 'Owner A',
        role: 'owner',
        onboarding_completed: true,
        payout_email: ownerAEmail,
      },
      {
        id: ownerBUser.data!.user!.id,
        email: ownerBEmail,
        display_name: 'Owner B',
        role: 'owner',
        onboarding_completed: true,
        payout_email: ownerBEmail,
      },
    ]);

    await admin.from('owners').insert([
      {
        id: ownerAId,
        user_id: ownerAUser.data!.user!.id,
        email: ownerAEmail,
        display_name: 'Owner A',
        verification: 'verified',
      },
      {
        id: ownerBId,
        user_id: ownerBUser.data!.user!.id,
        email: ownerBEmail,
        display_name: 'Owner B',
        verification: 'verified',
      },
    ]);

    await admin.from('owner_verifications').upsert([
      {
        owner_id: ownerAId,
        status: 'approved',
        approved_at: new Date().toISOString(),
      },
      {
        owner_id: ownerBId,
        status: 'approved',
        approved_at: new Date().toISOString(),
      },
    ]);

    await admin.from('owner_memberships').insert([
      {
        owner_id: ownerAId,
        resort_id: resortId,
        use_year: 'January',
        use_year_start: `2026-01-01`,
        use_year_end: `2026-06-30`,
        points_owned: 200,
        points_available: 200,
        points_reserved: 0,
        borrowing_enabled: false,
        max_points_to_borrow: 0,
      },
      {
        owner_id: ownerBId,
        resort_id: resortId,
        use_year: 'January',
        use_year_start: `2026-01-01`,
        use_year_end: `2026-12-31`,
        points_owned: 200,
        points_available: 200,
        points_reserved: 0,
        borrowing_enabled: false,
        max_points_to_borrow: 0,
      },
    ]);

    const { data: bookingRows } = await admin
      .from('booking_requests')
      .insert({
        status: 'pending_match',
        check_in: `2026-06-10`,
        check_out: `2026-06-15`,
        primary_resort_id: resortId,
        total_points: 60,
        lead_guest_name: 'Test Guest',
        lead_guest_email: ownerAEmail,
        deposit_due: 99,
        deposit_paid: 99,
      })
      .select('id')
      .limit(1);

    const bookingId = bookingRows?.[0]?.id;
    const result = await runMatchBookings({
      client: admin,
      origin: 'http://localhost:3000',
      bookingId,
      sendEmails: false,
    });

    expect(result.matchesCreated).toBe(1);

    const { data: matchRow } = await admin
      .from('booking_matches')
      .select('owner_id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    expect(matchRow?.owner_id).toBe(ownerAId);
  });
});
