// src/app/pay/[token]/page.tsx

import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase-service-client";

type PaymentRecord = {
  id: string;
  amount_cents: number | null;
  currency: string | null;
  status: string | null;
  booking_request_id: string | null;
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, amount_cents, currency, status, booking_request_id")
    .eq("id", token)
    .maybeSingle<PaymentRecord>();

  if (error || !payment) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <div className="rounded-2xl border border-[#0B1B3A]/10 bg-white p-6 shadow-sm space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-[#0B1B3A]">
            Complete your payment
          </h1>
          <p className="text-sm text-[#0B1B3A]/65">
            Secure checkout for your reservation
          </p>
        </header>

        <div className="rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#0B1B3A]/60">Amount</span>
            <span className="font-semibold text-[#0B1B3A]">
              {((payment.amount_cents ?? 0) / 100).toFixed(2)} {payment.currency ?? "USD"}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-[#0B1B3A]/60">Status</span>
            <span className="font-semibold text-[#0B1B3A]">
              {payment.status ?? "Pending"}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            className="w-full rounded-full bg-[#0B1B3A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0B1B3A]/90"
          >
            Proceed to payment
          </button>

          {payment.booking_request_id ? (
            <Link
              href={`/my-trip/${payment.booking_request_id}`}
              className="block text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#0B1B3A]/60 hover:text-[#0B1B3A]"
            >
              View trip details
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
