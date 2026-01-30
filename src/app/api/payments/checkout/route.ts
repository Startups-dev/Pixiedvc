import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase-service-client';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string } | null;
    const token = typeof body?.token === 'string' ? body.token.trim() : '';

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 400 });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY ?? '';
    if (!stripeSecret) {
      return NextResponse.json({ ok: false, error: 'Stripe configuration is missing.' }, { status: 500 });
    }

    const supabase = createServiceClient();
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, booking_request_id, snapshot, guest_accept_token')
      .eq('guest_accept_token', token)
      .maybeSingle();

    if (!contract) {
      return NextResponse.json({ ok: false, error: 'Contract not found' }, { status: 404 });
    }

    const snapshot = (contract.snapshot ?? {}) as { summary?: { paidNowCents?: number; currency?: string } };
    const summary = snapshot.summary ?? {};
    const amountCents = typeof summary.paidNowCents === 'number' ? summary.paidNowCents : null;
    const currency = typeof summary.currency === 'string' ? summary.currency : 'USD';

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ ok: false, error: 'Payment amount is unavailable.' }, { status: 400 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://localhost:3005';
    const successUrl = `${baseUrl.replace(/\/$/, '')}/contracts/${token}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl.replace(/\/$/, '')}/contracts/${token}`;

    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', successUrl);
    params.set('cancel_url', cancelUrl);
    params.append('payment_method_types[]', 'card');
    params.append('line_items[0][price_data][currency]', currency.toLowerCase());
    params.append('line_items[0][price_data][product_data][name]', 'PixieDVC Reservation Payment');
    params.append('line_items[0][price_data][unit_amount]', String(amountCents));
    params.append('line_items[0][quantity]', '1');
    params.append('client_reference_id', contract.booking_request_id);
    params.append('metadata[booking_request_id]', contract.booking_request_id);
    params.append('metadata[payment_type]', 'booking');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const json = (await response.json()) as { url?: string; error?: { message?: string } };
    if (!response.ok || !json.url) {
      return NextResponse.json(
        { ok: false, error: json.error?.message ?? 'Unable to create Stripe checkout session.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, url: json.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
