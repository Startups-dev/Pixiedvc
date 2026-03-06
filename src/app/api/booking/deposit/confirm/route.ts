import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") ?? "";
  const responseFormat = url.searchParams.get("format") ?? "";
  const wantsJson = responseFormat === "json";
  if (!secretKey || !sessionId) {
    if (wantsJson) {
      return NextResponse.json({ confirmed: false, error: "Missing secret or session id." }, { status: 400 });
    }
    return NextResponse.redirect(new URL("/book?deposit=failed", url.origin));
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });
  const session = (await response.json()) as {
    payment_status?: string;
    amount_total?: number;
    currency?: string;
    metadata?: { booking_request_id?: string; booking_id?: string };
    client_reference_id?: string | null;
    payment_intent?: string | null;
  };

  const bookingId =
    session.metadata?.booking_request_id ??
    session.client_reference_id ??
    session.metadata?.booking_id ??
    null;
  const amountPaid = typeof session.amount_total === "number" ? session.amount_total / 100 : null;
  const currency = session.currency?.toUpperCase() ?? "USD";

  if (session.payment_status === "paid" && bookingId && amountPaid) {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const { error: bookingError } = await supabase
        .from("booking_requests")
        .update({
          deposit_paid: amountPaid,
          deposit_currency: currency,
          status: "submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (bookingError) {
        console.error("[booking/deposit/confirm] update failed", {
          code: bookingError.code,
          message: bookingError.message,
          details: bookingError.details,
          hint: bookingError.hint,
          booking_request_id: bookingId,
        });
      }

      // Enrollment is explicit (user-driven) and no longer automatic here.
    }

    console.info("[booking/deposit/confirm] paid", {
      checkout_session_id: sessionId,
      payment_intent_id: session.payment_intent ?? null,
      booking_request_id: bookingId,
      amount_paid: amountPaid,
      payment_status: session.payment_status ?? null,
    });

    if (wantsJson) {
      return NextResponse.json({
        confirmed: true,
        checkout_session_id: sessionId,
        payment_intent_id: session.payment_intent ?? null,
        booking_request_id: bookingId,
        amount_paid: amountPaid,
        currency,
      });
    }

    return NextResponse.redirect(new URL(`/guest?booking=${encodeURIComponent(bookingId)}`, url.origin));
  }

  if (wantsJson) {
    return NextResponse.json({
      confirmed: false,
      checkout_session_id: sessionId,
      payment_intent_id: session.payment_intent ?? null,
      booking_request_id: bookingId,
      payment_status: session.payment_status ?? null,
    });
  }

  return NextResponse.redirect(new URL("/book?deposit=failed", url.origin));
}
