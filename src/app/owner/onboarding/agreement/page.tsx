"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase";

const AGREEMENT_TEXT = `1. Role of PixieDVC

PixieDVC is an independent digital intermediary platform that connects Disney Vacation Club ("DVC") owners with guests seeking reservations.

PixieDVC is not affiliated with, endorsed by, or sponsored by Disney Vacation Club or The Walt Disney Company.

PixieDVC does not own, control, operate, or manage any DVC property.

PixieDVC's role is limited to facilitating reservation matching, payment processing, and communication between owners and guests.

2. Independent Contractor Status

You acknowledge that you are an independent DVC owner.

Nothing in this Agreement creates a partnership, agency, joint venture, employment, or fiduciary relationship between you and PixieDVC.

You are solely responsible for your own tax reporting, regulatory compliance, financial obligations, and DVC membership standing.

3. Representations and Warranties

You represent and warrant that:

You are the lawful holder of the DVC membership used for listings.

Your membership is active and in good standing.

All maintenance fees, dues, and mortgage obligations are current.

You have full authority to rent or transfer reservations listed.

Information provided on the platform is accurate and complete.

You are familiar with DVC rules and policies and do not rely on PixieDVC for interpretation of Disney policies.

4. Owner Obligations

You agree to:

Maintain active membership in good standing.

Keep all financial obligations current.

Honor confirmed reservations once guest payment is completed.

Transfer reservations into guest names promptly.

Cooperate with reasonable reservation modifications required for operational or financial risk mitigation.

Not double-list active reservations or points on other rental platforms while listed on PixieDVC.

Comply with all Disney Vacation Club rules and policies.

Failure to perform these obligations constitutes a material breach.

5. No Guarantee of Rental

PixieDVC makes no guarantee that points or reservations will be rented.

PixieDVC is not responsible for expired points, unsold availability, or lack of guest demand.

6. Payments and Payout Structure

Owner payout amounts are determined by the rate accepted through the PixieDVC dashboard at the time of listing or reservation confirmation.

Guests may pay a different total amount. PixieDVC may retain a platform fee or pricing spread.

Platform fees do not reduce the agreed owner payout.

Payout timing and structure are governed by dashboard terms in effect at the time of reservation confirmation. Payout may be issued in stages or in full depending on reservation type, risk profile, and platform policy.

Owner payout is conditioned upon:

Full guest payment receipt and clearance

No active payment dispute

Reservation confirmation compliance

Identity Verification & Payout Authorization

PixieDVC reserves the right to require identity verification prior to releasing any payout to an Owner. Verification may include government-issued identification or other documentation reasonably necessary to confirm identity and payment eligibility.

Failure to complete requested verification may result in delayed or withheld payout until verification requirements are satisfied.

7. Payment Disputes and Chargebacks

If a guest initiates a chargeback, payment dispute, fraud claim, or financial reversal:

PixieDVC may:

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

Compensate PixieDVC for direct losses incurred

Cooperate in guest resolution

9. Force Majeure

Neither party shall be liable for failure to perform due to events beyond reasonable control, including but not limited to:

Natural disasters

Government actions

War or civil unrest

Public health emergencies

Disney Vacation Club closures or operational restrictions

If performance becomes impossible or materially impaired:

PixieDVC may cancel or modify affected reservations.

Unpaid owner payouts may be withheld.

If payout has already been issued, Owner agrees to return funds received for affected reservations, less non-recoverable amounts as determined by platform policy.

Guest refunds shall follow platform policies in effect at the time.

10. Data Use and Confidentiality

Owner may use guest information solely for the purpose of completing reservation transfers and necessary communications.

Owner shall not retain, sell, distribute, or otherwise exploit guest data.

11. Platform Rights

PixieDVC reserves the right to:

Remove listings

Suspend or terminate owner access

Cancel transactions for fraud, safety, or policy violations

12. Indemnification

Owner agrees to indemnify and hold harmless PixieDVC from any claims, losses, damages, liabilities, and expenses arising from:

Owner breach of this Agreement

Owner failure to honor reservations

Owner violation of DVC rules

Owner misrepresentation

13. Limitation of Liability

PixieDVC's total liability shall not exceed the total payout paid to Owner during the twelve (12) months preceding the claim.

PixieDVC shall not be liable for indirect, incidental, special, or consequential damages.

14. Entire Agreement

This Agreement constitutes the entire agreement between the parties and supersedes prior communications.

15. Severability

If any provision is found unenforceable, the remainder shall remain in effect.

16. Modification

PixieDVC may update this Agreement from time to time. Continued use of the platform constitutes acceptance of updated terms.

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
  const agreementBoxRef = useRef<HTMLDivElement | null>(null);

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
        // fallback below
      }

      const { data: ownerByUserId } = await supabase
        .from("owners")
        .select("id, user_id, agreement_accepted_at")
        .eq("user_id", user.id)
        .maybeSingle();

      let owner = ownerByUserId;
      if (!owner) {
        owner = (
          await supabase
            .from("owners")
            .select("id, user_id, agreement_accepted_at")
            .eq("id", user.id)
            .maybeSingle()
        ).data;
      }

      if (!owner) {
        await supabase.from("owners").upsert({ id: user.id, user_id: user.id }, { onConflict: "id" });
      } else if (!owner.user_id && owner.id === user.id) {
        await supabase.from("owners").update({ user_id: user.id }).eq("id", user.id).is("user_id", null);
      }

      if (owner?.agreement_accepted_at) {
        router.replace("/owner/dashboard");
        return;
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
    if (loading) return;
    const node = agreementBoxRef.current;
    if (!node) return;
    if (node.scrollHeight <= node.clientHeight) {
      setHasScrolledToEnd(true);
    }
  }, [loading]);

  function handleAgreementScroll() {
    const node = agreementBoxRef.current;
    if (!node || hasScrolledToEnd) return;
    const isAtBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 8;
    if (isAtBottom) {
      setHasScrolledToEnd(true);
    }
  }

  async function handleAccept() {
    setSubmitting(true);
    setError(null);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?redirect=/owner/onboarding/agreement");
        return;
      }

      const name = signedName.trim();
      const { data: ownerByUserId } = await supabase
        .from("owners")
        .select("id, user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const owner =
        ownerByUserId ??
        (
          await supabase
            .from("owners")
            .select("id, user_id")
            .eq("id", user.id)
            .maybeSingle()
        ).data;

      const ownerId = owner?.id ?? user.id;
      await supabase.from("owners").upsert({ id: ownerId, user_id: user.id }, { onConflict: "id" });
      const { error: fallbackError } = await supabase
        .from("owners")
        .update({
          agreement_version: "v1",
          agreement_accepted_at: new Date().toISOString(),
          agreement_signed_name: name,
        })
        .eq("id", ownerId);

      if (fallbackError) {
        const payload = await response.json().catch(() => ({ error: "Unable to accept agreement." }));
        setError(typeof payload.error === "string" ? payload.error : "Unable to accept agreement.");
        setSubmitting(false);
        return;
      }
    }

    router.replace("/owner/dashboard");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <h1 className="text-3xl font-semibold text-slate-900">Owner Platform Agreement</h1>
        <p className="text-sm text-slate-600">Loading agreement...</p>
      </div>
    );
  }

  const canSubmit = agreed && signedName.trim().length > 0 && !submitting;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
      <div className="rounded-3xl bg-gradient-to-br from-[#0C1A37] via-[#10264D] to-[#0A1733] px-6 py-7 shadow-[0_24px_60px_rgba(6,17,40,0.35)]">
        <h1 className="text-4xl font-semibold tracking-tight !text-white">Owner Platform Agreement</h1>
        <p className="mt-2 text-sm text-slate-400">
          Before listing points or confirmed reservations, please review and accept this agreement.
        </p>
      </div>

      <div
        ref={agreementBoxRef}
        onScroll={handleAgreementScroll}
        className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5"
      >
        <h2 className="mb-4 text-xl font-semibold text-slate-900">PixieDVC Owner Platform Agreement</h2>
        <div className="space-y-2 text-sm leading-6">
          {AGREEMENT_TEXT.split("\n").map((line, index) => {
            const trimmed = line.trim();
            const isClauseTitle = /^\d+\.\s/.test(trimmed);
            if (!trimmed) {
              return <div key={`line-${index}`} className="h-1" />;
            }
            return (
              <p
                key={`line-${index}`}
                className={isClauseTitle ? "text-xl font-semibold text-slate-900" : "text-slate-700"}
              >
                {line}
              </p>
            );
          })}
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          disabled={!hasScrolledToEnd}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <span>I have read and agree to the PixieDVC Owner Platform Agreement.</span>
      </label>
      {!hasScrolledToEnd ? <p className="text-xs text-slate-500">Scroll to the end to enable agreement.</p> : null}

      <label className="block">
        <span className="text-sm text-slate-700">Type your full legal name (as shown on your DVC membership)</span>
        <input
          type="text"
          value={signedName}
          onChange={(event) => setSignedName(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
          autoComplete="name"
        />
      </label>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button
        type="button"
        onClick={handleAccept}
        disabled={!canSubmit}
        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Accept & Continue"}
      </button>
    </div>
  );
}
