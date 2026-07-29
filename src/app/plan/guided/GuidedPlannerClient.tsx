"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, Compass, Sparkles, Users } from "lucide-react";

import { Button } from "@pixiedvc/design-system";
import ReferralLink from "@/components/referral/ReferralLink";
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

const resortImages: Record<string, string> = {
  "bay-lake-tower":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake-tower/BTC1.png",
  "grand-floridian-villas":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-floridian-villas/GFV1.png",
  "polynesian-villas":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Polynesian-villas-and-bungalows/PVB1.png",
  "copper-creek-villas":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Copper-creek-villas-and-cabins/CCV1.png",
  "boulder-ridge-villas":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/boulder-ridge-villas/BRV1.png",
  "boardwalk-villas":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Boardwalk/BDW1.png",
  "beach-club-villas":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/beach-club-villa/BCV1.png",
  "riviera-resort":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Riviera/RR1.png",
  "animal-kingdom-villas":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/animal-kingdom-lodge/AKL1.png",
  "saratoga-springs":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/saratoga-springs-resort/SSR1.png",
  "old-key-west":
    "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/old-key-west/OKW1.png",
};

const partyOptions = ["Couple", "Family", "Friends", "Solo"] as const;
const priorityOptions = [
  "Closest to parks",
  "Best value",
  "Luxury",
  "Relaxing & scenic",
] as const;

const vibeOptions = [
  { id: "magic-kingdom", label: "Near Magic Kingdom" },
  { id: "epcot", label: "Near EPCOT" },
  { id: "skyliner", label: "Skyliner access" },
  { id: "quiet", label: "Quiet & relaxing" },
  { id: "dining", label: "Great dining nearby" },
] as const;

const plannerSteps = [
  { label: "Party & Style", icon: Users },
  { label: "Travel Dates", icon: CalendarDays },
  { label: "Resort Preferences", icon: Compass },
  { label: "Your Matches", icon: Sparkles },
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
    if (slug === "bay-lake-tower") return "Direct walking or monorail access makes Magic Kingdom mornings especially easy.";
    if (slug === "boardwalk-villas") return "BoardWalk energy with quick access to EPCOT and easy park hopping.";
  }
  if (input.priority === "Best value") {
    if (slug === "saratoga-springs") return "Spacious rooms, calmer grounds, and one of the strongest value profiles in DVC.";
    if (slug === "old-key-west") return "Large villas and a laid-back setting that consistently delivers strong value.";
  }
  if (input.priority === "Luxury") {
    if (slug === "grand-floridian-villas") return "Elegant finishings, standout dining, and an iconic Magic Kingdom-area setting.";
    if (slug === "riviera-resort") return "Boutique style, Skyliner convenience, and elevated dining for a more polished stay.";
  }
  if (slug === "animal-kingdom-villas") return "A quieter escape with scenic views and a slower, more immersive resort pace.";
  if (slug === "beach-club-villas") return "A relaxed resort atmosphere with effortless EPCOT access and strong pool time built in.";
  if (slug === "polynesian-villas") return "A relaxed island-style resort with strong dining and one of the easiest Magic Kingdom commutes on property.";
  if (slug === "copper-creek-villas") return "A calm lodge-style resort with a more secluded feel and dependable Magic Kingdom-area access.";
  if (slug === "boulder-ridge-villas") return "Rustic atmosphere, quieter paths, and a calmer take on the Magic Kingdom area.";
  return "A strong fit for the travel style and resort priorities you shared with our concierge planner.";
}

function matchLabel(slug: string, input: PlannerInput) {
  if (input.priority === "Closest to parks") return "Best for easy park access";
  if (input.priority === "Best value") return "Best value fit";
  if (input.priority === "Luxury") return "Best elevated resort match";
  if (slug === "animal-kingdom-villas") return "Best for a slower scenic trip";
  return "Best overall match";
}

function whyPicked(slug: string, input: PlannerInput) {
  const labels = input.vibes.map((vibe) => {
    if (vibe === "magic-kingdom") return "Magic Kingdom access";
    if (vibe === "epcot") return "EPCOT access";
    if (vibe === "skyliner") return "Skyliner access";
    if (vibe === "quiet") return "a quieter resort atmosphere";
    if (vibe === "dining") return "great dining";
    return vibe;
  });

  const priorityLine =
    input.priority === "Closest to parks"
      ? "park access"
      : input.priority === "Best value"
        ? "overall value"
        : input.priority === "Luxury"
          ? "a more elevated resort feel"
          : "a relaxing resort atmosphere";

  if (labels.length === 0) {
    return `Recommended based on your preference for ${priorityLine}.`;
  }

  if (labels.length === 1) {
    return `Recommended based on your preference for ${priorityLine} and ${labels[0]}.`;
  }

  return `Recommended based on your preference for ${priorityLine}, ${labels[0]}, and ${labels[1]}.`;
}

function formatTag(tag: string) {
  if (tag === "magic-kingdom") return "Near Magic Kingdom";
  if (tag === "epcot") return "Near EPCOT";
  if (tag === "skyliner") return "Skyliner Access";
  if (tag === "quiet") return "Quiet & Relaxing";
  if (tag === "dining") return "Great Dining";
  if (tag === "relaxing") return "Relaxing";
  if (tag === "parks") return "Park Access";
  if (tag === "luxury") return "Luxury";
  if (tag === "value") return "Value";
  if (tag === "scenic") return "Scenic";
  return tag.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildCalculatorLink(slug: string, checkIn: string, nights: number, ref: string | null) {
  const params = new URLSearchParams({ resort: slug });
  if (checkIn) params.set("checkIn", checkIn);
  if (nights) params.set("nights", String(nights));
  return appendRefToUrl(`/calculator?${params.toString()}`, ref);
}

function StepProgress({ step }: { step: number }) {
  return (
    <div className="rounded-[1.4rem] border border-[#e4e9f6] bg-[linear-gradient(180deg,rgba(250,251,255,0.98),rgba(245,245,241,0.96))] px-4 py-4 shadow-[0_12px_34px_rgba(15,33,72,0.08)] sm:px-5">
      <div className="flex items-center justify-between gap-2">
        {plannerSteps.map((item, index) => {
          const position = index + 1;
          const isComplete = position < step;
          const isActive = position === step;
          const Icon = item.icon;

          return (
            <div key={item.label} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="min-w-0 flex-1 sm:min-w-[9.5rem]">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                      isActive
                        ? "border-[#6c7df1]/38 bg-[#5366d3] text-white shadow-[0_10px_24px_rgba(40,56,120,0.24)]"
                        : isComplete
                          ? "border-[#d8e0f0] bg-[#eef2ff] text-[#3d518f]"
                          : "border-[#e3e8f5] bg-white text-[#8a98b4]"
                    }`}
                  >
                    {isComplete ? <Check className="h-4 w-4" strokeWidth={2.2} /> : <Icon className="h-4 w-4" strokeWidth={1.9} />}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isActive ? "text-[#10224b]" : isComplete ? "text-[#3d518f]" : "text-[#8a98b4]"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </div>
              {index < plannerSteps.length - 1 ? (
                <span className={`hidden h-px flex-1 rounded-full sm:block ${position < step ? "bg-[#6172de]/65" : "bg-[#e3e8f5]"}`} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Shell({
  title,
  description,
  children,
  step,
  onBack,
  primaryLabel,
  primaryDisabled,
  hideFooter,
  onPrimary,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  step: number;
  onBack?: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
  hideFooter?: boolean;
  onPrimary: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#dfe6f8]/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,247,243,0.96))] shadow-[0_30px_80px_rgba(15,33,72,0.12)]">
      <div className="border-b border-[#e6ebf7] px-6 py-6 sm:px-8">
        <div className="space-y-5">
          <StepProgress step={step} />
          <div className="max-w-2xl space-y-2">
          <h2 className="text-[1.9rem] font-semibold leading-tight text-[#10224b] sm:text-[2.2rem]">{title}</h2>
          <p className="text-[15px] leading-7 text-[#4b5f87] sm:text-base">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-7">{children}</div>
      {hideFooter ? null : (
        <div className="flex items-center justify-between border-t border-[#e6ebf7] bg-[linear-gradient(180deg,rgba(249,250,255,0.96),rgba(244,243,238,0.92))] px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3 text-sm text-[#556989]">
            {onBack ? (
              <button type="button" onClick={onBack} className="font-semibold text-[#10224b] transition hover:text-[#4457c7]">
                ← Back
              </button>
            ) : (
              <span />
            )}
          </div>
          <Button
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="rounded-xl px-6 py-3 text-sm shadow-[0_16px_34px_rgba(18,28,63,0.24)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {primaryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function GuidedPlannerClient() {
  const [step, setStep] = useState(1);
  const [partyType, setPartyType] = useState<(typeof partyOptions)[number] | null>(null);
  const [priority, setPriority] = useState<PriorityOption | null>(null);
  const [checkIn, setCheckIn] = useState(new Date().toISOString().slice(0, 10));
  const [nights, setNights] = useState(5);
  const [flexibility, setFlexibility] = useState("Fixed");
  const [vibes, setVibes] = useState<string[]>([]);
  const { ref } = useReferral();

  const safePriority = priority ?? "Closest to parks";
  const recommendations = useMemo(() => recommendResorts({ priority: safePriority, vibes }), [safePriority, vibes]);
  const plannerIntro =
    step === 1
      ? "Answer one quick question at a time and we will shape the right Disney villa direction for your trip."
      : "A few answers is all we need to recommend the resorts that best fit your travel style, pace, and priorities.";
  const showPlannerHero = step !== 4;

  const toggleVibe = (id: string) => {
    setVibes((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const handlePartySelect = (option: (typeof partyOptions)[number]) => {
    setPartyType(option);
  };

  const handlePrioritySelect = (option: PriorityOption) => {
    setPriority(option);
    setStep(2);
  };

  return (
    <div className="space-y-5">
      {showPlannerHero ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-white/72">Concierge Planner</p>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold leading-tight !text-white sm:text-[2.75rem] sm:leading-[1.04]">
              Tell us what this Disney villa trip should feel like
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/84 sm:text-lg">
              {plannerIntro}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-white/72">HannaDVC Concierge Planner</p>
        </div>
      )}

      {step === 1 ? (
        <Shell
          step={step}
          title={partyType === null ? "Who is traveling?" : "What matters most for this trip?"}
          description={
            partyType === null
              ? "Start with the kind of trip you are planning so we can narrow the right Disney villa fit."
              : "Now tell us the main priority so your resort matches feel more intentional."
          }
          hideFooter
          primaryLabel={partyType === null ? "Continue" : "Continue to travel dates"}
          primaryDisabled={partyType === null || priority === null}
          onPrimary={() => {
            if (partyType === null) return;
            if (priority === null) return;
            setStep(2);
          }}
        >
          {partyType === null ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {partyOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handlePartySelect(option)}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                      partyType === option
                        ? "bg-[linear-gradient(to_right,#18284d,#4560d2)] text-white shadow-[0_12px_28px_rgba(28,43,88,0.18)]"
                        : "border border-[#d7deef] bg-white/90 text-[#10224b] hover:border-[#93a5df] hover:bg-[#f5f8ff]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-[#556989]">
                <span className="font-medium">Traveling as:</span>
                <button
                  type="button"
                  onClick={() => {
                    setPartyType(null);
                    setPriority(null);
                  }}
                  className="rounded-full bg-[#eef2ff] px-3 py-1 font-semibold text-[#2f4579] transition hover:bg-[#e4ebff]"
                >
                  {partyType}
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {priorityOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handlePrioritySelect(option)}
                    className={`rounded-[1.2rem] border px-4 py-3 text-left text-sm font-semibold transition ${
                      priority === option
                        ? "border-[#3650aa] bg-[linear-gradient(to_right,#18284d,#4560d2)] text-white shadow-[0_12px_28px_rgba(28,43,88,0.18)]"
                        : "border-[#d7deef] bg-white/90 text-[#10224b] hover:border-[#93a5df] hover:bg-[#f8faff]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Shell>
      ) : null}

      {step === 2 ? (
        <Shell
          step={step}
          title="When would you like to travel?"
          description="Add your dates so we can tailor your resort recommendations."
          primaryLabel="Continue to resort preferences"
          onPrimary={() => setStep(3)}
          onBack={() => setStep(1)}
        >
          <div className="grid gap-6 sm:grid-cols-3">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#556989]">Check-in date</span>
              <input
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className="w-full rounded-[1.15rem] border border-[#d8e0f0] bg-white/92 px-4 py-3 text-sm text-[#10224b] shadow-[0_8px_20px_rgba(30,47,92,0.05)] outline-none transition focus:border-[#7b8ce7] focus:ring-2 focus:ring-[#dfe5ff]"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#556989]">Date flexibility</span>
              <select
                value={flexibility}
                onChange={(event) => setFlexibility(event.target.value)}
                className="w-full rounded-[1.15rem] border border-[#d8e0f0] bg-white/92 px-4 py-3 text-sm text-[#10224b] shadow-[0_8px_20px_rgba(30,47,92,0.05)] outline-none transition focus:border-[#7b8ce7] focus:ring-2 focus:ring-[#dfe5ff]"
              >
                <option>Fixed</option>
                <option>Flexible by ±1–2 days</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#556989]">Length of stay</span>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={nights}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isNaN(next)) return;
                    setNights(Math.min(30, Math.max(1, next)));
                  }}
                  className="w-full rounded-[1.15rem] border border-[#d8e0f0] bg-white/92 px-4 py-3 pr-20 text-sm text-[#10224b] shadow-[0_8px_20px_rgba(30,47,92,0.05)] outline-none transition focus:border-[#7b8ce7] focus:ring-2 focus:ring-[#dfe5ff]"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-medium text-[#556989]">
                  night(s)
                </span>
              </div>
            </label>
          </div>
        </Shell>
      ) : null}

      {step === 3 ? (
        <Shell
          step={step}
          title="What matters most for this stay?"
          description="Pick the experiences that matter most and we’ll prioritize resorts that match your travel style."
          primaryLabel="See my resort matches"
          onPrimary={() => setStep(4)}
          onBack={() => setStep(2)}
        >
          <div className="flex flex-wrap gap-3">
            {vibeOptions.map((option) => {
              const isActive = vibes.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleVibe(option.id)}
                  className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[linear-gradient(to_right,#18284d,#4560d2)] text-white shadow-[0_12px_28px_rgba(28,43,88,0.20)]"
                      : "border border-[#d7deef] bg-white/90 text-[#10224b] hover:border-[#93a5df] hover:bg-[#f5f8ff]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-[#617391]">
            Choosing one or two priorities helps us narrow the best resort matches for your trip.
          </p>
        </Shell>
      ) : null}

      {step === 4 ? (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-[#dfe6f8]/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,247,243,0.96))] shadow-[0_30px_80px_rgba(15,33,72,0.12)]">
            <div className="border-b border-[#e6ebf7] px-6 py-6 sm:px-8">
              <div className="space-y-5">
                <StepProgress step={step} />
                <div className="max-w-2xl space-y-2">
                <h2 className="text-[1.9rem] font-semibold leading-tight text-[#10224b] sm:text-[2.2rem]">
                  Your HannaDVC concierge recommendations
                </h2>
                <p className="text-[15px] leading-7 text-[#4b5f87] sm:text-base">
                  Based on your trip style and priorities, these are the strongest resort matches to explore first.
                </p>
                </div>
              </div>
            </div>
            <div className="grid gap-5 px-6 py-6 sm:px-8 sm:py-7">
              {recommendations.map((slug, index) => {
                const resort = resortCatalog.find((item) => item.slug === slug);
                if (!resort) return null;
                return (
                  <div
                    key={slug}
                    className="overflow-hidden rounded-[1.75rem] border border-[#dde4f5] bg-white/94 shadow-[0_18px_50px_rgba(15,33,72,0.08)]"
                  >
                    <div className="grid lg:grid-cols-[1.05fr,1.2fr]">
                      <div className="relative min-h-[220px] overflow-hidden">
                        <div
                          aria-hidden="true"
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `linear-gradient(180deg, rgba(10,20,40,0.04) 0%, rgba(10,20,40,0.14) 48%, rgba(10,20,40,0.54) 100%), url(${resortImages[slug] ?? resortImages["riviera-resort"]})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                          }}
                        />
                        <div className="relative flex min-h-[220px] items-end p-5">
                          <div className="rounded-full border border-white/18 bg-white/12 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-white backdrop-blur-[3px]">
                            {index === 0 ? "Top Match" : "Recommended for your trip"}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between p-5 sm:p-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.22em] text-[#6b7b99]">{matchLabel(slug, { priority: safePriority, vibes })}</p>
                            <h3 className="text-[1.95rem] font-semibold leading-tight text-[#10224b] sm:text-[2.15rem]">{resort.name}</h3>
                            <p className="max-w-xl text-[15px] leading-7 text-[#4b5f87] sm:text-base">
                              {reasonFor(slug, { priority: safePriority, vibes })}
                            </p>
                            <p className="max-w-xl text-sm leading-6 text-[#6b7b99]">
                              {whyPicked(slug, { priority: safePriority, vibes })}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {resort.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-medium text-[#42548a]">
                                {formatTag(tag)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          <Button asChild className="rounded-xl px-5 py-3 text-sm !text-white hover:!text-white shadow-[0_16px_34px_rgba(18,28,63,0.20)]">
                            <Link href={buildCalculatorLink(slug, checkIn, nights, ref)}>Estimate this stay</Link>
                          </Button>
                          <Link href={`/resorts/${slug}`} className="text-sm font-semibold text-[#6b7b99] transition hover:text-[#10224b]">
                            Learn more about this resort
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-[#e6ebf7] bg-[linear-gradient(180deg,rgba(249,250,255,0.96),rgba(244,243,238,0.92))] px-6 py-4 sm:px-8">
              <button type="button" onClick={() => setStep(3)} className="text-sm font-semibold text-[#10224b] transition hover:text-[#4457c7]">
                ← Back
              </button>
              <ReferralLink href="/plan" className="inline-flex items-center gap-2 text-sm font-semibold text-[#10224b] transition hover:text-[#4457c7]">
                <span>Start over</span>
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </ReferralLink>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
