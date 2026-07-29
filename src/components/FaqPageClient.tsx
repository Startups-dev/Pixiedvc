"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  CalendarDays,
  Castle,
  CreditCard,
  PartyPopper,
  Sparkles,
} from "lucide-react";

import FaqAccordion from "@/components/FaqAccordion";
import { FAQ_CATEGORIES } from "@/components/faqData";

const CATEGORY_ICONS = {
  "booking-availability": CalendarDays,
  "pricing-payments": CreditCard,
  "changes-cancellations-insurance": Sparkles,
  "disney-accounts-perks": Castle,
  "tickets-dining-extras": PartyPopper,
  "deals-support": Sparkles,
} as const;

export default function FaqPageClient() {
  const faqSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_CATEGORIES.flatMap((category) =>
        category.items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      ),
    }),
    [],
  );

  return (
    <main className="bg-[linear-gradient(180deg,#f8faff_0%,#ffffff_18%,#f9fbff_100%)] text-slate-900">
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-16 sm:pt-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-[#10224b] sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-5 text-base leading-8 text-[#546887] sm:text-lg">
            Everything you need to know about booking Disney villas through HannaDVC.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div
          className="overflow-hidden rounded-[2.25rem] border border-[#dbe5f5] shadow-[0_22px_56px_rgba(16,34,75,0.08)]"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,15,34,0.08) 0%, rgba(7,15,34,0.22) 100%), url(https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Riviera/RR4.png) center/cover",
          }}
        >
          <div className="bg-[linear-gradient(90deg,rgba(7,15,34,0.72)_0%,rgba(7,15,34,0.34)_52%,rgba(7,15,34,0.16)_100%)] px-8 py-10 sm:px-12 sm:py-12">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight !text-white sm:text-[2.2rem]">
                Disney villa planning, simplified.
              </h2>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-10 px-6 pb-20">
        {FAQ_CATEGORIES.map((category, index) => {
          const Icon = CATEGORY_ICONS[category.id];
          const isTinted = index % 2 === 1;
          return (
            <section
              key={category.id}
              id={category.id}
              className={`scroll-mt-28 rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 ${
                isTinted
                  ? "bg-[linear-gradient(180deg,rgba(243,247,255,0.96),rgba(249,251,255,0.99))]"
                  : "bg-white"
              }`}
            >
              <div className="max-w-3xl">
                <div className="flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(180deg,#eef3ff,#f8faff)] text-[#3a57a5] shadow-[0_12px_30px_rgba(16,34,75,0.08)]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-[2rem] font-semibold tracking-tight text-[#10224b]">{category.title}</h2>
                    <div className="mt-3 h-px w-24 bg-[linear-gradient(90deg,rgba(49,79,152,0.34),rgba(49,79,152,0.06))]" />
                  </div>
                </div>
                {category.blurb && (
                  <p className="mt-5 max-w-2xl text-[17px] leading-8 text-[#5a6d8f]">{category.blurb}</p>
                )}
              </div>
              <div className="mt-7">
                <FaqAccordion categoryId={category.id} items={category.items} />
              </div>
            </section>
          );
        })}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div
          className="overflow-hidden rounded-[2.25rem] border border-[#223d7e]/20 shadow-[0_28px_72px_rgba(16,34,75,0.14)]"
          style={{
            background:
              "linear-gradient(135deg, rgba(16,34,75,0.88) 0%, rgba(41,64,123,0.78) 48%, rgba(73,97,168,0.34) 100%), url(https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Polynesian-villas-and-bungalows/PVB1.png) center/cover",
          }}
        >
          <div className="bg-[linear-gradient(90deg,rgba(8,18,40,0.92)_0%,rgba(8,18,40,0.8)_36%,rgba(8,18,40,0.42)_62%,rgba(8,18,40,0.08)_100%)] px-8 py-10 sm:px-10 sm:py-12">
            <p className="text-sm font-medium uppercase tracking-[0.18em] !text-white/72">Concierge Support</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight !text-white sm:text-[2.2rem]">
              Need help choosing the right Disney villa?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 !text-white/84">
              Our concierge team can help compare resorts, room types, pricing windows, and availability strategies
              for the stay you have in mind.
            </p>
            <Link
              href="/contact"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white/18 px-5 py-3 text-sm font-semibold !text-white shadow-[0_14px_34px_rgba(7,15,34,0.28)] ring-1 ring-white/18 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white/24 hover:shadow-[0_18px_40px_rgba(7,15,34,0.32)] hover:!text-white"
            >
              Talk to concierge
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </main>
  );
}
