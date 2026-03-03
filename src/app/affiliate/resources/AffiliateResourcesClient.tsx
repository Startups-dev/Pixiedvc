"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card } from "@pixiedvc/design-system";
import {
  affiliateCard,
  affiliateCard2,
  affiliateInput,
  affiliatePrimaryButton,
  affiliateSecondaryButton,
  affiliateTextMuted,
} from "@/lib/affiliate-theme";

type AffiliateSummary = {
  displayName: string;
  slug: string;
  tier: string;
  commissionRate: number;
};

type ScriptTab = "short" | "instagram" | "tiktok" | "email" | "talking";
type ScriptItem = { id: string; title: string; body: string };

const TAB_LABELS: Record<ScriptTab, string> = {
  short: "1–2 Sentence",
  instagram: "Instagram",
  tiktok: "TikTok (15s)",
  email: "Email / Blog",
  talking: "Talking Points",
};

const SCRIPTS: Record<ScriptTab, ScriptItem[]> = {
  short: [
    {
      id: "short-a",
      title: "Variant A",
      body:
        "PixieDVC helps you stay in Deluxe Disney villas with full kitchens and extra space — often at better-than-Disney rack pricing — with concierge support from start to finish. {your link}",
    },
    {
      id: "short-b",
      title: "Variant B",
      body:
        "Want a Disney stay with a kitchen and more space than a standard hotel room? PixieDVC helps you book Deluxe villa stays with concierge-style support. {your link}",
    },
  ],
  instagram: [
    {
      id: "ig-a",
      title: "Caption A",
      body:
        "Planning Disney? If you want a villa with a full kitchen + extra space (without paying full rack rates), PixieDVC makes it simple. {your link}",
    },
    {
      id: "ig-b",
      title: "Caption B",
      body:
        "Deluxe Disney villa stays with kitchens, space, and a calmer booking process. PixieDVC helps you do it the smart way. {your link}",
    },
  ],
  tiktok: [
    {
      id: "tt-a",
      title: "15s Script A",
      body:
        "If you want to stay at Disney in a villa with a full kitchen and extra space — but not pay full rack rates — PixieDVC helps you book Deluxe villa stays with concierge support. Link in bio. {your link}",
    },
    {
      id: "tt-b",
      title: "15s Script B",
      body:
        "Hotels are fine… but Disney villas with kitchens hit different. PixieDVC helps you book Deluxe villa stays with concierge support and better-than-rack pricing (often). {your link}",
    },
  ],
  email: [
    {
      id: "email-a",
      title: "Email / Blog Copy",
      body:
        "PixieDVC is a concierge-style platform that helps families book Deluxe Disney villa stays with more space, full kitchens, and flexible layouts — often at better-than-Disney rack pricing. It’s a calmer, guided way to plan a premium Disney stay. {your link}",
    },
  ],
  talking: [
    {
      id: "talking-a",
      title: "Talking Points",
      body:
        "• Full kitchen = easy breakfasts + snacks\n• Separate bedroom = kids sleep, adults relax\n• More space for families / multi-gen trips\n• Deluxe resort category (premium experience)\n• Concierge-guided booking (less stress)",
    },
  ],
};

const TRACKING_RULES = [
  { title: "Referral Window", body: "Your link sets a referral for 90 days." },
  { title: "Attribution", body: "First referral wins and is not overwritten." },
  {
    title: "Commission",
    body: "You earn 6–8% of PixieDVC net rental revenue on confirmed and completed stays.",
  },
  { title: "Payouts", body: "Paid monthly after completed stays." },
];

function copyToClipboard(value: string) {
  return navigator.clipboard.writeText(value);
}

function normalizeBaseOrigin(baseUrl: string) {
  if (baseUrl) {
    return baseUrl.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

function appendCampaign(pathAndSearch: string, campaignTag: string) {
  const trimmed = campaignTag.trim();
  if (!trimmed) return pathAndSearch;
  const [path, rawSearch = ""] = pathAndSearch.split("?");
  const params = new URLSearchParams(rawSearch);
  params.set("utm_campaign", trimmed);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export default function AffiliateResourcesClient({
  affiliate,
  baseUrl,
}: {
  affiliate: AffiliateSummary;
  baseUrl: string;
}) {
  const [activeTab, setActiveTab] = useState<ScriptTab>("short");
  const [appendById, setAppendById] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [advancedInput, setAdvancedInput] = useState("");
  const [advancedCampaignTag, setAdvancedCampaignTag] = useState("");
  const [advancedOutput, setAdvancedOutput] = useState("");
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState("overview");

  const slug = affiliate.slug?.trim() ?? "";
  const origin = normalizeBaseOrigin(baseUrl);
  const canonicalReferralLink = slug && origin ? `${origin}/r/${slug}` : "";
  const missingReferralLink = !slug;

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "scripts", label: "Scripts" },
    { id: "share-links", label: "Share Links" },
    { id: "tracking", label: "Tracking" },
  ];

  const tabScripts = useMemo(() => SCRIPTS[activeTab], [activeTab]);

  const buildTrackedLink = (pathAndSearch: string) => {
    if (!slug || !origin) return "";
    const toWithCampaign = appendCampaign(pathAndSearch, advancedCampaignTag);
    if (toWithCampaign === "/") {
      return `${origin}/r/${slug}`;
    }
    return `${origin}/r/${slug}?to=${encodeURIComponent(toWithCampaign)}`;
  };

  const quickLinks = [
    {
      id: "quick-home",
      title: "Homepage",
      bestFor: "Best for: General promotions / link in bio",
      url: buildTrackedLink("/"),
    },
    {
      id: "quick-calculator",
      title: "Calculator",
      bestFor: "Best for: Pricing + savings content",
      url: buildTrackedLink("/calculator"),
    },
    {
      id: "quick-how-it-works",
      title: "How It Works",
      bestFor: "Best for: Explainer posts / onboarding your audience",
      url: buildTrackedLink("/how-it-works"),
    },
  ];

  const generateAdvancedLink = () => {
    if (!slug || !origin) {
      setAdvancedError("Your referral link isn’t configured yet. Please contact support.");
      setAdvancedOutput("");
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(advancedInput.trim());
    } catch {
      setAdvancedError("Please enter a public PixieDVC page URL (not admin/owner/affiliate).");
      setAdvancedOutput("");
      return;
    }

    const allowedOrigins = new Set([origin]);
    if (process.env.NODE_ENV !== "production") {
      allowedOrigins.add("http://localhost:3005");
      allowedOrigins.add("http://localhost:3000");
      allowedOrigins.add("https://localhost:3005");
      allowedOrigins.add("https://localhost:3000");
    }

    const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
    const restrictedPrefixes = ["/admin", "/owner", "/affiliate", "/api", "/auth"];
    const isRestricted = restrictedPrefixes.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    );

    if (!isHttp || !allowedOrigins.has(parsed.origin) || !parsed.pathname.startsWith("/") || isRestricted) {
      setAdvancedError("Please enter a public PixieDVC page URL (not admin/owner/affiliate).");
      setAdvancedOutput("");
      return;
    }

    const toPath = `${parsed.pathname}${parsed.search}`;
    setAdvancedError(null);
    setAdvancedOutput(buildTrackedLink(toPath));
  };

  const copyScript = async (item: ScriptItem) => {
    const shouldAppend = appendById[item.id] ?? true;
    const text = shouldAppend ? item.body.replaceAll("{your link}", canonicalReferralLink || "{your link}") : item.body;
    await copyToClipboard(text);
    setCopied(item.id);
    setTimeout(() => setCopied((prev) => (prev === item.id ? null : prev)), 1400);
  };

  const copyLink = async (value: string, key: string) => {
    await copyToClipboard(value);
    setCopied(key);
    setTimeout(() => setCopied((prev) => (prev === key ? null : prev)), 1400);
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-14">
      <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className={`sticky top-24 space-y-3 rounded-2xl p-4 ${affiliateCard2}`}>
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className={`block text-sm ${affiliateTextMuted} hover:text-slate-500`}>
                {section.label}
              </a>
            ))}
          </div>
        </aside>

        <div className="space-y-14">
          <div className="lg:hidden">
            <label className={`block text-xs uppercase tracking-[0.24em] ${affiliateTextMuted}`}>Sections</label>
            <select
              value={mobileSection}
              onChange={(event) => {
                const next = event.target.value;
                setMobileSection(next);
                document.getElementById(next)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`${affiliateInput} mt-2`}
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>

          <section id="overview" className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="space-y-2">
                <h1 className="text-4xl font-semibold tracking-tight text-slate-500">Affiliate Toolkit</h1>
                <p className={`max-w-2xl text-sm ${affiliateTextMuted}`}>
                  Everything you need to promote Deluxe Disney villa stays with PixieDVC.
                </p>
                <p className={`text-xs ${affiliateTextMuted}`}>
                  {affiliate.displayName} · {affiliate.tier} · {(affiliate.commissionRate * 100).toFixed(0)}% commission
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className={affiliatePrimaryButton}
                  onClick={() => copyLink(canonicalReferralLink, "ref-link")}
                  disabled={missingReferralLink}
                >
                  {copied === "ref-link" ? "Copied ✓" : "Copy My Referral Link"}
                </Button>
                <Button asChild variant="ghost" className={affiliateSecondaryButton}>
                  <Link href="/affiliate/dashboard">Open Dashboard</Link>
                </Button>
              </div>
            </div>

            {missingReferralLink ? (
              <Card surface="dark" className={`${affiliateCard2} border-amber-400/30`}>
                <p className="text-sm text-amber-300">
                  Your referral link isn’t configured yet. Please contact support.
                </p>
              </Card>
            ) : null}

            <Card surface="dark" className={`space-y-4 ${affiliateCard}`}>
              <h2 className="text-lg font-semibold text-slate-500">How to Position PixieDVC</h2>
              <p className={`text-sm leading-relaxed ${affiliateTextMuted}`}>
                PixieDVC helps families stay in Deluxe Disney villas with kitchens and extra space — often at
                better-than-Disney rack pricing — with concierge-style support.
              </p>
              <ul className={`space-y-2 text-sm ${affiliateTextMuted}`}>
                <li>• Deluxe villas with full kitchens</li>
                <li>• More space than standard hotel rooms</li>
                <li>• Concierge-guided booking process</li>
              </ul>
            </Card>
          </section>

          <section id="scripts" className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-500">Script Library</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(TAB_LABELS) as ScriptTab[]).map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    activeTab === tabKey ? "bg-[#D4AF37] text-[#111827]" : `${affiliateCard2} ${affiliateTextMuted}`
                  }`}
                >
                  {TAB_LABELS[tabKey]}
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              {tabScripts.map((item) => {
                const appendEnabled = appendById[item.id] ?? true;
                return (
                  <Card surface="dark" key={item.id} className={`space-y-4 ${affiliateCard}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-500">{item.title}</h3>
                      <label className={`inline-flex items-center gap-2 text-xs ${affiliateTextMuted}`}>
                        <input
                          type="checkbox"
                          checked={appendEnabled}
                          onChange={(event) => setAppendById((prev) => ({ ...prev, [item.id]: event.target.checked }))}
                          className="h-4 w-4 rounded border-white/10 bg-[#111827]"
                        />
                        Auto-append my referral link
                      </label>
                    </div>
                    <pre className={`whitespace-pre-wrap rounded-xl p-4 text-sm leading-relaxed ${affiliateCard2}`}>
                      {item.body}
                    </pre>
                    <div>
                      <Button type="button" className={affiliatePrimaryButton} onClick={() => copyScript(item)}>
                        {copied === item.id ? "Copied ✓" : "Copy Script"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          <section id="share-links" className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-500">Share Links</h2>
              <p className={`text-sm ${affiliateTextMuted}`}>
                Choose where you want to send people. We’ll generate a tracked link you can paste anywhere (bio,
                stories, YouTube descriptions).
              </p>
            </div>

            <Card surface="dark" className={`space-y-3 ${affiliateCard}`}>
              <p className={`text-xs uppercase tracking-[0.22em] ${affiliateTextMuted}`}>Main Referral Link</p>
              <p className={`text-sm ${affiliateTextMuted}`}>Best for: Instagram bio / Linktree / profile</p>
              <p className="break-all text-sm font-semibold text-slate-500">
                {canonicalReferralLink || "Your referral link isn’t configured yet. Please contact support."}
              </p>
              <div>
                <Button
                  type="button"
                  className={affiliatePrimaryButton}
                  onClick={() => copyLink(canonicalReferralLink, "main-link")}
                  disabled={missingReferralLink}
                >
                  {copied === "main-link" ? "Copied ✓" : "Copy"}
                </Button>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {quickLinks.map((item) => (
                <Card key={item.id} surface="dark" className={`space-y-3 ${affiliateCard}`}>
                  <h3 className="text-base font-semibold text-slate-500">{item.title}</h3>
                  <p className={`text-xs ${affiliateTextMuted}`}>{item.bestFor}</p>
                  <p className={`break-all text-xs ${affiliateTextMuted}`}>{item.url || "Unavailable"}</p>
                  <div>
                    <Button
                      type="button"
                      className={affiliateSecondaryButton}
                      onClick={() => copyLink(item.url, item.id)}
                      disabled={!item.url}
                    >
                      {copied === item.id ? "Copied ✓" : "Copy Link"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <p className={`text-xs ${affiliateTextMuted}`}>
              Tip: Use Calculator links in posts about savings, and Homepage links in bios.
            </p>

            <details className={`rounded-2xl p-5 ${affiliateCard2}`}>
              <summary className="cursor-pointer text-sm font-semibold text-slate-500">
                Advanced: Link to a specific PixieDVC page
              </summary>
              <div className="mt-4 space-y-4">
                <label className={`space-y-2 text-sm ${affiliateTextMuted}`}>
                  Paste a PixieDVC URL
                  <input
                    value={advancedInput}
                    onChange={(event) => setAdvancedInput(event.target.value)}
                    placeholder="https://pixiedvc.com/…"
                    className={affiliateInput}
                  />
                </label>
                <label className={`space-y-2 text-sm ${affiliateTextMuted}`}>
                  Campaign tag (optional)
                  <input
                    value={advancedCampaignTag}
                    onChange={(event) => setAdvancedCampaignTag(event.target.value)}
                    placeholder="spring-launch"
                    className={affiliateInput}
                  />
                </label>
                <Button
                  type="button"
                  className={affiliatePrimaryButton}
                  onClick={generateAdvancedLink}
                  disabled={missingReferralLink}
                >
                  Generate tracked link
                </Button>

                {advancedError ? <p className="text-sm text-rose-300">{advancedError}</p> : null}

                {advancedOutput ? (
                  <div className="space-y-2">
                    <input readOnly value={advancedOutput} className={affiliateInput} />
                    <Button
                      type="button"
                      className={affiliateSecondaryButton}
                      onClick={() => copyLink(advancedOutput, "advanced-link")}
                    >
                      {copied === "advanced-link" ? "Copied ✓" : "Copy Link"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </details>
          </section>

          <section id="tracking" className="space-y-5">
            <h2 className="text-2xl font-semibold text-slate-500">Tracking Rules</h2>
            <div className="space-y-3">
              {TRACKING_RULES.map((rule) => (
                <details key={rule.title} className={`rounded-xl p-4 ${affiliateCard2}`}>
                  <summary className="cursor-pointer text-sm font-semibold text-slate-500">{rule.title}</summary>
                  <p className={`mt-2 text-sm ${affiliateTextMuted}`}>{rule.body}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
