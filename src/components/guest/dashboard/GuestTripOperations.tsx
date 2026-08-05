import Link from "next/link";

import type { GuestTripOperationsViewModel } from "@/lib/guest/trip-operations-view-model";

type GuestTripOperationsProps = {
  operations: GuestTripOperationsViewModel;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function GuestTripOperations({ operations }: GuestTripOperationsProps) {
  return (
    <div className="space-y-0">
      <NeedsAttention operations={operations} />
      <PaymentSection payment={operations.payment} />
      <div className="grid border-b border-[#10224A]/12 lg:grid-cols-2 lg:divide-x lg:divide-[#10224A]/12">
        <AgreementSection agreement={operations.agreement} />
        <TravelersSection travelers={operations.travelers} />
      </div>
      <DocumentsSection documents={operations.documents} />
    </div>
  );
}

function NeedsAttention({ operations }: GuestTripOperationsProps) {
  if (!operations.attention) {
    return (
      <section aria-label="Needs attention" className="border-b border-[#10224A]/12 py-7">
        <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
          <h2 className="text-2xl font-semibold tracking-normal text-[#10224A]">Next step</h2>
          <p className="max-w-2xl text-sm leading-7 text-[#10224A]/62">
            Nothing needs your attention right now. We will keep the next important trip step here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="guest-attention-title" className="border-b border-[#10224A]/12 py-8">
      <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="text-sm text-[#A77A12]">Needs attention</p>
          <h2 id="guest-attention-title" className="mt-2 text-3xl font-semibold tracking-normal text-[#10224A]">
            {operations.attention.title}
          </h2>
        </div>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-7 text-[#10224A]/64">
            {operations.attention.description}
          </p>
          <Link
            href={operations.attention.actionHref}
            className="inline-flex min-h-11 shrink-0 items-center border-b border-[#C49A3A] pb-1 text-sm font-semibold text-[#10224A] transition hover:border-[#10224A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
          >
            {operations.attention.actionLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

function PaymentSection({ payment }: { payment: GuestTripOperationsViewModel["payment"] }) {
  const canShowProgress =
    typeof payment.totalCents === "number" &&
    payment.totalCents > 0 &&
    typeof payment.paidCents === "number";
  const progressWidth = canShowProgress
    ? `${Math.min(100, Math.max(0, (payment.paidCents! / payment.totalCents!) * 100))}%`
    : "0%";

  return (
    <section aria-labelledby="guest-payments-title" className="border-b border-[#10224A]/12 py-10">
      <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="text-sm text-[#10224A]/50">Trip essentials</p>
          <h2 id="guest-payments-title" className="mt-2 text-3xl font-semibold tracking-normal text-[#10224A]">
            Cost and payments
          </h2>
        </div>
        <div className="space-y-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-[#10224A]/50">Total trip cost</p>
              <p className="mt-2 text-4xl font-semibold tracking-normal text-[#10224A]">
                {formatMoney(payment.totalCents, payment.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#10224A]/50">Remaining balance</p>
              <p className="mt-2 text-4xl font-semibold tracking-normal text-[#10224A]">
                {formatMoney(payment.remainingCents, payment.currency)}
              </p>
            </div>
          </div>

          {canShowProgress ? (
            <div aria-label="Payment progress" className="h-px overflow-hidden bg-[#10224A]/12">
              <div className="h-px bg-[#C49A3A]" style={{ width: progressWidth }} />
            </div>
          ) : null}

          <div className="divide-y divide-[#10224A]/10">
            <OperationRow label="Status" value={payment.statusLabel} />
            <OperationRow label="Amount paid" value={formatMoney(payment.paidCents, payment.currency)} />
            <OperationRow label="Next payment" value={formatMoney(payment.nextDueCents, payment.currency)} />
            <OperationRow label="Due date" value={formatDate(payment.nextDueDate)} />
          </div>

          {payment.action ? (
            <Link
              href={payment.action.href}
              className="inline-flex min-h-11 items-center border-b border-[#C49A3A] pb-1 text-sm font-semibold text-[#10224A] transition hover:border-[#10224A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
            >
              {payment.action.label}
            </Link>
          ) : null}

          {payment.history.length ? (
            <div>
              <h3 className="text-sm font-semibold text-[#10224A]">Payment history</h3>
              <div className="mt-3 divide-y divide-[#10224A]/10">
                {payment.history.map((row) => (
                  <div key={row.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-[#10224A]">{row.statusLabel}</p>
                      <p className="mt-1 text-xs text-[#10224A]/50">{formatDate(row.paidAt)}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#10224A]">
                      {formatMoney(row.amountCents, payment.currency)}
                    </p>
                    {row.receiptHref ? (
                      <Link
                        href={row.receiptHref}
                        className="text-sm font-semibold text-[#10224A]/70 underline decoration-[#C49A3A] underline-offset-4 hover:text-[#10224A]"
                      >
                        Receipt
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-7 text-[#10224A]/56">No payment history is available yet.</p>
          )}

          {payment.warnings.length ? (
            <p className="text-sm leading-7 text-[#10224A]/56">{payment.warnings[0]}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AgreementSection({ agreement }: { agreement: GuestTripOperationsViewModel["agreement"] }) {
  return (
    <section aria-labelledby="guest-agreement-title" className="py-9 lg:pr-10">
      <h2 id="guest-agreement-title" className="text-2xl font-semibold tracking-normal text-[#10224A]">
        Agreement
      </h2>
      <div className="mt-6 divide-y divide-[#10224A]/10">
        <OperationRow label="Status" value={agreement.statusLabel} />
        <OperationRow label="Signed" value={formatDate(agreement.signedAt)} />
      </div>
      {agreement.action ? (
        <Link
          href={agreement.action.href}
          className="mt-6 inline-flex min-h-11 items-center border-b border-[#C49A3A] pb-1 text-sm font-semibold text-[#10224A] transition hover:border-[#10224A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
        >
          {agreement.action.label}
        </Link>
      ) : (
        <p className="mt-6 text-sm leading-7 text-[#10224A]/56">
          Your agreement will appear here when it is ready.
        </p>
      )}
    </section>
  );
}

function TravelersSection({ travelers }: { travelers: GuestTripOperationsViewModel["travelers"] }) {
  const counts = [
    travelers.totalTravelers == null ? null : `${travelers.totalTravelers} total`,
    travelers.adults == null ? null : `${travelers.adults} ${travelers.adults === 1 ? "adult" : "adults"}`,
    travelers.children == null ? null : `${travelers.children} ${travelers.children === 1 ? "child" : "children"}`,
  ].filter(Boolean);

  return (
    <section aria-labelledby="guest-travelers-title" className="py-9 lg:pl-10">
      <h2 id="guest-travelers-title" className="text-2xl font-semibold tracking-normal text-[#10224A]">
        Travelers
      </h2>
      <div className="mt-6 divide-y divide-[#10224A]/10">
        <OperationRow label="Status" value={travelers.statusLabel} />
        <OperationRow label="Party" value={counts.length ? counts.join(" · ") : "Not available yet"} />
      </div>
      {travelers.names.length ? (
        <p className="mt-5 text-sm leading-7 text-[#10224A]/62">{travelers.names.join(", ")}</p>
      ) : (
        <p className="mt-5 text-sm leading-7 text-[#10224A]/56">Traveler names are not available yet.</p>
      )}
      {travelers.action ? (
        <Link
          href={travelers.action.href}
          className="mt-6 inline-flex min-h-11 items-center border-b border-[#C49A3A] pb-1 text-sm font-semibold text-[#10224A] transition hover:border-[#10224A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
        >
          {travelers.action.label}
        </Link>
      ) : null}
    </section>
  );
}

function DocumentsSection({ documents }: { documents: GuestTripOperationsViewModel["documents"] }) {
  return (
    <section aria-labelledby="guest-documents-title" className="border-b border-[#10224A]/12 py-10">
      <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="text-sm text-[#10224A]/50">Files and confirmations</p>
          <h2 id="guest-documents-title" className="mt-2 text-3xl font-semibold tracking-normal text-[#10224A]">
            Trip documents
          </h2>
        </div>
        <div>
          {documents.length ? (
            <div className="divide-y divide-[#10224A]/10">
              {documents.map((document) => (
                <div key={document.id} className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-semibold text-[#10224A]">{document.label}</p>
                    <p className="mt-1 text-sm text-[#10224A]/54">
                      {document.typeLabel}
                      {document.statusLabel ? ` · ${document.statusLabel}` : ""}
                      {document.createdAt ? ` · ${formatDate(document.createdAt)}` : ""}
                    </p>
                  </div>
                  {document.downloadHref ? (
                    <Link
                      href={document.downloadHref}
                      className="inline-flex min-h-10 items-center border-b border-[#C49A3A] pb-0.5 text-sm font-semibold text-[#10224A] transition hover:border-[#10224A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
                    >
                      Open
                    </Link>
                  ) : (
                    <span className="text-sm text-[#10224A]/50">Available through concierge</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-[#10224A]/56">No trip documents are available yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function OperationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[0.72fr_1.28fr]">
      <p className="text-sm text-[#10224A]/50">{label}</p>
      <p className="text-sm font-semibold text-[#10224A]">{value}</p>
    </div>
  );
}

function formatMoney(cents: number | null, currency: string) {
  if (typeof cents !== "number") return "Not available yet";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "Not available yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available yet";
  return dateFormatter.format(date);
}
