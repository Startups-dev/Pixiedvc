"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase";

const AGREEMENT_TEXT = `1. Role of HannaDVC

HannaDVC is an independent digital intermediary platform that connects Disney Vacation Club ("DVC") owners with guests seeking reservations.

HannaDVC is not affiliated with, endorsed by, or sponsored by Disney Vacation Club or The Walt Disney Company.

HannaDVC does not own, control, operate, or manage any DVC property.

HannaDVC's role is limited to facilitating reservation matching, payment processing, and communication between owners and guests.

2. Independent Contractor Status

You acknowledge that you are an independent DVC owner.

Nothing in this Agreement creates a partnership, agency, joint venture, employment, or fiduciary relationship between you and HannaDVC.

You are solely responsible for your own tax reporting, regulatory compliance, financial obligations, and DVC membership standing.

3. Representations and Warranties

You represent and warrant that:

You are the lawful holder of the DVC membership used for listings.

Your membership is active and in good standing.

All maintenance fees, dues, and mortgage obligations are current.

You have full authority to rent or transfer reservations listed.

Information provided on the platform is accurate and complete.

You are familiar with DVC rules and policies and do not rely on HannaDVC for interpretation of Disney policies.

4. Owner Obligations

You agree to:

Maintain active membership in good standing.

Keep all financial obligations current.

Honor confirmed reservations once guest payment is completed.

Transfer reservations into guest names promptly.

Cooperate with reasonable reservation modifications required for operational or financial risk mitigation.

Not double-list active reservations or points on other rental platforms while listed on HannaDVC.

Comply with all Disney Vacation Club rules and policies.

Failure to perform these obligations constitutes a material breach.

5. No Guarantee of Rental

HannaDVC makes no guarantee that points or reservations will be rented.

HannaDVC is not responsible for expired points, unsold availability, or lack of guest demand.

6. Payments and Payout Structure

Owner payout amounts are determined by the rate accepted through the HannaDVC dashboard at the time of listing or reservation confirmation.

Guests may pay a different total amount. HannaDVC may retain a platform fee or pricing spread.

Platform fees do not reduce the agreed owner payout.

Payout timing and structure are governed by dashboard terms in effect at the time of reservation confirmation. Payout may be issued in stages or in full depending on reservation type, risk profile, and platform policy.

Owner payout is conditioned upon:

Full guest payment receipt and clearance

No active payment dispute

Reservation confirmation compliance

Identity Verification & Payout Authorization

HannaDVC reserves the right to require identity verification prior to releasing any payout to an Owner. Verification may include government-issued identification or other documentation reasonably necessary to confirm identity and payment eligibility.

Failure to complete requested verification may result in delayed or withheld payout until verification requirements are satisfied.

7. Payment Disputes and Chargebacks

If a guest initiates a chargeback, payment dispute, fraud claim, or financial reversal:

HannaDVC may:

Withhold unpaid payout

Delay payout

Reverse previously issued payout

Offset disputed amounts against future payouts

until final resolution.

Owner agrees to cooperate in mitigating financial loss, including assisting with reservation cancellation or modification when required.

8. Owner Default and Restitution

If a confirmed reservation cannot be honored due to owner action or inaction, including:

Failure to transfer

Membership lapse

Misrepresentation

Double listing

Violation of DVC policy

Owner agrees to:

Return all payouts received for the affected reservation

Compensate HannaDVC for direct losses incurred

Cooperate in guest resolution

9. Force Majeure

Neither party shall be liable for failure to perform due to events beyond reasonable control, including but not limited to:

Natural disasters

Government actions

War or civil unrest

Public health emergencies

Disney Vacation Club closures or operational restrictions

If performance becomes impossible or materially impaired:

HannaDVC may cancel or modify affected reservations.

Unpaid owner payouts may be withheld.

If payout has already been issued, Owner agrees to return funds received for affected reservations, less non-recoverable amounts as determined by platform policy.

Guest refunds shall follow platform policies in effect at the time.

10. Data Use and Confidentiality

Owner may use guest information solely for the purpose of completing reservation transfers and necessary communications.

Owner shall not retain, sell, distribute, or otherwise exploit guest data.

11. Platform Rights

HannaDVC reserves the right to:

Remove listings

Suspend or terminate owner access

Cancel transactions for fraud, safety, or policy violations

12. Indemnification

Owner agrees to indemnify and hold harmless HannaDVC from any claims, losses, damages, liabilities, and expenses arising from:

Owner breach of this Agreement

Owner failure to honor reservations

Owner violation of DVC rules

Owner misrepresentation

13. Limitation of Liability

HannaDVC's total liability shall not exceed the total payout paid to Owner during the twelve (12) months preceding the claim.

HannaDVC shall not be liable for indirect, incidental, special, or consequential damages.

14. Entire Agreement

This Agreement constitutes the entire agreement between the parties and supersedes prior communications.

15. Severability

If any provision is found unenforceable, the remainder shall remain in effect.

16. Modification

HannaDVC may update this Agreement from time to time. Continued use of the platform constitutes acceptance of updated terms.

17. Governing Law

This Agreement is governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein.

The parties submit to the non-exclusive jurisdiction of Ontario courts.`;

type AgreementStatus = {
  ok: boolean;
  ownerId: string;
  acceptedAt: string | null;
  agreementVersion: string | null;
};

export default function OwnerAgreementPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signedName, setSignedName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const agreementRef = useRef<HTMLElement | null>(null);
  const agreementEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace("/login?redirect=/owner/onboarding/agreement");
        return;
      }

      try {
        const response = await fetch("/api/owner/agreement/status", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!active) return;

        if (response.status === 401) {
          router.replace("/login?redirect=/owner/onboarding/agreement");
          return;
        }

        if (response.ok) {
          const payload = (await response.json()) as AgreementStatus;
          if (payload.acceptedAt) {
            router.replace("/owner/dashboard");
            return;
          }
          setLoading(false);
          return;
        }
      } catch {
        setError("Unable to load agreement status.");
      }

      setLoading(false);
    }

    load().catch(() => {
      if (!active) return;
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (loading || hasScrolledToEnd) return;
    const end = agreementEndRef.current;
    const agreement = agreementRef.current;
    if (!end || !agreement) return;

    const checkEnd = () => {
      const bounds = end.getBoundingClientRect();
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
      // The owner shell scrolls with the document. Also allow the marker to have
      // passed above the viewport: End/Tab can jump straight to the form/footer.
      if (bounds.height > 0 && bounds.bottom <= viewportHeight) {
        setHasScrolledToEnd(true);
      }
    };
    const intersection = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(checkEnd, { root: null });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(checkEnd);
    intersection?.observe(end);
    // Translation, font changes and reflow can move the end without a scroll.
    resize?.observe(agreement);
    window.addEventListener("scroll", checkEnd, { passive: true });
    window.addEventListener("resize", checkEnd);
    checkEnd();

    return () => {
      intersection?.disconnect();
      resize?.disconnect();
      window.removeEventListener("scroll", checkEnd);
      window.removeEventListener("resize", checkEnd);
    };
  }, [loading, hasScrolledToEnd]);

  async function handleAccept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasScrolledToEnd || !agreed || signedName.trim().length < 3 || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/owner/agreement/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ signedName }),
      });

      if (response.status === 401) {
        router.replace("/login?redirect=/owner/onboarding/agreement");
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Unable to accept agreement." }));
        setError(typeof payload.error === "string" ? payload.error : "Unable to accept agreement.");
        return;
      }

      router.replace("/owner/dashboard");
    } catch {
      setError("Unable to accept agreement. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <h1 className="text-3xl font-semibold text-slate-900">Owner Platform Agreement</h1>
        <p className="text-sm text-slate-500">Loading agreement...</p>
      </div>
    );
  }

  const canSubmit = hasScrolledToEnd && agreed && signedName.trim().length >= 3 && !submitting;

  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-6 px-4 py-8 [overflow-wrap:anywhere] sm:px-6 sm:py-12">
      <div className="rounded-3xl bg-gradient-to-br from-[#0C1A37] via-[#10264D] to-[#0A1733] px-5 py-6 shadow-[0_24px_60px_rgba(6,17,40,0.35)] sm:px-6 sm:py-7">
        <h1 className="text-3xl font-semibold tracking-tight !text-white sm:text-4xl">Owner Platform Agreement</h1>
        <p className="mt-2 text-sm text-slate-400">
          Before listing points or confirmed reservations, please review and accept this agreement.
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Read the full agreement below. The acceptance fields follow the final clause.
        </p>
      </div>

      <article
        ref={agreementRef}
        aria-labelledby="owner-agreement-title"
        className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
      >
        <h2 id="owner-agreement-title" className="mb-6 text-xl font-semibold leading-7 text-slate-900">HannaDVC Owner Platform Agreement</h2>
        <div className="space-y-3 text-base leading-7">
          {AGREEMENT_TEXT.split("\n").map((line, index) => {
            const trimmed = line.trim();
            const isClauseTitle = /^\d+\.\s/.test(trimmed);
            if (!trimmed) {
              return <div key={`line-${index}`} className="h-1" aria-hidden="true" />;
            }
            if (isClauseTitle) return <h3 key={`line-${index}`} className="pt-3 text-lg font-semibold leading-7 text-slate-900">{line}</h3>;
            return (
              <p
                key={`line-${index}`}
                className="text-slate-700"
              >
                {line}
              </p>
            );
          })}
        </div>
        <div ref={agreementEndRef} data-testid="agreement-end" className="h-px" aria-hidden="true" />
      </article>

      <form onSubmit={handleAccept} className="min-w-0 space-y-5" aria-label="Accept owner platform agreement">
        <p id="agreement-reading-status" role="status" className="text-sm leading-6 text-slate-600">
          {hasScrolledToEnd ? "You have reached the end of the agreement." : "Read to the end of the agreement to enable the checkbox."}
        </p>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm leading-6 text-slate-700">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            disabled={!hasScrolledToEnd}
            required
            aria-describedby="agreement-reading-status"
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          />
          <span>I have read and agree to the HannaDVC Owner Platform Agreement.</span>
        </label>

        <label className="block">
          <span className="text-sm text-slate-700">Type your full legal name (as shown on your DVC membership)</span>
          <input
            type="text"
            value={signedName}
            onChange={(event) => setSignedName(event.target.value)}
            className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            autoComplete="name"
            required
            minLength={3}
          />
        </label>

        {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-11 w-full rounded-xl bg-slate-900 px-5 py-3 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {submitting ? "Submitting..." : "Accept & Continue"}
        </button>
      </form>
    </div>
  );
}
