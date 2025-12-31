"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button, Card } from "@pixiedvc/design-system";
import { appendRefToUrl } from "@/lib/referral";

type CopyBlock = {
  title: string;
  body: string;
};

const COPY_BLOCKS: CopyBlock[] = [
  {
    title: "1–2 sentence pitch",
    body: "PixieDVC helps families rent Disney Vacation Club stays with concierge support and clear pricing. We match guests with verified owners, then handle the details until the reservation is confirmed.",
  },
  {
    title: "Short paragraph",
    body: "PixieDVC is a concierge-style DVC rental platform. Guests share dates and room preferences, then we match them with verified owners and confirm availability. We focus on clarity, premium resorts, and a calmer planning experience from estimate to confirmation.",
  },
  {
    title: "Long-form (email/blog)",
    body: "PixieDVC makes Disney Vacation Club rentals feel simple and premium. Guests share their dates, resort preferences, and party size, then our concierge team matches them with verified DVC owners. We provide clear pricing estimates up front and confirm availability once an owner match is secured. It is a relaxed, guided alternative to searching point charts on your own, and it is ideal for families, couples, and international travelers who want help navigating DVC.",
  },
];

const TALKING_POINTS = [
  "Verified DVC owners and a concierge-led matching process.",
  "Estimates first, availability confirmed after matching.",
  "We guide guests through the request and confirmation steps.",
  "Great fit for international guests who want help navigating DVC.",
];

const CTA_SUGGESTIONS = [
  "Get a PixieDVC estimate",
  "Plan your DVC stay",
  "See DVC pricing in minutes",
  "Start a concierge quote",
  "Explore DVC resort options",
];

const FAQS = [
  {
    q: "How do I share my link?",
    a: "Use the links below. They automatically include your ref parameter so tracking stays intact.",
  },
  {
    q: "Do I need a coupon code?",
    a: "No. Tracking is based on your ref parameter, not a discount code.",
  },
  {
    q: "How long does tracking last?",
    a: "Referrals are stored for 90 days unless the guest clears cookies.",
  },
  {
    q: "Is pricing guaranteed?",
    a: "No. We provide estimates first, then confirm pricing once availability is secured.",
  },
  {
    q: "Is availability guaranteed?",
    a: "No. Availability is confirmed only after a verified owner match.",
  },
  {
    q: "Is PixieDVC affiliated with Disney?",
    a: "No. PixieDVC is an independent platform and is not affiliated with Disney.",
  },
  {
    q: "What about refunds or cancellations?",
    a: "Policies are explained during the request flow. Always direct guests to the official policy page.",
  },
  {
    q: "When do I get paid?",
    a: "Commissions are paid monthly after a stay is completed.",
  },
];

function buildFullUrl(path: string, ref: string | null, origin: string) {
  const withTracking = appendRefToUrl(path, ref);
  if (!origin) return withTracking;
  return new URL(withTracking, origin).toString();
}

async function copyText(value: string, onDone: () => void, onError: (message: string) => void) {
  try {
    await navigator.clipboard.writeText(value);
    onDone();
  } catch {
    onError("Unable to copy. You can highlight and copy manually.");
  }
}

export default function AffiliateGuidesClient() {
  const searchParams = useSearchParams();
  const defaultAffiliate = searchParams.get("affiliate") ?? "";
  const [affiliateSlug, setAffiliateSlug] = useState(defaultAffiliate);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const refValue = affiliateSlug.trim() || null;

  const links = useMemo(() => {
    return {
      home: buildFullUrl("/", refValue, origin),
      calculator: buildFullUrl("/calculator", refValue, origin),
      plan: buildFullUrl("/plan", refValue, origin),
    };
  }, [origin, refValue]);

  const decisionLinks = [
    {
      label: "Price / quick estimate",
      description: "Fast pricing estimate for guests who already know dates.",
      href: links.calculator,
    },
    {
      label: "Help me plan / first timer",
      description: "Guided flow for guests who need resort recommendations.",
      href: links.plan,
    },
    {
      label: "Is this legit?",
      description: "Trust-focused guide for first-time DVC renters.",
      href: buildFullUrl("/guides/trust", refValue, origin),
    },
  ];

  const handleCopy = (value: string) => {
    setCopyStatus(null);
    copyText(value, () => setCopyStatus("Copied to clipboard."), setCopyStatus);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-6 py-16 text-ink">
      <header className="space-y-3">
        <Link href="/affiliate/dashboard" className="text-xs uppercase tracking-[0.3em] text-muted">
          ← Back to dashboard
        </Link>
        <h1 className="font-display text-4xl text-ink">Affiliate Guides</h1>
        <p className="text-sm text-muted">
          Clear messaging, ready-to-share assets, and tracking links for PixieDVC partners.
        </p>
      </header>

      <Card className="space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Your affiliate link</p>
        <div className="grid gap-4 md:grid-cols-[1.2fr_2fr]">
          <label className="space-y-2 text-sm font-semibold text-ink/80">
            Affiliate slug
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-ink shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="your-slug"
              value={affiliateSlug}
              onChange={(event) => setAffiliateSlug(event.target.value)}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Home", value: links.home },
              { label: "Calculator", value: links.calculator },
              { label: "Plan flow", value: links.plan },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-muted">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">{item.label}</p>
                <p className="mt-2 break-all text-xs font-semibold text-ink">{item.value}</p>
                <button
                  type="button"
                  onClick={() => handleCopy(item.value)}
                  className="mt-2 text-xs font-semibold text-brand hover:underline"
                >
                  Copy link
                </button>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted">
          Referral links use <strong>?ref=</strong> and track for 90 days on first touch.
        </p>
        {copyStatus ? <p className="text-xs text-emerald-700">{copyStatus}</p> : null}
      </Card>

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">What PixieDVC is</p>
          <p className="text-sm text-muted">
            PixieDVC is a concierge-style DVC rental platform that matches guests with verified owners and confirms
            availability before booking.
          </p>
        </Card>
        <Card className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">What affiliates should say</p>
          <p className="text-sm text-muted">
            We provide pricing estimates first, then confirm availability once an owner match is secured.
          </p>
        </Card>
        <Card className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">How referral links work</p>
          <p className="text-sm text-muted">
            Referrals are first-touch, last 90 days, and never overwrite an existing ref once set.
          </p>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-ink">What to say</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {COPY_BLOCKS.map((block) => (
            <Card key={block.title} className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">{block.title}</p>
              <p className="text-sm text-ink/80">{block.body}</p>
              <button
                type="button"
                onClick={() => handleCopy(block.body)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Copy
              </button>
            </Card>
          ))}
        </div>
        <Card className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Talking points</p>
          <ul className="space-y-2 text-sm text-muted">
            {TALKING_POINTS.map((point) => (
              <li key={point}>• {point}</li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-ink">Where to send guests</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {decisionLinks.map((link) => (
            <Card key={link.label} className="space-y-3">
              <p className="text-sm font-semibold text-ink">{link.label}</p>
              <p className="text-sm text-muted">{link.description}</p>
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="truncate">{link.href}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(link.href)}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Copy link
                </button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-ink">Copy & Assets</h2>
        <Card className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Button text ideas</p>
              <ul className="space-y-1 text-sm text-muted">
                {CTA_SUGGESTIONS.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Website snippet</p>
              <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-ink">
{`<a href="${links.calculator}" target="_blank" rel="noopener">
  Get a PixieDVC estimate
</a>`}
              </pre>
              <button
                type="button"
                onClick={() =>
                  handleCopy(`<a href="${links.calculator}" target="_blank" rel="noopener">Get a PixieDVC estimate</a>`)
                }
                className="text-xs font-semibold text-brand hover:underline"
              >
                Copy snippet
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Email snippet</p>
              <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-ink">
{`Thinking about a Disney Vacation Club stay? PixieDVC provides concierge support and clear pricing.
Start here: ${links.plan}`}
              </pre>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    `Thinking about a Disney Vacation Club stay? PixieDVC provides concierge support and clear pricing.\nStart here: ${links.plan}`
                  )
                }
                className="text-xs font-semibold text-brand hover:underline"
              >
                Copy email
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Instagram caption</p>
              <pre className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-ink">
{`PixieDVC makes DVC rentals feel effortless. Concierge support + premium resorts.
Estimate your stay: ${links.calculator}`}
              </pre>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    `PixieDVC makes DVC rentals feel effortless. Concierge support + premium resorts.\nEstimate your stay: ${links.calculator}`
                  )
                }
                className="text-xs font-semibold text-brand hover:underline"
              >
                Copy caption
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Downloadable assets</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                "/affiliate-kit/pixiedvc-banner-1.svg",
                "/affiliate-kit/pixiedvc-banner-2.svg",
                "/affiliate-kit/pixiedvc-banner-3.svg",
              ].map((asset) => (
                <Link
                  key={asset}
                  href={asset}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-ink/80 hover:border-slate-300"
                >
                  {asset.split("/").pop()}
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">How you get paid</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>• Commission is based on PixieDVC’s service fee, not room price.</li>
            <li>• Paid after the guest’s stay is completed.</li>
            <li>• Payouts run monthly.</li>
            <li>• Exact rates are defined in your affiliate agreement.</li>
          </ul>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">What not to promise</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>• Do not promise availability.</li>
            <li>• Do not promise final pricing before confirmation.</li>
            <li>• Do not promise specific owners.</li>
            <li>• Do not claim live inventory.</li>
          </ul>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Affiliate FAQ</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {FAQS.map((item) => (
            <Card key={item.q} className="space-y-2">
              <p className="text-sm font-semibold text-ink">{item.q}</p>
              <p className="text-sm text-muted">{item.a}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
