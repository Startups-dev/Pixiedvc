type StripePayload = {
  bookingId?: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
};

export async function createStripeIntent(payload: StripePayload) {
  console.info("[Stripe] Creating payment intent", payload);
  return { clientSecret: "pi_test_secret" };
}

export async function handleStripeWebhook(request: Request) {
  void request;
  console.info("[Stripe] Webhook received");
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
