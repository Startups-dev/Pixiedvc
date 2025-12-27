type PayPalPayload = {
  bookingId?: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
};

export async function createPayPalOrder(payload: PayPalPayload) {
  console.info("[PayPal] Creating order", payload);
  return { approvalUrl: "https://paypal.test/checkout" };
}

export async function handlePayPalWebhook(request: Request) {
  void request;
  console.info("[PayPal] Webhook received");
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
