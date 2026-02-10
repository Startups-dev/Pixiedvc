import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card, Button } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnerRentalDetail, getRentalDocumentUrls } from "@/lib/owner-data";
import {
  calculatePayoutAmountCents,
  formatCurrency,
  getMilestoneLabel,
  getMilestoneStatus,
  getMissingApprovalPrerequisites,
  normalizeMilestones,
} from "@/lib/owner-portal";
import MilestoneStepper from "@/components/owner/MilestoneStepper";
import DocumentList from "@/components/owner/DocumentList";
import UploadBox from "@/components/owner/UploadBox";
import OwnerApprovalButton from "@/components/owner/OwnerApprovalButton";
import OwnerConfirmationTile from "@/components/owner/OwnerConfirmationTile";
import PayoutTimeline from "@/components/owner/PayoutTimeline";
import ExceptionRequestForm from "@/components/owner/ExceptionRequestForm";
import DevSeedRental from "@/components/owner/DevSeedRental";
import styles from "./rental-header.module.css";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatShortDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFamilyLabel(name: string | null) {
  if (!name) return "Guest Family";
  const tokens = name.split(" ").filter(Boolean);
  const last = tokens.length ? tokens[tokens.length - 1] : "Guest";
  return `${last} Family`;
}

function formatAddress(address: Record<string, unknown> | null | undefined) {
  if (!address) return "—";
  const line1 = typeof address.line1 === "string" ? address.line1 : "";
  const line2 = typeof address.line2 === "string" ? address.line2 : "";
  const city = typeof address.city === "string" ? address.city : "";
  const state = typeof address.state === "string" ? address.state : "";
  const postal = typeof address.postal === "string" ? address.postal : "";
  const country = typeof address.country === "string" ? address.country : "";

  const cityLine = [city, state, postal].filter(Boolean).join(" ");
  const parts = [line1, line2, cityLine, country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function deriveOwnerPayoutCents(
  rental: {
    owner_total_cents?: number | null;
    owner_rate_per_point_cents?: number | null;
    rental_amount_cents: number | null;
    points_required: number | null;
  },
  bookingPackage: Record<string, unknown>,
) {
  if (typeof rental.owner_total_cents === "number" && rental.owner_total_cents > 0) {
    return rental.owner_total_cents;
  }
  const pointsRequired =
    typeof rental.points_required === "number"
      ? rental.points_required
      : typeof bookingPackage.points_required === "number"
        ? bookingPackage.points_required
        : null;
  if (typeof rental.owner_rate_per_point_cents === "number" && pointsRequired) {
    return rental.owner_rate_per_point_cents * pointsRequired;
  }
  if (typeof rental.rental_amount_cents === "number" && rental.rental_amount_cents > 0) {
    return rental.rental_amount_cents;
  }
  return 0;
}

function formatPhone(value: string | null | undefined) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value;
}

function formatParty(rental: {
  adults?: number | null;
  youths?: number | null;
  booking_package?: Record<string, unknown> | null;
  party_size?: number | null;
}) {
  const pkg = rental.booking_package ?? {};
  const adults =
    typeof rental.adults === "number"
      ? rental.adults
      : typeof (pkg as any).adults === "number"
        ? (pkg as any).adults
        : null;
  const youths =
    typeof rental.youths === "number"
      ? rental.youths
      : typeof (pkg as any).youths === "number"
        ? (pkg as any).youths
        : null;

  if (adults !== null || youths !== null) {
    const adultLabel = adults === null ? "— adults" : `${adults} adult${adults === 1 ? "" : "s"}`;
    const youthLabel = youths === null ? "— kids" : `${youths} kid${youths === 1 ? "" : "s"}`;
    return `${adultLabel} · ${youthLabel}`;
  }

  if (typeof rental.party_size === "number") {
    return `${rental.party_size} guest${rental.party_size === 1 ? "" : "s"}`;
  }

  return "—";
}

function statusPill(status: string) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]";
  switch (status) {
    case "needs_dvc_booking":
      return `${base} bg-amber-100 text-amber-700`;
    case "awaiting_owner_approval":
      return `${base} bg-amber-100 text-amber-700`;
    case "booked_pending_agreement":
      return `${base} bg-indigo-100 text-indigo-700`;
    case "booked":
      return `${base} bg-indigo-100 text-indigo-700`;
    case "completed":
      return `${base} bg-emerald-100 text-emerald-700`;
    case "cancelled":
      return `${base} bg-rose-100 text-rose-700`;
    default:
      return `${base} bg-slate-100 text-slate-600`;
  }
}

export default async function OwnerRentalDetailPage({ params }: { params: { rentalId: string } }) {
  const isDev = process.env.NODE_ENV !== "production";
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/owner/rentals/${params.rentalId}`);
  }

  const rental = await getOwnerRentalDetail(user.id, params.rentalId, cookieStore);
  if (!rental) {
    if (isDev) {
      return (
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
          <Card className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Rental not found</h1>
              <p className="text-sm text-muted">
                Rental not found or not accessible due to RLS. Requested id:{" "}
                <span className="font-semibold text-ink">{params.rentalId}</span>
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Seed a demo rental tied to your account for local testing.
              <DevSeedRental className="mt-3" />
            </div>
            <Link href="/owner/rentals" className="text-xs font-semibold text-brand hover:underline">
              Back to rentals
            </Link>
          </Card>
        </div>
      );
    }
    redirect("/owner/rentals");
  }

  const documents = await getRentalDocumentUrls(rental.rental_documents ?? [], 3600, cookieStore);
  const milestones = normalizeMilestones(rental.rental_milestones ?? []);
  const payouts = (rental.payout_ledger ?? []) as any[];
  const agreementDoc = documents.find((doc) => doc.type === "agreement_pdf");
  const approvalCompleted = getMilestoneStatus("owner_approved", milestones) === "completed";
  const confirmationCompleted = getMilestoneStatus("disney_confirmation_uploaded", milestones) === "completed";
  const paymentVerified = getMilestoneStatus("payment_verified", milestones) === "completed";
  const hasConfirmationNumber = Boolean(rental.dvc_confirmation_number);
  const bookingPackage = (rental.booking_package ?? {}) as Record<string, unknown>;
  const leadGuestName =
    rental.lead_guest_name ?? (bookingPackage.lead_guest_name as string | null) ?? null;
  const leadGuestEmail =
    rental.lead_guest_email ?? (bookingPackage.lead_guest_email as string | null) ?? null;
  const leadGuestPhone =
    rental.lead_guest_phone ?? (bookingPackage.lead_guest_phone as string | null) ?? null;
  const familyLabel = getFamilyLabel(leadGuestName);
  const checkInLabel = formatShortDate(rental.check_in ?? null);
  const checkOutLabel = formatShortDate(rental.check_out ?? null);
  const pointsLabel = rental.points_required ?? null;
  const guestAddress =
    rental.lead_guest_address ?? (bookingPackage.lead_guest_address as Record<string, unknown> | null) ?? null;
  const depositPaid = typeof bookingPackage.deposit_paid === "number" ? bookingPackage.deposit_paid : null;
  const depositDue = typeof bookingPackage.deposit_due === "number" ? bookingPackage.deposit_due : null;
  const depositCurrency =
    typeof bookingPackage.deposit_currency === "string" ? bookingPackage.deposit_currency : "USD";
  const ownerRatePerPointCents =
    typeof rental.owner_rate_per_point_cents === "number" ? rental.owner_rate_per_point_cents : null;
  const ownerPremiumCents =
    typeof rental.owner_premium_per_point_cents === "number" ? rental.owner_premium_per_point_cents : null;
  const premiumApplied = Boolean(rental.owner_home_resort_premium_applied);
  const guestTotalCents =
    typeof bookingPackage.guest_total_cents === "number" ? bookingPackage.guest_total_cents : null;
  const guestRatePerPointCents =
    typeof bookingPackage.guest_rate_per_point_cents === "number" ? bookingPackage.guest_rate_per_point_cents : null;
  const stage70 = payouts.find((payout) => Number(payout.stage) === 70) ?? null;
  const stage30 = payouts.find((payout) => Number(payout.stage) === 30) ?? null;
  const derivedRentalAmount = deriveOwnerPayoutCents(
    {
      owner_total_cents: rental.owner_total_cents ?? null,
      owner_rate_per_point_cents: ownerRatePerPointCents,
      rental_amount_cents: rental.rental_amount_cents,
      points_required: rental.points_required,
    },
    bookingPackage,
  );
  const payout70Amount = calculatePayoutAmountCents(derivedRentalAmount, 70);
  const payout30Amount = calculatePayoutAmountCents(derivedRentalAmount, 30);
  const shouldGuestVerified = Boolean(
    rental.guest_user_id || (leadGuestName && leadGuestEmail && leadGuestPhone),
  );
  const shouldPaymentVerified = typeof depositPaid === "number" && depositPaid >= 99;
  const shouldBookingCompleted = Boolean(rental.dvc_confirmation_number);
  const shouldPackageReady = Boolean(Object.keys(bookingPackage).length);
  const displayMilestones = [
    ...milestones.map((milestone) => {
      if (milestone.code === "guest_verified" && shouldGuestVerified) {
        return { ...milestone, status: "completed", occurred_at: milestone.occurred_at ?? new Date().toISOString() };
      }
      if (milestone.code === "payment_verified" && shouldPaymentVerified) {
        return { ...milestone, status: "completed", occurred_at: milestone.occurred_at ?? new Date().toISOString() };
      }
      if (milestone.code === "booking_package_sent" && shouldPackageReady) {
        return { ...milestone, status: "completed", occurred_at: milestone.occurred_at ?? new Date().toISOString() };
      }
      if (milestone.code === "owner_booked" && shouldBookingCompleted) {
        return { ...milestone, status: "completed", occurred_at: milestone.occurred_at ?? new Date().toISOString() };
      }
      return milestone;
    }),
    {
      code: "payout_70_released",
      status: stage70?.status === "released" ? "completed" : "pending",
      occurred_at: stage70?.released_at ?? stage70?.eligible_at ?? null,
    },
    {
      code: "payout_30_released",
      status: stage30?.status === "released" ? "completed" : "pending",
      occurred_at: stage30?.released_at ?? stage30?.eligible_at ?? null,
    },
  ];

  const missingApproval = getMissingApprovalPrerequisites(displayMilestones);
  const missingLabels = missingApproval.map((code) => getMilestoneLabel(code as any));
  const approvalEnabled = missingApproval.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className={`space-y-3 ${styles.header}`}>
        <Link href="/owner/rentals" className="text-xs uppercase tracking-[0.3em] text-muted">
          ← Back to rentals
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-ink">
                {rental.resort_code} / {leadGuestName ?? "Guest TBD"}
              </h1>
              {typeof pointsLabel === "number" ? (
                <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
                  {pointsLabel.toLocaleString("en-US")} pts
                </span>
              ) : null}
            </div>
            <p className="text-lg font-medium text-slate-700">{familyLabel}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                {checkInLabel}
              </span>
              <span className="text-slate-400">→</span>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
                {checkOutLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {leadGuestEmail ?? "Email pending"} · {formatPhone(leadGuestPhone)}
            </p>
            <p className="text-xs text-slate-400">Party: {formatParty(rental)}</p>
          </div>
          <span className={statusPill(rental.status)}>{rental.status.replace(/_/g, " ")}</span>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Milestones</p>
          <MilestoneStepper milestones={displayMilestones} />
        </Card>
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Booking package</p>
          <div className="space-y-2 text-sm text-muted">
            <div className="flex items-center justify-between">
              <span>Dates</span>
              <span className="font-semibold text-ink">
                {formatDate(rental.check_in)} – {formatDate(rental.check_out)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Room type</span>
              <span className="font-semibold text-ink">{rental.room_type ?? "Pending"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Points required</span>
              <span className="font-semibold text-ink">{rental.points_required ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Owner payout</span>
              <span className="font-semibold text-ink">{formatCurrency(derivedRentalAmount)}</span>
            </div>
            <p className="text-xs text-slate-500">
              Rate: {ownerRatePerPointCents !== null ? `$${(ownerRatePerPointCents / 100).toFixed(2)}/pt` : "—"}
              {premiumApplied && ownerPremiumCents ? ` (+$${(ownerPremiumCents / 100).toFixed(2)} home resort premium)` : ""}
            </p>
            <div className="flex items-center justify-between">
              <span>Lead guest</span>
              <span className="font-semibold text-ink">{leadGuestName ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Guest email</span>
              <span className="font-semibold text-ink">{leadGuestEmail ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Guest phone</span>
              <span className="font-semibold text-ink">{formatPhone(leadGuestPhone)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Party size</span>
              <span className="font-semibold text-ink">{formatParty(rental)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Guest address</span>
              <span className="font-semibold text-ink">{formatAddress(guestAddress)}</span>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Payment schedule</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-4">
                  <span>Upon booking (70%)</span>
                  <span className="ml-auto min-w-[140px] text-right font-semibold text-ink tabular-nums">
                    {stage70?.status ? `${stage70.status}` : "Pending"} · {formatCurrency(payout70Amount)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span>90 days before check-in (30%)</span>
                  <span className="ml-auto min-w-[140px] text-right font-semibold text-ink tabular-nums">
                    {stage30?.status ? `${stage30.status}` : "Pending"} · {formatCurrency(payout30Amount)}
                  </span>
                </div>
              </div>
            </div>
            {rental.special_needs ? (
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Special needs: {rental.special_needs_notes ?? "Noted by guest."}
              </div>
            ) : null}
          </div>
          {!approvalCompleted ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
              <div className="mt-3">
                <OwnerApprovalButton rentalId={rental.id} disabled={!approvalEnabled} missing={missingLabels} />
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                After approval, you’ll book the stay in Disney and upload the confirmation to unlock payout.
              </p>
            </div>
          ) : (
            <p className="rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-700">Booking package approved.</p>
          )}
        </Card>
      </section>

      {approvalCompleted ? (
        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <DocumentList documents={documents} />
          <div className="space-y-4">
            <OwnerConfirmationTile
              rentalId={rental.id}
              initialConfirmationNumber={rental.dvc_confirmation_number}
            />
            {hasConfirmationNumber ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Agreement</p>
                {agreementDoc?.signed_url ? (
                  <a
                    href={agreementDoc.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-semibold text-brand hover:underline"
                  >
                    View signed agreement
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Agreement is being drafted. A signed copy will be sent to you shortly after you submit the confirmation number from DVC.
                  </p>
                )}
              </div>
            ) : null}
            <Card className="space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Upload Disney confirmation</p>
              <p className="text-sm text-muted">
                Upload the Disney confirmation email (PDF or screenshot) after booking the reservation. This unlocks your 70% payout.
              </p>
              {confirmationCompleted ? (
                <p className="rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-700">Disney confirmation uploaded.</p>
              ) : (
                <UploadBox
                  rentalId={rental.id}
                  documentType="disney_confirmation_email"
                  label="Disney confirmation email"
                  helper="PDF or screenshot accepted."
                  confirmationNumber={rental.dvc_confirmation_number}
                  disabledMessage="Enter the confirmation number above to enable upload."
                />
              )}
            </Card>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <PayoutTimeline payouts={payouts} />
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Changes & exceptions</p>
          <p className="text-sm text-muted">
            Need to modify dates or cancel the stay? Submit a request and concierge will follow up.
          </p>
          <ExceptionRequestForm rentalId={rental.id} />
        </Card>
      </section>
    </div>
  );
}
