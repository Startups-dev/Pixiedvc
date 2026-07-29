"use client";

import { FormEvent, ReactNode, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
} from "lucide-react";
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

const HERO_PIXIE_IMAGE = "/images/affiliate/pixie-affiliate-hero-transparent.png";
const DASHBOARD_PREVIEW_IMAGE =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Affiliate%20%20pages%20images/PixieDvc%20Affiliate%20Dashboard.png";
const APPLY_CTA_BACKGROUND_IMAGE =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/vero-beach/VBR1.png";
const inputClassName =
  "w-full rounded-2xl border border-[rgba(15,33,72,0.14)] bg-[#F7F3EA] px-4 py-3 text-sm text-[#10224A] outline-none transition placeholder:text-[#58657A]/60 focus:border-[#D6B45A] focus:ring-2 focus:ring-[#D6B45A]/25";
const editorialHeadingStyle = {
  fontFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
};

const heroBenefits = [
  {
    iconSrc: "/images/affiliate-assets/shield-transparent.png",
    title: "Premium Brand You Can Trust",
    copy: "A concierge experience your audience can recommend with confidence.",
  },
  {
    iconSrc: "/images/affiliate-assets/stacked-coins-transparent.png",
    title: "Competitive Commissions",
    copy: "Earn 10–15% of HannaDVC’s service revenue on qualifying completed bookings.",
  },
  {
    iconSrc: "/images/affiliate-assets/concierge-bell-transparent.png",
    title: "Real-Time Tracking",
    copy: "Track clicks, booking requests, conversions, and commissions.",
  },
  {
    iconSrc: "/images/affiliate-assets/payout-ribbon-transparent.png",
    title: "Monthly Payouts",
    copy: "Clear payout reporting and transparent commission history.",
  },
];

const creatorBenefits = [
  {
    title: "Help DVC Owners Earn More",
    copy: "Introduce owners to a guided way to rent eligible unused points.",
  },
  {
    title: "Protect Your Reputation",
    copy: "Refer your audience to a premium, concierge-supported experience.",
  },
  {
    title: "Earn Transparent Commissions",
    copy: "See how eligible commissions are calculated and tracked.",
  },
  {
    title: "Professional Dashboard",
    copy: "Monitor clicks, requests, conversions, commission history, and payouts.",
  },
];

const workflowSteps = [
  {
    iconSrc: "/images/affiliate-assets/workflow-tag-v3.png",
    title: "You Share",
    copy: "Share your unique referral link with your audience.",
  },
  {
    iconSrc: "/images/affiliate-assets/workflow-wand-v3.png",
    title: "They Discover",
    copy: "HannaDVC finds the perfect rental solution for them.",
  },
  {
    iconSrc: "/images/affiliate-assets/workflow-bell-star-v3.png",
    title: "We Handle Everything",
    copy: "Our concierge team handles booking, contracts, and communication.",
  },
  {
    iconSrc: "/images/affiliate-assets/workflow-shieldcheck-v3.png",
    title: "Booking Completed",
    copy: "The guest stays at Disney. You get credit for the successful booking.",
  },
  {
    iconSrc: "/images/affiliate-assets/workflow-dollar-badge-v3.png",
    title: "You Earn",
    copy: "Your commission is calculated and paid on time.",
  },
];

const dashboardBenefits = [
  "Real-time clicks and visitors",
  "Booking requests and conversions",
  "Commission tracking and history",
  "Marketing resources and partner guidance",
  "Monthly payout reporting",
  "Personalized referral links",
];

const whyPixie = [
  {
    title: "Disney Focused",
    copy: "Created for the DVC and Disney vacation community.",
  },
  {
    title: "Premium Experience",
    copy: "Concierge support for owners, guests, and partners.",
  },
  {
    title: "Secure & Trusted",
    copy: "Verified workflows, protected payments, and clear tracking.",
  },
  {
    title: "Partner Support",
    copy: "Resources, guidance, and support as your referrals grow.",
  },
];

const faqs = [
  {
    q: "How are commissions calculated?",
    a: "You earn a percentage of HannaDVC’s service revenue — that’s the difference between what the guest pays and what the DVC owner receives. Your commission rate depends on your partner tier and the booking’s eligibility.",
  },
  {
    q: "What are the partner tiers?",
    a: "Partner earns 10%, Verified Partner earns 12.5%, and Ambassador earns 15% of eligible HannaDVC service revenue. As your completed referrals grow and you consistently represent the HannaDVC brand well, you’ll unlock higher commission tiers automatically. Qualification rules are outlined in the Partner Agreement and program policies.",
  },
  {
    q: "When and how are payouts made?",
    a: "We run scheduled payout cycles throughout the month. Eligible commissions are reviewed and paid out using your selected payment method. You’ll see exact payout dates and methods right inside your dashboard.",
  },
  {
    q: "How long does referral attribution last?",
    a: "Attribution is designed to give your referrals a fair chance to book. Exact attribution windows and rules are defined in the HannaDVC Partner Agreement.",
  },
  {
    q: "What are the requirements to join?",
    a: "We partner with Disney-focused creators, DVC educators, travel planners, community leaders, and content creators who share our values and can represent HannaDVC with integrity.",
  },
  {
    q: "How quickly can I begin?",
    a: "Once your application is submitted, you’ll get instant access to your partner dashboard. From there, you can grab your links, explore resources, and start sharing — we’ll take care of the rest.",
  },
];

const audienceProfiles = [
  { label: "Disney YouTubers" },
  { label: "Disney Bloggers" },
  { label: "Travel Advisors" },
  { label: "Community Leaders" },
  { label: "Instagram Creators" },
  { label: "Podcast Hosts" },
];

function getAffiliateConfirmationRedirectUrl() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const fallbackAppUrl =
    process.env.NODE_ENV !== "production" && typeof window !== "undefined"
      ? window.location.origin
      : "";
  const appUrl = configuredAppUrl || fallbackAppUrl;

  if (!appUrl) return null;

  try {
    const parsed = new URL(appUrl);
    return `${parsed.origin}/auth/callback?next=/affiliate/login`;
  } catch {
    return null;
  }
}

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

    const emailRedirectTo = getAffiliateConfirmationRedirectUrl();

    if (!emailRedirectTo) {
      setAccountStatus("error");
      setAccountMessage("Unable to create partner account");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: accountForm.password,
      options: {
        emailRedirectTo,
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
    <main className="overflow-x-hidden bg-[#F7F3EA] text-[#10224A]">
      <section className="relative overflow-hidden bg-[#08152F] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(214,180,90,0.22),transparent_28%),radial-gradient(circle_at_74%_34%,rgba(23,58,114,0.72),transparent_34%)]" />
        <div className="absolute inset-y-0 -left-16 w-[72%] translate-y-3 opacity-25 sm:-left-20 sm:translate-y-4 lg:left-6 lg:w-[66%] lg:translate-y-6">
          <img
            src={HERO_PIXIE_IMAGE}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-110 object-contain object-left-bottom lg:scale-125"
          />
        </div>
        <div className="relative mx-auto grid max-w-[1200px] gap-8 px-6 py-12 lg:translate-x-12 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:py-16 xl:translate-x-16">
          <div className="order-1 min-w-0 lg:pl-16 xl:pl-24">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D6B45A]">
              HannaDVC Partner Program
            </p>
            <h1
              className="mt-5 max-w-[12ch] text-balance text-[2.35rem] font-semibold leading-[0.96] tracking-[-0.04em] text-white [text-shadow:0_2px_18px_rgba(8,21,47,0.55)] sm:max-w-2xl sm:text-5xl lg:text-6xl"
              style={{ ...editorialHeadingStyle, color: "#FFFFFF" }}
            >
              Turn Your Disney Audience Into a Premium Revenue Stream
            </h1>
            <p className="mt-6 max-w-[34ch] text-base leading-7 text-[#CBD5E1] sm:max-w-xl sm:text-lg">
              Partner with HannaDVC and earn up to 15% of our service revenue every time an eligible referral completes a qualifying booking.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={scrollToApply}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D6B45A] px-7 py-3 text-sm font-semibold text-[#08152F] shadow-[0_16px_36px_rgba(214,180,90,0.24)] transition hover:-translate-y-0.5 hover:bg-[#E4C66E] focus:outline-none focus:ring-2 focus:ring-[#D6B45A] focus:ring-offset-2 focus:ring-offset-[#08152F]"
              >
                Apply to Become a Partner
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <Link
                href="/affiliate/login"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-[#F8FAFC] transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#D6B45A] focus:ring-offset-2 focus:ring-offset-[#08152F]"
              >
                Partner Login
              </Link>
            </div>
            <p className="mt-3 text-xs font-medium text-[#CBD5E1]">Takes less than 2 minutes</p>
          </div>

          <div className="order-2 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {heroBenefits.map((benefit) => {
              return (
                <article key={benefit.title} className="flex min-w-0 items-center gap-4 rounded-[12px] border border-white/12 bg-[#0F2148]/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center">
                    <img src={benefit.iconSrc} alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-[#F8FAFC]" style={{ color: "#F8FAFC" }}>
                      {benefit.title}
                    </h2>
                    <p className="mt-1 break-words text-sm leading-6 text-[#CBD5E1]">{benefit.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F3EA] px-6 py-12 md:py-14">
        <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[0.36fr_0.64fr] lg:items-center">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D6B45A]">Earnings Example</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#10224A] sm:text-4xl" style={editorialHeadingStyle}>
              How Much Can You Earn?
            </h2>
            <p className="mt-4 text-base leading-7 text-[#58657A]">
              You earn a percentage of HannaDVC’s service revenue—the difference between what the guest pays and what the DVC owner receives.
            </p>
          </div>

          <div className="min-w-0 rounded-[12px] border border-[rgba(15,33,72,0.12)] bg-white p-5 shadow-[0_18px_44px_rgba(15,33,72,0.08)] lg:p-6">
            <div className="grid min-w-0 gap-4">
              <div className="grid min-w-0 gap-3 md:grid-cols-[1fr_auto_1fr_auto_1.08fr] md:items-center">
                <FinancialCard label="Guest Pays" value="$3,600" />
                <Connector label="minus" compact />
                <FinancialCard label="Owner Receives" value="$2,725" />
                <Connector label="equals" compact />
                <FinancialCard label="HannaDVC Service Revenue" value="$875" featured />
              </div>

              <div className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#D6B45A]">
                <span className="h-px w-16 bg-[#D6B45A]/60" aria-hidden="true" />
                <span>commission</span>
                <span className="h-px w-16 bg-[#D6B45A]/60" aria-hidden="true" />
              </div>

              <div className="min-w-0 rounded-[12px] border border-[#D6B45A]/45 bg-[#F7F3EA] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D6B45A]">Your Commission</p>
                <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">
                  <CommissionCard tier="Partner" percent="10%" amount="$87.50" />
                  <CommissionCard tier="Verified Partner" percent="12.5%" amount="$109.38" featured />
                  <CommissionCard tier="Ambassador" percent="15%" amount="$131.25" />
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-[#58657A]">
              Illustrative example only. Actual commissions vary based on reservation size, resort, pricing, owner payout, eligibility, and partner tier.
            </p>
            <p className="mt-1 text-xs font-medium text-[#10224A]">
              Higher commission tiers are earned through consistent completed referrals and strong partner performance.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-12 md:py-14">
        <div className="mx-auto max-w-[1200px]">
          <div className="rounded-[12px] border border-[#D6B45A]/20 bg-[#071933] px-5 py-10 text-center shadow-[0_24px_60px_rgba(7,25,51,0.18)] sm:px-8 lg:px-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#D6B45A]">How It Works</p>
            <h2 className="mx-auto mt-2 max-w-4xl text-[28px] font-semibold tracking-[-0.03em] text-[#F8FAFC] sm:text-[34px]" style={{ ...editorialHeadingStyle, color: "#F8FAFC" }}>
              From referral to commission in 5 simple steps.
            </h2>

            <div className="mt-10 grid gap-8 md:grid-cols-5 md:gap-4">
              {workflowSteps.map((step, index) => (
                <article key={step.title} className="relative flex flex-col items-center text-center">
                  {index < workflowSteps.length - 1 ? (
                    <span className="absolute left-[calc(50%+34px)] top-[34px] hidden w-[calc(100%-68px)] border-t border-dashed border-[#D6B45A]/70 md:block" aria-hidden="true" />
                  ) : null}
                  <span className="relative z-10 flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[#D6B45A]/55 bg-[#0A1F3F]">
                    <img src={step.iconSrc} alt="" aria-hidden="true" className="h-10 w-10 object-contain" />
                  </span>
                  <span className="mt-3 text-sm font-semibold leading-none text-[#D6B45A]">{index + 1}</span>
                  <h3 className="mt-3 text-base font-semibold text-[#D6B45A]" style={{ color: "#D6B45A" }}>{step.title}</h3>
                  <p className="mt-2 max-w-[170px] text-xs leading-5 text-[#CBD5E1]">{step.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#08152F] px-6 py-12 text-white md:py-14">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D6B45A]">Creator Advantages</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#F8FAFC] sm:text-4xl" style={{ ...editorialHeadingStyle, color: "#F8FAFC" }}>
              Why creators partner with HannaDVC
            </h2>
          </div>
          <div className="mt-11 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4 xl:gap-x-3">
            {creatorBenefits.map((benefit, index) => (
              <article key={benefit.title} className="flex h-full flex-col rounded-[12px] border border-[rgba(231,200,106,0.12)] bg-[#0F2148]/70 px-[30px] py-8 shadow-[0_16px_34px_rgba(0,0,0,0.1)] transition duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0 hover:-translate-y-0.5 hover:border-[rgba(231,200,106,0.22)] hover:bg-[#173A72]/45">
                <p className="text-[41px] font-medium leading-none tracking-[-0.025em] text-[#E7C86A]/85" style={editorialHeadingStyle}>
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-8 min-h-[52px] text-[19px] font-semibold leading-[1.35] text-[#F8FAFC]" style={{ color: "#F8FAFC" }}>
                  {benefit.title}
                </h3>
                <p className="mt-5 text-sm leading-[1.68] text-[#CBD5E1]">{benefit.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F3EA] px-6 py-12 md:py-14">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D6B45A]">Dashboard Showcase</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#10224A] sm:text-4xl" style={editorialHeadingStyle}>
              Your Affiliate Dashboard
            </h2>
            <p className="mt-4 text-base leading-7 text-[#58657A]">
              Everything you need to understand your referrals and grow your partner activity.
            </p>
            <ul className="mt-7 grid gap-3 text-sm text-[#10224A] sm:grid-cols-2 lg:grid-cols-1">
              {dashboardBenefits.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D6B45A]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={scrollToApply}
              className="mt-8 inline-flex items-center justify-center rounded-full border border-[#0F2148]/15 px-6 py-3 text-sm font-semibold text-[#10224A] transition hover:border-[#D6B45A] hover:text-[#0F2148] focus:outline-none focus:ring-2 focus:ring-[#D6B45A]"
            >
              Explore the Partner Experience
            </button>
          </div>
          <div className="rounded-[12px] border border-[rgba(15,33,72,0.12)] bg-[#08152F] p-3 shadow-[0_24px_70px_rgba(15,33,72,0.18)]">
            <div className="flex gap-2 border-b border-white/10 px-4 py-3" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-white/25" />
              <span className="h-3 w-3 rounded-full bg-white/20" />
              <span className="h-3 w-3 rounded-full bg-white/15" />
            </div>
            <div className="overflow-hidden rounded-[12px]">
              <img
                src={DASHBOARD_PREVIEW_IMAGE}
                alt="HannaDVC affiliate dashboard preview"
                className="h-auto w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F7F3EA] px-6 py-14 md:py-16">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="lg:pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D6B45A]">Why HannaDVC</p>
            <h2 className="mt-3 max-w-[11ch] text-4xl font-semibold leading-[0.98] tracking-[-0.04em] text-[#10224A] sm:text-5xl" style={editorialHeadingStyle}>
              Built for premium DVC referrals
            </h2>
            <p className="mt-6 max-w-sm text-base leading-7 text-[#58657A]">
              A partner experience built around trust, clear tracking, and premium Disney vacation referrals.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {whyPixie.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[12px] border border-[rgba(15,33,72,0.09)] bg-white px-6 py-6 shadow-[0_14px_36px_rgba(15,33,72,0.055)]"
                >
                  <p className="h-px w-10 bg-[#D6B45A]/70" aria-hidden="true" />
                  <h3 className="mt-5 text-base font-semibold leading-snug text-[#10224A]">{item.title}</h3>
                  <p className="mt-4 max-w-[18rem] text-sm leading-[1.78] text-[#58657A]">{item.copy}</p>
                </article>
              ))}
            </div>

            <article className="grid overflow-hidden rounded-[12px] border border-[#D6B45A]/35 bg-[#0F2148] text-white shadow-[0_24px_60px_rgba(15,33,72,0.18)] md:grid-cols-[0.85fr_1.15fr]">
              <div className="border-b border-white/10 px-7 py-7 md:border-b-0 md:border-r">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D6B45A]">Featured</p>
                <h3 className="mt-4 text-2xl font-semibold leading-tight text-[#F8FAFC]" style={{ color: "#F8FAFC" }}>
                  Founding Creator Program
                </h3>
              </div>
              <div className="px-7 py-7">
                <p className="max-w-xl text-sm leading-[1.82] text-[#CBD5E1]">
                  Founding partners may receive enhanced launch commission opportunities, recognition, and early access to partner resources.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#F7F3EA] px-6 py-12 md:py-14">
        <div className="mx-auto max-w-[980px]">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D6B45A]">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#10224A] sm:text-4xl" style={editorialHeadingStyle}>
              Partner Program questions
            </h2>
          </div>
          <div className="mt-8 space-y-3">
            {faqs.map((item) => (
              <details key={item.q} className="group rounded-[12px] border border-[rgba(15,33,72,0.12)] bg-white p-6 shadow-[0_14px_34px_rgba(15,33,72,0.06)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-[#10224A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6B45A]">
                  {item.q}
                  <span className="text-[#D6B45A] transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-4 text-sm leading-7 text-[#58657A]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        className="bg-[#08152F] bg-cover bg-center px-6 py-9 text-white"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(8, 21, 47, 0.94) 0%, rgba(8, 21, 47, 0.62) 48%, rgba(8, 21, 47, 0.82) 100%), url(${APPLY_CTA_BACKGROUND_IMAGE})`,
          backgroundPosition: "center 42%",
        }}
      >
        <div
          className="mx-auto max-w-[1200px] py-3 lg:flex lg:items-center lg:justify-between lg:gap-10"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D6B45A]">Apply Today</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-[#F8FAFC] sm:text-4xl" style={{ ...editorialHeadingStyle, color: "#F8FAFC" }}>
              Ready to Join the HannaDVC Partner Program?
            </h2>
            <ul className="mt-6 grid gap-3 text-sm text-[#CBD5E1] sm:grid-cols-3">
              {["Quick & Easy Application", "Transparent Partner Tracking", "Start Building Eligible Commissions"].map((item) => (
                <li key={item}>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 shrink-0 lg:mt-0">
            <button
              type="button"
              onClick={scrollToApply}
              className="group inline-flex w-full items-center justify-center rounded-md px-8 py-3 text-sm font-semibold text-[#08152F] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_24px_rgba(8,21,47,0.22)] transition-[box-shadow,background-position] duration-300 hover:bg-[center_70%] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.52),0_12px_28px_rgba(8,21,47,0.28)] focus:outline-none focus:ring-2 focus:ring-[#D6B45A] focus:ring-offset-2 focus:ring-offset-[#08152F] sm:w-auto"
              style={{
                backgroundImage: "linear-gradient(180deg, #F2D57A 0%, #D6B45A 54%, #B8872F 100%)",
                backgroundSize: "100% 135%",
                backgroundPosition: "center 0%",
                fontKerning: "none",
                fontVariantLigatures: "none",
                letterSpacing: "0",
              }}
            >
              <span className="block leading-none">Apply to Become a Partner</span>
            </button>
            <p className="mt-3 text-center text-xs text-[#CBD5E1]">Secure • Free to join • No monthly fees</p>
          </div>
        </div>
      </section>

      <section className="bg-[#08152F] px-6 py-12 text-white md:py-14">
        <div className="mx-auto max-w-[1200px] text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D6B45A]">Partner Fit</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#F8FAFC] sm:text-4xl" style={{ ...editorialHeadingStyle, color: "#F8FAFC" }}>
            Who Is This Program For?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#CBD5E1]">
            Built for creators and professionals who inspire Disney vacationers every day.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {audienceProfiles.map((profile) => (
              <article
                key={profile.label}
                className="border border-white/12 bg-[#0F2148]/70 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
                style={{ borderRadius: 12 }}
              >
                <h3 className="text-sm font-semibold leading-5 text-[#F8FAFC]" style={{ color: "#F8FAFC" }}>
                  {profile.label}
                </h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section ref={applyRef} id="affiliate-application" className="bg-[#F7F3EA] px-6 py-12 md:py-14">
        <div className="mx-auto max-w-[980px]">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D6B45A]">Application</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#10224A] sm:text-4xl" style={editorialHeadingStyle}>
              Apply to the HannaDVC Partner Program
            </h2>
          </div>

          {applicationStep === "received" ? (
            <div className="mt-10 rounded-[12px] border border-[rgba(15,33,72,0.12)] bg-white p-8 shadow-[0_22px_55px_rgba(15,33,72,0.08)]">
              <div className="max-w-2xl space-y-4">
                <h3 className="text-2xl font-semibold text-[#10224A]">Application received!</h3>
                <p className="text-sm leading-relaxed text-[#58657A]">
                  Your HannaDVC Partner application has been received. Next, let’s create your secure partner account so you can access your dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => setApplicationStep("account")}
                  className="rounded-full bg-[#D6B45A] px-6 py-3 text-sm font-semibold text-[#08152F] transition hover:bg-[#E4C66E] focus:outline-none focus:ring-2 focus:ring-[#D6B45A]"
                >
                  Create Partner Account
                </button>
              </div>
            </div>
          ) : applicationStep === "account" ? (
            <form onSubmit={handleCreateAccount} className="mt-10 rounded-[12px] border border-[rgba(15,33,72,0.12)] bg-white p-8 shadow-[0_22px_55px_rgba(15,33,72,0.08)]">
              <div className="max-w-2xl space-y-5">
                <h3 className="text-2xl font-semibold text-[#10224A]">Create Your Partner Account</h3>
                <p className="text-sm text-[#58657A]">
                  Use the same email from your application so we can connect your account automatically.
                </p>
                <Field label="Email">
                  <input
                    type="email"
                    value={accountForm.email || submittedEmail}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    required
                    autoComplete="email"
                    className={inputClassName}
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    required
                    autoComplete="new-password"
                    className={inputClassName}
                  />
                </Field>
                <Field label="Confirm Password">
                  <input
                    type="password"
                    value={accountForm.confirmPassword}
                    onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                    required
                    autoComplete="new-password"
                    className={inputClassName}
                  />
                </Field>
                <button
                  type="submit"
                  disabled={accountStatus === "loading"}
                  className="rounded-full bg-[#D6B45A] px-6 py-3 text-sm font-semibold text-[#08152F] transition hover:bg-[#E4C66E] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#D6B45A]"
                >
                  {accountStatus === "loading" ? "Creating..." : "Create My Partner Account"}
                </button>
                <p className="text-xs text-[#58657A]">
                  Your information is secure and will only be used for your HannaDVC Partner account.
                </p>
                {accountStatus === "error" && accountMessage === "Unable to create partner account" ? (
                  <div className="space-y-4 rounded-[12px] border border-rose-300 bg-rose-50 p-5 text-sm text-[#10224A]">
                    <div>
                      <h4 className="text-base font-semibold text-[#10224A]">Unable to create partner account</h4>
                      <p className="mt-2 text-[#58657A]">We couldn’t create your partner account. This can happen if:</p>
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-[#58657A]">
                      <li>The email address doesn’t match your application</li>
                      <li>An account with this email already exists</li>
                      <li>There was a temporary issue. Please try again</li>
                    </ul>
                    <p className="text-[#58657A]">If the problem continues, please contact support.</p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountStatus("idle");
                          setAccountMessage(null);
                        }}
                        className="rounded-full bg-[#D6B45A] px-5 py-2 text-xs font-semibold text-[#08152F] transition hover:bg-[#E4C66E]"
                      >
                        Try Again
                      </button>
                      <Link
                        href="/contact"
                        className="inline-flex rounded-full border border-[rgba(15,33,72,0.12)] px-5 py-2 text-xs font-semibold text-[#10224A] transition hover:border-[#D6B45A]"
                      >
                        Contact Support
                      </Link>
                    </div>
                  </div>
                ) : accountStatus === "success" && accountMessage ? (
                  <div className="space-y-5 rounded-[12px] border border-[#D6B45A]/40 bg-[#08152F] p-5 text-sm shadow-sm sm:p-6">
                    <div className="flex items-start gap-4">
                      <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D6B45A]/70 text-[#D6B45A]">
                        <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <div className="space-y-3">
                        <h4 className="text-xl font-semibold text-[#F8FAFC]">Account Created</h4>
                        <div className="space-y-2 text-[#CBD5E1]">
                          <p>We've sent a confirmation email to your inbox.</p>
                          <p>Please verify your email to activate your Partner Account.</p>
                        </div>
                      </div>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div className="space-y-3 text-[#CBD5E1]">
                      <p>Once confirmed, you'll be able to:</p>
                      <ul className="list-disc space-y-2 pl-5">
                        <li>Access your Partner Dashboard</li>
                        <li>Explore marketing resources</li>
                        <li>Learn how the referral program works</li>
                        <li>Prepare your referral links</li>
                      </ul>
                    </div>
                    <Link
                      href="/affiliate/login"
                      className="inline-flex rounded-full bg-[#D6B45A] px-5 py-2.5 text-xs font-semibold text-[#08152F] transition hover:bg-[#E4C66E]"
                    >
                      Go to Partner Login
                    </Link>
                    <p className="text-xs text-[#CBD5E1]">You can return here after verifying your email.</p>
                  </div>
                ) : accountMessage ? (
                  <p className={`text-sm ${accountStatus === "error" ? "text-rose-700" : "text-[#10224A]"}`}>
                    {accountMessage}
                  </p>
                ) : null}
              </div>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-10 rounded-[12px] border border-[rgba(15,33,72,0.12)] bg-white p-8 shadow-[0_22px_55px_rgba(15,33,72,0.08)]"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Full Name *">
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                    className={inputClassName}
                  />
                </Field>
                <Field label="Email *">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className={inputClassName}
                  />
                </Field>
                <Field label="Website or Channel URL *">
                  <input
                    value={form.websiteOrChannelUrl}
                    onChange={(e) => setForm({ ...form, websiteOrChannelUrl: e.target.value })}
                    required
                    className={inputClassName}
                  />
                </Field>
                <Field label="Instagram / YouTube link (optional)">
                  <input
                    value={form.socialLink}
                    onChange={(e) => setForm({ ...form, socialLink: e.target.value })}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Estimated monthly traffic (optional)">
                  <select
                    value={form.trafficEstimate}
                    onChange={(e) => setForm({ ...form, trafficEstimate: e.target.value })}
                    className={inputClassName}
                  >
                    <option value="">Select range</option>
                    <option value="lt_1k">&lt;1K</option>
                    <option value="1k_10k">1K–10K</option>
                    <option value="10k_50k">10K–50K</option>
                    <option value="50k_plus">50K+</option>
                  </select>
                </Field>
              </div>

              <Field label="How do you plan to promote HannaDVC? *" className="mt-5">
                <textarea
                  value={form.promotionPlan}
                  onChange={(e) => setForm({ ...form, promotionPlan: e.target.value })}
                  required
                  rows={4}
                  className={inputClassName}
                />
              </Field>

              <label className="mt-5 flex items-start gap-3 text-sm text-[#58657A]">
                <input
                  type="checkbox"
                  checked={form.agreed}
                  onChange={(e) => setForm({ ...form, agreed: e.target.checked })}
                  required
                  className="mt-1 h-4 w-4 rounded border-[rgba(15,33,72,0.18)] text-[#D6B45A] focus:ring-[#D6B45A]"
                />
                <span>
                  I have read and agree to the HannaDVC Affiliate Agreement.{" "}
                  <Link href="/affiliate/agreement" target="_blank" className="font-semibold text-[#10224A] underline decoration-[#D6B45A] underline-offset-4">
                    Read agreement
                  </Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={!canSubmit || status === "loading"}
                className="mt-6 rounded-full bg-[#D6B45A] px-6 py-3 text-sm font-semibold text-[#08152F] transition hover:bg-[#E4C66E] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#D6B45A]"
              >
                {status === "loading" ? "Submitting..." : "Submit Application"}
              </button>

              {message ? (
                <p className={`mt-3 text-sm ${status === "error" ? "text-rose-700" : "text-[#10224A]"}`}>{message}</p>
              ) : null}
              {referralLink ? (
                <p className="mt-2 text-sm text-[#58657A]">
                  Your referral link is ready: <span className="font-semibold text-[#10224A]">{referralLink}</span>
                </p>
              ) : null}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-2 text-sm font-semibold text-[#10224A] ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function FinancialCard({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <article
      className={`min-w-0 max-w-full rounded-[12px] border p-5 text-center ${
        featured
          ? "border-[#D6B45A]/45 bg-[#0F2148] text-white"
          : "border-[rgba(15,33,72,0.12)] bg-[#F7F3EA] text-[#10224A]"
      }`}
    >
      <p className={`break-words text-xs font-semibold uppercase tracking-[0.18em] sm:tracking-[0.22em] ${featured ? "text-[#D6B45A]" : "text-[#58657A]"}`}>
        {label}
      </p>
      <p className={`mt-3 text-3xl font-semibold ${featured ? "text-[#F8FAFC]" : "text-[#10224A]"}`}>{value}</p>
    </article>
  );
}

function Connector({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#D6B45A] ${compact ? "" : "lg:flex-col"}`}>
      <span className={`h-px bg-[#D6B45A]/60 ${compact ? "w-6" : "w-10 lg:h-8 lg:w-px"}`} aria-hidden="true" />
      <span className="whitespace-nowrap">{label}</span>
      <span className={`h-px bg-[#D6B45A]/60 ${compact ? "w-6" : "w-10 lg:h-8 lg:w-px"}`} aria-hidden="true" />
    </div>
  );
}

function CommissionCard({
  tier,
  percent,
  amount,
  featured = false,
}: {
  tier: string;
  percent?: string;
  amount: string;
  featured?: boolean;
}) {
  return (
    <article
      className={`min-w-0 max-w-full rounded-[12px] border p-5 text-center ${
        featured
          ? "border-[#D6B45A]/50 bg-[#F7F3EA] shadow-[0_14px_34px_rgba(214,180,90,0.16)]"
          : "border-[rgba(15,33,72,0.12)] bg-white"
      }`}
    >
      {percent ? <p className="text-lg font-semibold text-[#D6B45A]">{percent}</p> : null}
      <p className="mt-1 break-words text-sm font-semibold text-[#10224A]">{tier}</p>
      <p className="mt-2 text-xl font-semibold text-[#10224A]">{amount}</p>
    </article>
  );
}
