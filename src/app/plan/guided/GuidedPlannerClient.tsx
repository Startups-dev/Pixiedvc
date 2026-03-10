"use client";

import Link from "next/link";
import ReferralLink from "@/components/referral/ReferralLink";
import { useMemo, useState } from "react";

import { Button, Card, SectionHeader } from "@pixiedvc/design-system";
import { useReferral } from "@/hooks/useReferral";
import { appendRefToUrl } from "@/lib/referral";

const resortCatalog = [
  {
    slug: "bay-lake-tower",
    name: "Bay Lake Tower",
    tags: ["magic-kingdom", "luxury", "parks"],
  },
  {
    slug: "grand-floridian-villas",
    name: "Grand Floridian Villas",
    tags: ["magic-kingdom", "luxury", "dining"],
  },
  {
    slug: "polynesian-villas",
    name: "Polynesian Villas",
    tags: ["magic-kingdom", "relaxing", "dining", "luxury"],
  },
  {
    slug: "copper-creek-villas",
    name: "Copper Creek Villas",
    tags: ["magic-kingdom", "quiet", "relaxing", "scenic"],
  },
  {
    slug: "boulder-ridge-villas",
    name: "Boulder Ridge Villas",
    tags: ["magic-kingdom", "quiet", "relaxing", "scenic"],
  },
  {
    slug: "boardwalk-villas",
    name: "BoardWalk Villas",
    tags: ["epcot", "parks", "dining"],
  },
  {
    slug: "beach-club-villas",
    name: "Beach Club Villas",
    tags: ["epcot", "parks", "relaxing", "luxury"],
  },
  {
    slug: "riviera-resort",
    name: "Riviera Resort",
    tags: ["skyliner", "dining", "luxury"],
  },
  {
    slug: "animal-kingdom-villas",
    name: "Animal Kingdom Villas",
    tags: ["relaxing", "value", "scenic"],
  },
  {
    slug: "saratoga-springs",
    name: "Saratoga Springs",
    tags: ["value", "quiet"],
  },
  {
    slug: "old-key-west",
    name: "Old Key West",
    tags: ["value", "quiet"],
  },
];

const partyOptions = ["Couple", "Family", "Friends", "Solo"] as const;
const priorityOptions = [
  "Closest to parks",
  "Best value",
  "Luxury",
  "Relaxing & scenic",
] as const;

const vibeOptions = [
  { id: "magic-kingdom", label: "Magic Kingdom focus" },
  { id: "epcot", label: "Epcot focus" },
  { id: "skyliner", label: "Skyliner" },
  { id: "quiet", label: "Quiet" },
  { id: "dining", label: "Dining" },
] as const;

type PriorityOption = (typeof priorityOptions)[number];

type PlannerInput = {
  priority: PriorityOption;
  vibes: string[];
};

function recommendResorts(input: PlannerInput) {
  const priorityBoostByTag: Record<PriorityOption, Record<string, number>> = {
    "Closest to parks": {
      "magic-kingdom": 28,
      epcot: 28,
      skyliner: 16,
      parks: 20,
    },
    "Best value": {
      value: 34,
      quiet: 18,
      relaxing: 10,
    },
    Luxury: {
      luxury: 34,
      dining: 14,
      "magic-kingdom": 8,
      epcot: 8,
    },
    "Relaxing & scenic": {
      relaxing: 30,
      scenic: 20,
      quiet: 24,
      value: 10,
    },
  };

  const vibeBoostByTag: Record<string, Record<string, number>> = {
    "magic-kingdom": {
      "magic-kingdom": 100,
      luxury: 20,
      parks: 10,
    },
    epcot: {
      epcot: 100,
      parks: 18,
      skyliner: 10,
    },
    skyliner: {
      skyliner: 120,
      epcot: 15,
    },
    quiet: {
      quiet: 110,
      relaxing: 25,
      scenic: 10,
    },
    dining: {
      dining: 75,
      luxury: 12,
    },
  };
  const vibeBoostBySlug: Record<string, Record<string, number>> = {
    "magic-kingdom": {
      "bay-lake-tower": 140,
      "polynesian-villas": 130,
      "grand-floridian-villas": 120,
      "copper-creek-villas": 70,
      "boulder-ridge-villas": 60,
    },
    epcot: {
      "beach-club-villas": 130,
      "boardwalk-villas": 125,
      "riviera-resort": 115,
    },
    skyliner: {
      "riviera-resort": 160,
    },
    quiet: {
      "saratoga-springs": 130,
      "old-key-west": 125,
      "copper-creek-villas": 90,
      "boulder-ridge-villas": 85,
    },
    dining: {
      "grand-floridian-villas": 110,
      "polynesian-villas": 95,
      "riviera-resort": 90,
      "boardwalk-villas": 80,
    },
  };

  const scored = resortCatalog.map((resort) => {
    let score = 0;
    const priorityBoosts = priorityBoostByTag[input.priority];
    for (const [tag, points] of Object.entries(priorityBoosts)) {
      if (resort.tags.includes(tag)) score += points;
    }
    for (const vibe of input.vibes) {
      const vibeBoosts = vibeBoostByTag[vibe];
      if (!vibeBoosts) continue;
      for (const [tag, points] of Object.entries(vibeBoosts)) {
        if (resort.tags.includes(tag)) score += points;
      }
      score += vibeBoostBySlug[vibe]?.[resort.slug] ?? 0;
    }
    return { slug: resort.slug, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.slug.localeCompare(b.slug);
  });

  return scored.slice(0, 3).map((item) => item.slug);
}

function reasonFor(slug: string, input: PlannerInput) {
  if (input.priority === "Closest to parks") {
    if (slug === "bay-lake-tower") return "Walk or monorail access to Magic Kingdom with easy park mornings.";
    if (slug === "boardwalk-villas") return "BoardWalk and Epcot access with quick park hopping.";
  }
  if (input.priority === "Best value") {
    if (slug === "saratoga-springs") return "Spacious rooms and strong point value with a calm vibe.";
    if (slug === "old-key-west") return "Large villas and classic DVC value with a laid-back setting.";
  }
  if (input.priority === "Luxury") {
    if (slug === "grand-floridian-villas") return "Top-tier finishings with an iconic resort setting.";
    if (slug === "riviera-resort") return "Boutique feel, Skyliner access, and elevated dining.";
  }
  if (slug === "animal-kingdom-villas") return "Savanna views and a relaxing atmosphere away from crowds.";
  if (slug === "beach-club-villas") return "Steps to Epcot and pool time with a relaxed atmosphere.";
  if (slug === "polynesian-villas") return "Great dining and Magic Kingdom convenience with island ambiance.";
  if (slug === "copper-creek-villas") return "Calm lodge-style setting with easy Magic Kingdom area access.";
  if (slug === "boulder-ridge-villas") return "Quiet, rustic atmosphere with strong Magic Kingdom area convenience.";
  return "A strong fit based on your priorities and availability windows.";
}

function buildCalculatorLink(slug: string, checkIn: string, nights: number, ref: string | null) {
  const params = new URLSearchParams({ resort: slug });
  if (checkIn) params.set("checkIn", checkIn);
  if (nights) params.set("nights", String(nights));
  return appendRefToUrl(`/calculator?${params.toString()}`, ref);
}

export default function GuidedPlannerClient() {
  const [step, setStep] = useState(1);
  const [partyType, setPartyType] = useState<(typeof partyOptions)[number]>("Family");
  const [priority, setPriority] = useState<PriorityOption>("Closest to parks");
  const [checkIn, setCheckIn] = useState(new Date().toISOString().slice(0, 10));
  const [nights, setNights] = useState(5);
  const [flexibility, setFlexibility] = useState("Fixed");
  const [vibes, setVibes] = useState<string[]>([]);
  const { ref } = useReferral();

  const recommendations = useMemo(
    () => recommendResorts({ priority, vibes }),
    [priority, vibes],
  );

  const toggleVibe = (id: string) => {
    setVibes((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Guided Planner"
        title="A few answers, then instant pricing"
        description="Share what matters most and we will recommend resorts that match your style."
      />

      <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-muted">
        {[
          "Party",
          "Dates",
          "Resort vibe",
          "Results",
        ].map((label, index) => (
          <span
            key={label}
            className={`rounded-full px-4 py-1 ${step === index + 1 ? "bg-brand/10 text-brand" : "bg-white/70 text-muted"}`}
          >
            {index + 1}. {label}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <Card className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-ink">Party + trip style</h2>
            <p className="text-sm text-muted">Tell us who is traveling and what you value most.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Party type</p>
              <div className="flex flex-wrap gap-2">
                {partyOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPartyType(option)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      partyType === option
                        ? "bg-brand text-white"
                        : "border border-ink/10 bg-white/80 text-ink hover:border-brand"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Top priority</p>
              <div className="flex flex-col gap-2">
                {priorityOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPriority(option)}
                    className={`rounded-2xl border px-4 py-2 text-left text-sm font-semibold transition ${
                      priority === option
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-ink/10 bg-white/80 text-ink hover:border-brand"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Step 1 of 4</div>
            <Button onClick={() => setStep(2)}>Next</Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-ink">Dates</h2>
            <p className="text-sm text-muted">Add your dates so we can personalize pricing.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-muted">
              Check-in date
              <input
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-ink"
              />
            </label>
            <label className="space-y-2 text-sm text-muted">
              Flexibility
              <select
                value={flexibility}
                onChange={(event) => setFlexibility(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-ink"
              >
                <option>Fixed</option>
                <option>Flexible by ±1–2 days</option>
              </select>
            </label>
          </div>
          <div className="space-y-2 text-sm text-muted">
            Nights: <span className="font-semibold text-ink">{nights}</span>
            <input
              type="range"
              min={1}
              max={14}
              value={nights}
              onChange={(event) => setNights(Number(event.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)}>Next</Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-ink">Resort vibe</h2>
            <p className="text-sm text-muted">Pick up to two vibes that sound like your trip.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {vibeOptions.map((option) => {
              const isActive = vibes.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleVibe(option.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-brand text-white"
                      : "border border-ink/10 bg-white/80 text-ink hover:border-brand"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={() => setStep(4)}>See results</Button>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-ink">Your best-fit resorts</h2>
            <p className="text-sm text-muted">
              Based on your answers ({partyType.toLowerCase()} trip, {priority.toLowerCase()}), these are strong fits.
            </p>
          </div>
          <div className="grid gap-4">
            {recommendations.map((slug) => {
              const resort = resortCatalog.find((item) => item.slug === slug);
              if (!resort) return null;
              return (
                <div key={slug} className="rounded-3xl border border-ink/10 bg-white/90 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-xl text-ink">{resort.name}</p>
                      <p className="text-sm text-muted">{reasonFor(slug, { priority, vibes })}</p>
                    </div>
                    <Button asChild>
                      <Link href={buildCalculatorLink(slug, checkIn, nights, ref)}>Estimate this stay</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>
              Back
            </Button>
            <ReferralLink href="/plan" className="text-sm font-semibold text-brand hover:text-brand/80">
              Start over
            </ReferralLink>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
