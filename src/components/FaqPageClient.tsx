"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import FaqAccordion from "@/components/FaqAccordion";
import { FAQ_CATEGORIES } from "@/components/faqData";

export default function FaqPageClient() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

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

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategoryId(categoryId);
    const section = document.getElementById(categoryId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-5xl px-6 pb-10 pt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Support</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          A quick guide to booking, pricing, and resort logistics. If you need a hand, our concierge team is happy to
          help.
        </p>

        <nav className="mt-8 border border-slate-200 bg-white">
          <div className="grid gap-3 px-4 py-4 text-sm text-slate-700 sm:grid-cols-2">
            {FAQ_CATEGORIES.map((category) => {
              const isActive = activeCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-expanded={isActive}
                  aria-controls={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`flex w-full cursor-pointer items-center justify-between border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                    isActive
                      ? "border-slate-300 bg-slate-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{category.title}</span>
                  <Plus
                    className={`h-4 w-4 text-slate-500 transition-transform duration-200 ease-out ${
                      isActive ? "rotate-45" : "rotate-0"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </nav>
      </section>

      <section className="mx-auto max-w-5xl space-y-12 px-6 pb-16">
        {FAQ_CATEGORIES.map((category) => (
          <section key={category.id} id={category.id} className="scroll-mt-28 space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{category.title}</h2>
              {category.blurb && (
                <p className="mt-2 text-sm text-slate-600">{category.blurb}</p>
              )}
            </div>
            <FaqAccordion categoryId={category.id} items={category.items} />
          </section>
        ))}
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </main>
  );
}
