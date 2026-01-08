"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { FaqItem } from "@/components/faqData";

type FaqAccordionProps = {
  categoryId: string;
  items: FaqItem[];
};

export default function FaqAccordion({ categoryId, items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const ids = useMemo(
    () =>
      items.map((_, index) => ({
        buttonId: `${categoryId}-button-${index}`,
        panelId: `${categoryId}-panel-${index}`,
      })),
    [categoryId, items],
  );

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const { buttonId, panelId } = ids[index];
        return (
          <div
            key={buttonId}
            className="rounded-md border border-slate-200 bg-white transition-shadow hover:shadow-[0_10px_30px_rgba(15,33,72,0.08)]"
          >
            <button
              type="button"
              id={buttonId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
                aria-hidden="true"
              />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 text-sm leading-6 text-slate-600">
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
