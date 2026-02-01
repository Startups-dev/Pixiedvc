import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      payment_status?: string;
      amount_total?: number | null;
      currency?: string | null;
      client_reference_id?: string | null;
      metadata?: Record<string, string | null | undefined> | null;
    };
  };
};

function parseSignatureHeader(header: string | null) {
  if (!header) return null;
  const parts = header.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatureParts = parts.filter((part) => part.startsWith("v1="));
  if (!timestampPart || signatureParts.length === 0) return null;
  const timestamp = timestampPart.replace("t=", "");
  const signatures = signatureParts.map((part) => part.replace("v1=", ""));
  return { timestamp, signatures };
}

function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return parsed.signatures.some((signature) => {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Stripe webhook secret missing." }, { status: 500 });
  }

  const signatureHeader = request.headers.get("stripe-signature");
  const payload = await request.text();

  const signatureOk = verifyStripeSignature(payload, signatureHeader, secret);
  if (process.env.NODE_ENV !== "production") {
    console.info("[stripe/webhook] signature", {
      ok: signatureOk,
    });
  }

  if (!signatureOk) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;

  if (process.env.NODE_ENV !== "production") {
    console.info("[stripe/webhook] event", { type: event.type, id: event.id });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId =
      session.metadata?.booking_request_id ??
      session.client_reference_id ??
      session.metadata?.booking_id ??
      null;
    const amountPaid = typeof session.amount_total === "number" ? session.amount_total / 100 : null;
    const currency = session.currency?.toUpperCase() ?? "USD";

    if (process.env.NODE_ENV !== "production") {
      console.info("[stripe/webhook] resolve booking", {
        booking_request_id: bookingId,
        paid: session.payment_status === "paid",
      });
    }

    if (bookingId && amountPaid && session.payment_status === "paid") {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("booking_requests")
          .update({
            deposit_paid: amountPaid,
            deposit_currency: currency,
            status: "submitted",
            updated_at: new Date().toISOString(),
          })
          .eq("id", bookingId);

        if (process.env.NODE_ENV !== "production") {
          console.info("[stripe/webhook] update", {
            booking_request_id: bookingId,
            updated: Boolean(data),
            error: Boolean(error),
          });
        }
      }

      if (process.env.NODE_ENV !== "production") {
        console.info("[stripe/webhook] deposit paid", {
          booking_request_id: bookingId,
          amount_paid: amountPaid,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
