export type Gateway = "stripe" | "paypal";

type DepositPayload = {
  bookingId?: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
};

export async function createDepositIntent(gateway: Gateway, payload: DepositPayload) {
  if (gateway === "stripe") {
    const { createStripeIntent } = await import("./stripe");
    return createStripeIntent(payload);
  }
  const { createPayPalOrder } = await import("./paypal");
  return createPayPalOrder(payload);
}

export async function handleWebhook(gateway: Gateway, request: Request) {
  if (gateway === "stripe") {
    const { handleStripeWebhook } = await import("./stripe");
    return handleStripeWebhook(request);
  }
  const { handlePayPalWebhook } = await import("./paypal");
  return handlePayPalWebhook(request);
}
