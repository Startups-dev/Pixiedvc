"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { FaqItem } from "@/components/faqData";

type FaqAccordionProps = {
  categoryId: string;
  items: FaqItem[];
};

export default function FaqAccordion({ categoryId, items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(items.length ? 0 : null);

  const ids = useMemo(
    () =>
      items.map((_, index) => ({
        buttonId: `${categoryId}-button-${index}`,
        panelId: `${categoryId}-panel-${index}`,
      })),
    [categoryId, items],
  );

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const { buttonId, panelId } = ids[index];
        return (
          <div
            key={buttonId}
            className={`overflow-hidden rounded-[1.75rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.98))] transition-[transform,box-shadow,border-color] duration-300 ${
              isOpen
                ? "border-[#c7d5f1] shadow-[0_22px_48px_rgba(35,58,112,0.12)]"
                : "border-[#dde6f5] shadow-[0_14px_34px_rgba(15,33,72,0.05)] hover:border-[#d1dbef] hover:shadow-[0_22px_52px_rgba(15,33,72,0.08)]"
            }`}
          >
            <button
              type="button"
              id={buttonId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-5 px-7 py-6 text-left text-[17px] font-semibold text-[#10224b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8aa0d9]/40 focus-visible:ring-offset-2"
            >
              <span className="max-w-4xl leading-8">{item.question}</span>
              <ChevronDown
                className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
                  isOpen ? "text-[#314f98]" : "text-[#65789f]"
                } ${
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
                <div
                  className={`max-w-4xl px-7 pb-8 pt-3 text-[16px] leading-8 text-[#4b5f87] ${
                    isOpen ? "border-t border-[#dce6f8] bg-[linear-gradient(180deg,rgba(248,250,255,0.78),rgba(255,255,255,0.98))]" : "border-t border-[#e7ecf7]"
                  }`}
                >
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
