"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type LayoutImage = {
  name: string;
  url: string;
};

type VillaLayoutsCarouselProps = {
  layouts: LayoutImage[];
  resortName: string;
};

export default function VillaLayoutsCarousel({ layouts, resortName }: VillaLayoutsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [savedScrollLeft, setSavedScrollLeft] = useState(0);

  useEffect(() => {
    if (activeIndex === null) {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = savedScrollLeft;
      }
      lastFocusRef.current?.focus();
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, savedScrollLeft]);

  const handleOpen = (index: number, element: HTMLElement | null) => {
    setSavedScrollLeft(scrollRef.current?.scrollLeft ?? 0);
    lastFocusRef.current = element;
    setActiveIndex(index);
  };

  const handleScroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;
    const delta = direction === "left" ? -320 : 320;
    container.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (layouts.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-[#0F2148]/10 bg-white/70 p-6 text-sm text-[#0F2148]/70">
          Layouts coming soon.
        </div>
      </section>
    );
  }

  const activeLayout = activeIndex !== null ? layouts[activeIndex] : null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#0F2148]/60">Villa Layouts</p>
          <h2 className="mt-2 text-2xl font-serif text-[#0F2148]">Villa Layouts</h2>
          <p className="mt-2 text-sm text-[#0F2148]/70">
            Browse room configurations for {resortName}.
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            className="rounded-full border border-[#0F2148]/20 px-3 py-2 text-xs font-semibold text-[#0F2148] transition hover:border-[#0F2148]/40"
            aria-label="Scroll layouts left"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            className="rounded-full border border-[#0F2148]/20 px-3 py-2 text-xs font-semibold text-[#0F2148] transition hover:border-[#0F2148]/40"
            aria-label="Scroll layouts right"
          >
            Next
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
      >
        {layouts.map((layout, index) => (
          <button
            key={layout.name}
            type="button"
            onClick={(event) => handleOpen(index, event.currentTarget)}
            className="flex w-44 flex-shrink-0 snap-start flex-col gap-2 rounded-md border border-[#0F2148]/15 bg-white/80 p-3 text-left transition hover:shadow-[0_12px_30px_rgba(15,33,72,0.12)]"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-slate-100">
              <Image
                src={layout.url}
                alt={`${resortName} layout ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 70vw, 240px"
              />
            </div>
            <span className="text-xs font-medium text-[#0F2148]/80">
              {layout.name.replace(/\.[^/.]+$/, "")}
            </span>
          </button>
        ))}
      </div>

      {activeLayout ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setActiveIndex(null);
            }
          }}
        >
          <div className="relative max-h-[85vh] max-w-[90vw]">
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              ref={closeButtonRef}
              className="absolute -right-4 -top-4 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-[#0F2148] shadow"
            >
              Close
            </button>
            <div className="relative h-[70vh] w-[90vw] max-w-5xl">
              <Image
                src={activeLayout.url}
                alt={`${resortName} layout enlarged`}
                fill
                className="object-contain"
                sizes="90vw"
                priority
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
