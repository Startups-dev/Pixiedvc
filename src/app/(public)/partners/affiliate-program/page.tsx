"use client";

import { FormEvent, ReactNode, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, ShieldCheck, Sparkles, Users } from "lucide-react";
import {
  affiliateCard,
  affiliateCard2,
  affiliateInput,
  affiliateLink,
  affiliatePrimaryButton,
  affiliateTextMuted,
} from "@/lib/affiliate-theme";
import { getClientAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase";

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
  { icon: Sparkles, title: "Helpful partner ecosystem", copy: "Introduce owners to PixieDVC in a trustworthy way." },
  { icon: BookOpen, title: "Partner resources", copy: "Learn how the program works before your tools unlock." },
  { icon: Users, title: "Audience-ready positioning", copy: "Prepare helpful PixieDVC messaging for your community." },
  { icon: ShieldCheck, title: "Luxury positioning", copy: "Premium partner ecosystem without discount-brand feel." },
];

const faqs = [
  {
    q: "Can anyone apply?",
    a: "PixieDVC Partners is designed for Disney-focused creators, travel planners, DVC educators, and community builders who can introduce owners to PixieDVC in a helpful and trustworthy way.",
  },
  {
    q: "What happens after I apply?",
    a: "You’ll create your partner login and access your dashboard. Some tools unlock after your application is reviewed.",
  },
  {
    q: "Do I need to be a Disney Vacation Club owner?",
    a: "No. You do not need to own DVC points, but your audience should have a natural connection to Disney travel, DVC ownership, or vacation planning.",
  },
  {
    q: "What can I do inside the dashboard?",
    a: "You can learn how PixieDVC works, review partner resources, prepare your audience, and see what becomes available as your account moves forward.",
  },
];

export default function AffiliateProgramPage() {
  const applyRef = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [form, setForm] = useState<ApplyForm>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [applicationStep, setApplicationStep] = useState<"form" | "received" | "account">("form");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [accountForm, setAccountForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [accountStatus, setAccountStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [accountMessage, setAccountMessage] = useState<string | null>(null);

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
      | { error?: string; message?: string; referralLink?: string }
      | null;

    if (!response.ok) {
      setStatus("error");
      setMessage(data?.error ?? "Unable to submit application.");
      return;
    }

    setStatus("success");
    setMessage(data?.message ?? null);
    setReferralLink(data?.referralLink ?? null);
    const normalizedEmail = form.email.trim().toLowerCase();
    setSubmittedEmail(normalizedEmail);
    setAccountForm({ email: normalizedEmail, password: "", confirmPassword: "" });
    setApplicationStep("received");
    setForm(initialForm);
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountStatus("loading");
    setAccountMessage(null);

    const email = accountForm.email.trim().toLowerCase();
    if (!email || !accountForm.password || accountForm.password !== accountForm.confirmPassword) {
      setAccountStatus("error");
      setAccountMessage("Passwords must match to continue.");
      return;
    }

    const verifyResponse = await fetch("/api/affiliate/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!verifyResponse.ok) {
      setAccountStatus("error");
      setAccountMessage("Unable to create partner account");
      return;
    }

    const emailRedirectTo = getClientAppUrl(
      `/auth/callback?next=${encodeURIComponent("/affiliate/login")}`,
    );

    const { data, error } = await supabase.auth.signUp({
      email,
      password: accountForm.password,
      options: {
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });

    if (error) {
      const signIn = await supabase.auth.signInWithPassword({
        email,
        password: accountForm.password,
      });

      if (!signIn.error) {
        await fetch("/api/affiliate/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }).catch(() => null);
        setAccountStatus("success");
        router.replace("/affiliate/dashboard");
        return;
      }

      setAccountStatus("error");
      setAccountMessage("Unable to create partner account");
      return;
    }

    async function signInAndRedirect() {
      const signIn = await supabase.auth.signInWithPassword({
        email,
        password: accountForm.password,
      });

      if (signIn.error) {
        return false;
      }

      await fetch("/api/affiliate/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => null);
      setAccountStatus("success");
      router.replace("/affiliate/dashboard");
      return true;
    }

    if (data.session) {
      await fetch("/api/affiliate/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => null);
      setAccountStatus("success");
      router.replace("/affiliate/dashboard");
      return;
    }

    const signedIn = await signInAndRedirect();
    if (signedIn) {
      return;
    }

    const maybeExistingUser = data.user?.identities?.length === 0;
    if (maybeExistingUser) {
      setAccountStatus("error");
      setAccountMessage("Unable to create partner account");
      return;
    }

    setAccountStatus("success");
    setAccountMessage("Check your email to confirm your account, then sign in at /affiliate/login.");
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
            Introduce DVC owners to PixieDVC in a helpful and trustworthy way. Simple tracking. Premium positioning.
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

        {applicationStep === "received" ? (
          <div className={`mt-10 rounded-3xl p-8 ${affiliateCard}`}>
            <div className="max-w-2xl space-y-4">
              <h3 className="text-2xl font-semibold text-slate-500" style={{ color: "#64748b" }}>
                Application received!
              </h3>
              <p className={`text-sm leading-relaxed ${affiliateTextMuted}`}>
                Your PixieDVC Partner application has been received. Next, let’s create your secure partner account so you can access your dashboard.
              </p>
              <button
                type="button"
                onClick={() => setApplicationStep("account")}
                className={`rounded-xl px-6 py-3 text-sm font-semibold transition ${affiliatePrimaryButton}`}
              >
                Create Partner Account
              </button>
            </div>
          </div>
        ) : applicationStep === "account" ? (
          <form onSubmit={handleCreateAccount} className={`mt-10 rounded-3xl p-8 ${affiliateCard}`}>
            <div className="max-w-2xl space-y-5">
              <h3 className="text-2xl font-semibold text-slate-500" style={{ color: "#64748b" }}>
                Create Your Partner Account
              </h3>
              <p className={`text-sm ${affiliateTextMuted}`}>
                Use the same email from your application so we can connect your account automatically.
              </p>
              <Field label="Email">
                <input
                  type="email"
                  value={accountForm.email || submittedEmail}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  required
                  autoComplete="email"
                  className={`${affiliateInput} !text-slate-400`}
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                  required
                  autoComplete="new-password"
                  className={`${affiliateInput} !text-slate-400`}
                />
              </Field>
              <Field label="Confirm Password">
                <input
                  type="password"
                  value={accountForm.confirmPassword}
                  onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                  className={`${affiliateInput} !text-slate-400`}
                />
              </Field>
              <button
                type="submit"
                disabled={accountStatus === "loading"}
                className={`rounded-xl px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${affiliatePrimaryButton}`}
              >
                {accountStatus === "loading" ? "Creating..." : "Create My Partner Account"}
              </button>
              <p className={`text-xs ${affiliateTextMuted}`}>
                Your information is secure and will only be used for your PixieDVC Partner account.
              </p>
              {accountStatus === "error" && accountMessage === "Unable to create partner account" ? (
                <div className="space-y-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-slate-200">
                  <div>
                    <h4 className="text-base font-semibold text-rose-200">Unable to create partner account</h4>
                    <p className="mt-2 text-slate-300">We couldn’t create your partner account. This can happen if:</p>
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-slate-300">
                    <li>The email address doesn’t match your application</li>
                    <li>An account with this email already exists</li>
                    <li>There was a temporary issue. Please try again</li>
                  </ul>
                  <p className="text-slate-300">If the problem continues, please contact support.</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountStatus("idle");
                        setAccountMessage(null);
                      }}
                      className={`rounded-xl px-5 py-2 text-xs font-semibold transition ${affiliatePrimaryButton}`}
                    >
                      Try Again
                    </button>
                    <Link
                      href="/contact"
                      className="inline-flex rounded-xl border border-white/10 px-5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5"
                    >
                      Contact Support
                    </Link>
                  </div>
                </div>
              ) : accountStatus === "success" && accountMessage ? (
                <div className="space-y-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm text-slate-200">
                  <p className="text-slate-200">{accountMessage}</p>
                  <Link
                    href="/affiliate/login"
                    className={`inline-flex rounded-xl px-5 py-2 text-xs font-semibold transition ${affiliatePrimaryButton}`}
                  >
                    Go to Affiliate Login
                  </Link>
                </div>
              ) : accountMessage ? (
                <p className={`text-sm ${accountStatus === "error" ? "text-red-400" : "text-emerald-400"}`}>
                  {accountMessage}
                </p>
              ) : null}
            </div>
          </form>
        ) : (
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

          {message ? (
            <p className={`mt-2 text-sm ${status === "error" ? "text-red-400" : "text-emerald-400"}`}>{message}</p>
          ) : null}
          {referralLink ? (
            <p className={`mt-2 text-sm ${affiliateTextMuted}`}>
              Your referral link is ready: <span className="font-semibold text-slate-500">{referralLink}</span>
            </p>
          ) : null}
          </form>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-500 md:text-4xl" style={{ color: "#64748b" }}>
          What Happens Next
        </h2>
        <p className={`mt-6 max-w-3xl text-sm leading-relaxed ${affiliateTextMuted}`}>
          You’ll register a login and have access to your affiliate dashboard. From there, you can explore resources, learn how the program works, and get everything ready while we review your application.
        </p>
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
