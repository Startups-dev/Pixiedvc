"use client";

import { FormEvent, ReactNode, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Clock3, BarChart3 } from "lucide-react";
import {
  affiliateCard,
  affiliateCard2,
  affiliateInput,
  affiliateLink,
  affiliatePrimaryButton,
  affiliateTextMuted,
} from "@/lib/affiliate-theme";

type ApplyForm = {
  fullName: string;
  email: string;
  websiteOrChannelUrl: string;
  socialLink: string;
  promotionPlan: string;
  trafficEstimate: string;
  agreed: boolean;
};

const initialForm: ApplyForm = {
  fullName: "",
  email: "",
  websiteOrChannelUrl: "",
  socialLink: "",
  promotionPlan: "",
  trafficEstimate: "",
  agreed: false,
};

const benefits = [
  { icon: Sparkles, title: "6% commission per confirmed booking", copy: "Earn on every qualified stay you refer." },
  { icon: Clock3, title: "90-day referral tracking window", copy: "Attribution remains active for 90 days." },
  { icon: BarChart3, title: "Real-time performance dashboard", copy: "Track clicks, conversions, and payouts clearly." },
  { icon: ShieldCheck, title: "Luxury positioning", copy: "Premium partner ecosystem without discount-brand feel." },
];

const faqs = [
  {
    q: "When do I get paid?",
    a: "Commissions are paid after confirmed stays according to our payout schedule.",
  },
  {
    q: "Can anyone apply?",
    a: "We welcome Disney-focused creators and travel partners. All accounts are subject to review.",
  },
  {
    q: "How long is the referral window?",
    a: "90 days from initial referral click.",
  },
  {
    q: "Can my account be suspended?",
    a: "Yes. Accounts that violate brand guidelines or affiliate terms may be suspended.",
  },
];

export default function AffiliateProgramPage() {
  const applyRef = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState<ApplyForm>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      form.fullName.trim() &&
      form.email.trim() &&
      form.websiteOrChannelUrl.trim() &&
      form.promotionPlan.trim() &&
      form.agreed
    );
  }, [form]);

  function scrollToApply() {
    applyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setMessage(null);
    setReferralLink(null);

    const response = await fetch("/api/affiliate/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = (await response.json().catch(() => null)) as
      | { error?: string; referralLink?: string }
      | null;

    if (!response.ok) {
      setStatus("error");
      setMessage(data?.error ?? "Unable to submit application.");
      return;
    }

    setStatus("success");
    setMessage(data?.message ?? "Application submitted. We review applications within 48 hours.");
    setReferralLink(data?.referralLink ?? null);
    setForm(initialForm);
  }

  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-2 lg:items-center lg:py-32">
        <div>
          <p className={`mb-4 text-xs uppercase tracking-[0.24em] ${affiliateTextMuted}`}>
            Already an affiliate?{" "}
            <Link href="/affiliate/login" className={`font-semibold ${affiliateLink}`}>
              Sign in here
            </Link>
          </p>
          <h1 className="text-5xl font-semibold tracking-tight md:text-6xl" style={{ color: "#64748b" }}>
            Partner With PixieDVC
          </h1>
          <p className={`mt-6 max-w-xl text-lg leading-relaxed ${affiliateTextMuted}`}>
            Earn commission on every confirmed DVC booking you refer. Simple tracking. Premium positioning. Transparent
            payouts.
          </p>
          <button
            type="button"
            onClick={scrollToApply}
            className={`mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition ${affiliatePrimaryButton}`}
          >
            Apply Now
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            href="/affiliate/login"
            className="ml-3 inline-flex items-center rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-slate-500 transition hover:bg-white/5"
          >
            Existing Affiliate Login
          </Link>
        </div>

        <div className={`${affiliateCard} rounded-3xl p-6`}>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/40">
            <img
              src="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Affiliate%20%20pages%20images/PixieDvc%20Affiliate%20Dashboard.png"
              alt="PixieDVC Affiliate Dashboard preview"
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-500 md:text-4xl" style={{ color: "#64748b" }}>
          Why Join
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article
                key={benefit.title}
                className={`${affiliateCard} p-6`}
              >
                <Icon className="h-5 w-5 text-[#D4AF37]" />
                <h3 className="mt-4 text-lg font-semibold text-slate-500" style={{ color: "#64748b" }}>
                  {benefit.title}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed ${affiliateTextMuted}`}>{benefit.copy}</p>
              </article>
            );
          })}
        </div>
        <p className={`mt-8 max-w-4xl text-sm leading-relaxed ${affiliateTextMuted}`}>
          We selectively partner with Disney-focused creators, travel planners, and community leaders to maintain
          quality and brand integrity.
        </p>
      </section>

      <section ref={applyRef} id="affiliate-application" className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-500 md:text-4xl" style={{ color: "#64748b" }}>
            Apply to Become a PixieDVC Affiliate
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className={`mt-10 rounded-3xl p-8 ${affiliateCard}`}
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Full Name *">
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                className={`${affiliateInput} !text-slate-400`}
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className={`${affiliateInput} !text-slate-400`}
              />
            </Field>
            <Field label="Website or Channel URL *">
              <input
                value={form.websiteOrChannelUrl}
                onChange={(e) => setForm({ ...form, websiteOrChannelUrl: e.target.value })}
                required
                className={`${affiliateInput} !text-slate-400`}
              />
            </Field>
            <Field label="Instagram / YouTube link (optional)">
              <input
                value={form.socialLink}
                onChange={(e) => setForm({ ...form, socialLink: e.target.value })}
                className={`${affiliateInput} !text-slate-400`}
              />
            </Field>
            <Field label="Estimated monthly traffic (optional)">
              <select
                value={form.trafficEstimate}
                onChange={(e) => setForm({ ...form, trafficEstimate: e.target.value })}
                className={`${affiliateInput} !text-slate-400`}
              >
                <option value="">Select range</option>
                <option value="lt_1k">&lt;1K</option>
                <option value="1k_10k">1K–10K</option>
                <option value="10k_50k">10K–50K</option>
                <option value="50k_plus">50K+</option>
              </select>
            </Field>
          </div>

          <Field label="How do you plan to promote PixieDVC? *" className="mt-5">
            <textarea
              value={form.promotionPlan}
              onChange={(e) => setForm({ ...form, promotionPlan: e.target.value })}
              required
              rows={4}
              className={`${affiliateInput} !text-slate-400`}
            />
          </Field>

          <label className={`mt-5 flex items-start gap-3 text-sm ${affiliateTextMuted}`}>
            <input
              type="checkbox"
              checked={form.agreed}
              onChange={(e) => setForm({ ...form, agreed: e.target.checked })}
              required
              className="mt-1 h-4 w-4 rounded border-white/10 bg-[#111827]"
            />
            <span>
              I have read and agree to the PixieDVC Affiliate Agreement.{" "}
              <Link href="/affiliate/agreement" target="_blank" className={`font-semibold ${affiliateLink}`}>
                Read agreement
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={!canSubmit || status === "loading"}
            className={`mt-6 rounded-xl px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${affiliatePrimaryButton}`}
          >
            {status === "loading" ? "Submitting..." : "Submit Application"}
          </button>

          <p className={`mt-3 text-sm ${affiliateTextMuted}`}>Applications are reviewed within 48 hours.</p>
          {message ? (
            <p className={`mt-2 text-sm ${status === "error" ? "text-red-400" : "text-emerald-400"}`}>{message}</p>
          ) : null}
          {referralLink ? (
            <p className={`mt-2 text-sm ${affiliateTextMuted}`}>
              Your referral link is ready: <span className="font-semibold text-slate-500">{referralLink}</span>
            </p>
          ) : null}
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-500 md:text-4xl" style={{ color: "#64748b" }}>
          What Happens Next
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { step: "1", title: "Apply", copy: "Submit your affiliate profile and channel details." },
            { step: "2", title: "Get Approved", copy: "Our team reviews fit and verifies promotional alignment." },
            { step: "3", title: "Access Your Affiliate Dashboard", copy: "Track performance and manage payouts in one place." },
          ].map((item) => (
            <article key={item.step} className={`${affiliateCard} p-6`}>
              <p className={`text-xs uppercase tracking-[0.28em] ${affiliateTextMuted}`}>Step {item.step}</p>
              <h3 className="mt-3 text-xl font-semibold text-slate-500" style={{ color: "#64748b" }}>
                {item.title}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${affiliateTextMuted}`}>{item.copy}</p>
            </article>
          ))}
        </div>
        <p className={`mt-6 text-sm ${affiliateTextMuted}`}>Payment details and tax information are collected after approval.</p>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-500 md:text-4xl" style={{ color: "#64748b" }}>
          FAQ
        </h2>
        <div className="mt-10 grid gap-4">
          {faqs.map((item) => (
            <article key={item.q} className={`${affiliateCard} p-6`}>
              <h3 className="text-base font-semibold text-slate-500" style={{ color: "#64748b" }}>
                {item.q}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed ${affiliateTextMuted}`}>{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 pt-6" />
    </main>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-2 text-sm font-medium text-slate-400 ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}
