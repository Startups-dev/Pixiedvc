import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") ?? "";
  if (!secretKey || !sessionId) {
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
      await supabase
        .from("booking_requests")
        .update({
          deposit_paid: amountPaid,
          deposit_currency: currency,
          status: "submitted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[booking/deposit/confirm] paid", {
        payment_id: sessionId,
        booking_request_id: bookingId,
        amount_paid: amountPaid,
      });
    }

    return NextResponse.redirect(new URL(`/guest?booking=${encodeURIComponent(bookingId)}`, url.origin));
  }

  return NextResponse.redirect(new URL("/book?deposit=failed", url.origin));
}
