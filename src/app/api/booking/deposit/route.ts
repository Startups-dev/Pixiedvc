import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type DepositRequest = {
  bookingId?: string;
  amount?: number;
  currency?: string;
  customerEmail?: string;
  customerName?: string;
  gateway?: "stripe" | "paypal";
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getOrigin(request: Request) {
  return request.headers.get("origin") ?? "http://localhost:3005";
}

async function createStripeCheckoutSession(request: Request, payload: DepositRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (!secretKey) {
    return { error: "Stripe secret key is missing." };
  }

  const bookingId = asString(payload.bookingId);
  const amount = asNumber(payload.amount);
  const currency = asString(payload.currency || "USD").toLowerCase();
  const customerEmail = asString(payload.customerEmail);

  if (!bookingId || !amount || amount <= 0) {
    return { error: "Missing booking or amount." };
  }

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data: bookingRow } = await supabase
      .from("booking_requests")
      .select("id")
      .eq("id", bookingId)
      .maybeSingle();
    if (!bookingRow) {
      if (process.env.NODE_ENV !== "production") {
        console.info("[booking/deposit] booking id not found", { booking_request_id: bookingId });
      }
      return { error: "Booking not found." };
    }
  }

  const amountCents = Math.round(amount * 100);
  const origin = getOrigin(request);
  const successUrl = `${origin}/pay/deposit/success?booking_request_id=${encodeURIComponent(bookingId)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/book?deposit=cancelled`;

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", successUrl);
  params.set("cancel_url", cancelUrl);
  params.append("payment_method_types[]", "card");
  if (customerEmail) params.set("customer_email", customerEmail);
  params.append("line_items[0][price_data][currency]", currency);
  params.append("line_items[0][price_data][product_data][name]", "PixieDVC Deposit");
  params.append("line_items[0][price_data][unit_amount]", String(amountCents));
  params.append("line_items[0][quantity]", "1");
  params.append("client_reference_id", bookingId);
  params.append("metadata[booking_request_id]", bookingId);
  params.append("metadata[booking_id]", bookingId);
  params.append("metadata[payment_type]", "deposit");

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const json = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !json.url) {
    return { error: json.error?.message ?? "Unable to create Stripe checkout session." };
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[booking/deposit] stripe checkout created", {
      booking_request_id: bookingId,
      checkout_session_id: json.id ?? null,
      client_reference_id: bookingId,
      metadata_booking_request_id: bookingId,
      success_url: successUrl,
    });
  }

  return { url: json.url };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as DepositRequest;
    const gateway = payload.gateway ?? "stripe";

    if (gateway !== "stripe") {
      return NextResponse.json({ error: "Unsupported gateway." }, { status: 400 });
    }

    const result = await createStripeCheckoutSession(request, payload);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[booking/deposit] error", error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}

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
    metadata?: { booking_id?: string };
  };

  const bookingId = session.metadata?.booking_id ?? null;
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
      console.info("[booking/deposit] paid", {
        payment_id: sessionId,
        booking_request_id: bookingId,
        amount_paid: amountPaid,
      });
    }

    return NextResponse.redirect(new URL(`/guest?booking=${encodeURIComponent(bookingId)}`, url.origin));
  }

  return NextResponse.redirect(new URL("/book?deposit=failed", url.origin));
}
