import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import { Card } from "@pixiedvc/design-system";

import CalculatorClient from "@/app/(public)/calculator/CalculatorClient";
import CalculatorHeroImage from "@/app/(public)/calculator/CalculatorHeroImage";

const trustItems = [
  "Get your price instantly",
  "Final price confirmed before booking",
];

const nextSteps = [
  "Submit your trip details",
  "We match your request with available DVC owners",
  "Review your booking details before confirming your request",
];

export default function CalculatorPage() {
  return (
    <main className="min-h-screen bg-[#f8f6f2] text-[#0F2148]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[32rem]">
          <Suspense fallback={null}>
            <CalculatorHeroImage />
          </Suspense>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-5 md:pt-28 md:pb-6">
          <div className="max-w-[640px] rounded-[28px] border border-white/7 bg-white/10 px-8 pt-8 pb-7 shadow-[0_34px_72px_rgba(0,0,0,0.22)] backdrop-blur-[0.35px]">
            <div className="max-w-[560px]">
              <h1 className="text-[2.5rem] font-semibold leading-[1.02] !text-[rgba(255,255,255,0.96)] sm:text-[3.35rem]">
                Estimate your Disney Deluxe villa stay
              </h1>
              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-[rgba(255,255,255,0.76)]">
                {trustItems.map((item, index) => (
                  <span key={item} className="inline-flex items-center gap-3">
                    {index > 0 ? <span className="text-white/40">•</span> : null}
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-12 md:-mt-4 md:pb-16">
          <div className="mx-auto max-w-[900px]">
            <Card className="rounded-2xl border border-white/50 bg-white/95 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.10)] backdrop-blur-[2px] md:p-8">
              <Suspense fallback={null}>
                <CalculatorClient />
              </Suspense>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10 md:pb-12">
        <div className="space-y-5">
          <div className="max-w-[560px]">
            <h2 className="text-[1.85rem] font-semibold text-[#0B1F44] sm:text-[2.15rem]">What happens next</h2>
          </div>
          <div className="overflow-hidden rounded-[1.75rem] border border-[#0F2148]/7 bg-white/68 px-5 py-5 shadow-[0_10px_28px_rgba(15,33,72,0.05)] backdrop-blur-[1px] sm:px-6 sm:py-6">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
              {nextSteps.map((step, index) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(to_bottom,#5568d5,#4457c7)] text-sm font-semibold text-white shadow-[0_8px_18px_rgba(45,60,122,0.16)]">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-[16px] font-medium leading-snug text-[#0B1F44] sm:text-[17px]">{step}</p>
                </div>
              )).reduce<ReactNode[]>((items, step, index) => {
                items.push(step);
                if (index < nextSteps.length - 1) {
                  items.push(
                    <div key={`arrow-${index}`} className="hidden md:flex justify-center text-[#4c5fd7]/55">
                      <ArrowRightIcon className="h-5 w-5" />
                    </div>,
                  );
                }
                return items;
              }, [])}
            </div>
          </div>
          <div className="space-y-1 pt-1 text-sm text-[#4f5f7f]">
            <p>Availability is reviewed before your reservation is finalized.</p>
            <p>A deposit is required before reservation confirmation.</p>
          </div>
        </div>
      </section>

      <section className="border-t border-[#0F2148]/8 bg-white py-10 md:py-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="space-y-4">
            <h2 className="text-[34px] font-semibold leading-tight text-[#06080d] sm:text-[46px]">
              Prefer pre-confirmed stays?
            </h2>
            <p className="mx-auto max-w-[620px] text-[18px] leading-[1.65] text-[#5f6673]">
              Browse Ready Stays — fixed Disney villa reservations already secured by DVC owners.
            </p>
          </div>
          <div className="mt-8">
            <Link
              href="/ready-stays"
              className="inline-flex items-center rounded-xl bg-[linear-gradient(to_bottom,#5a6bd7,#4457c7)] px-6 py-3 text-sm font-semibold !text-white shadow-[0_14px_28px_rgba(45,60,122,0.24)] transition-[transform,box-shadow,filter] duration-300 hover:-translate-y-[1px] hover:!text-white hover:brightness-[1.02] hover:shadow-[0_18px_34px_rgba(45,60,122,0.28)]"
            >
              Explore Ready Stays
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
