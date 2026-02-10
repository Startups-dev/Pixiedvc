"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type GuideLink = {
  title: string;
  href: string;
};

type GuideSection = {
  title: string;
  guides: GuideLink[];
};

type GuideNavDropdownsProps = {
  sections: GuideSection[];
};

export default function GuideNavDropdowns({ sections }: GuideNavDropdownsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      setOpenIndex(null);
      closeTimer.current = null;
    }, 120);
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      {sections.map((section, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={section.title}
            className="relative"
            onMouseEnter={() => {
              clearCloseTimer();
              setOpenIndex(index);
            }}
            onMouseLeave={scheduleClose}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setOpenIndex(null);
              }
            }}
          >
            <button
              type="button"
              onClick={() => setOpenIndex((current) => (current === index ? null : index))}
              onFocus={() => {
                clearCloseTimer();
                setOpenIndex(index);
              }}
              aria-expanded={isOpen}
              className="flex items-center gap-2 text-sm font-semibold text-ink transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
            >
              <span>{section.title}</span>
              <span className="text-xs text-ink/50">▾</span>
            </button>

            {isOpen ? (
              <div
                className="absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
                onMouseEnter={clearCloseTimer}
                onMouseLeave={scheduleClose}
              >
                <div className="space-y-2">
                  {section.guides.map((guide) => (
                    <Link
                      key={guide.href}
                      href={guide.href}
                      className="block text-sm text-slate-700 transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
                    >
                      {guide.title}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
