import { NextResponse } from "next/server";

type ResolveResponse = {
  booking_request_id?: string | null;
  error?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe secret key missing." }, { status: 500 });
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });
  const session = (await response.json()) as {
    client_reference_id?: string | null;
    metadata?: { booking_request_id?: string | null; booking_id?: string | null };
  };

  const bookingId =
    session.metadata?.booking_request_id ??
    session.client_reference_id ??
    session.metadata?.booking_id ??
    null;

  const payload: ResolveResponse = {
    booking_request_id: bookingId ?? null,
  };

  return NextResponse.json(payload);
}
