'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

export function ConfirmationCopy({ confirmationNumber }: { confirmationNumber?: string | null }) {
  const [copied, setCopied] = useState(false);
  const canCopy = Boolean(confirmationNumber);

  const handleCopy = async () => {
    if (!confirmationNumber) return;
    try {
      await navigator.clipboard.writeText(confirmationNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        disabled={!canCopy}
        aria-label={confirmationNumber ? 'Copy confirmation number' : 'Pending'}
        className="text-3xl font-semibold tracking-[0.12em] text-[#0B1B3A] transition hover:text-[#0B1B3A]/85 disabled:cursor-not-allowed disabled:text-[#0B1B3A]/40"
      >
        {confirmationNumber ?? 'Pending'}
      </button>
      {canCopy ? (
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-[#0B1B3A]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B1B3A]/70 hover:border-[#0B1B3A]/35 hover:text-[#0B1B3A]"
        >
          Copy
        </button>
      ) : null}
      <div className="h-4 text-[0.65rem] uppercase tracking-[0.2em] text-[#0B1B3A]/50">{copied ? 'Copied' : ''}</div>
    </div>
  );
}

export type MonetizationItem = {
  title: string;
  body: string;
  cta: string;
  href: string;
  bgImageUrl: string;
};

export function MonetizationCarousel({ items }: { items: MonetizationItem[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = (offset: number) => {
    scrollerRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#0B1B3A]/85">Enhance your stay</h2>
          <p className="mt-1 text-xs text-[#0B1B3A]/55">Concierge recommendations</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-260)}
            className="inline-flex h-8 w-8 items-center justify-center border border-[#0B1B3A]/15 text-sm font-semibold text-[#0B1B3A]/80 transition hover:border-[#0B1B3A]/35 hover:text-[#0B1B3A]"
            aria-label="Scroll left"
          >
            {'<'}
          </button>
          <button
            type="button"
            onClick={() => scrollBy(260)}
            className="inline-flex h-8 w-8 items-center justify-center border border-[#0B1B3A]/15 text-sm font-semibold text-[#0B1B3A]/80 transition hover:border-[#0B1B3A]/35 hover:text-[#0B1B3A]"
            aria-label="Scroll right"
          >
            {'>'}
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory"
      >
        {items.map((item) => (
          <div
            key={item.title}
            className="group relative min-w-[260px] snap-start overflow-hidden rounded-xl border border-[#0B1B3A]/10 bg-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#0B1B3A]/15"
          >
            <div className="relative flex min-h-[320px] flex-col">
              {/* Top navy block */}
              <div className="relative overflow-hidden rounded-t-2xl bg-[#071a33]">
                <div
                  className="absolute inset-0 z-10 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(140% 120% at 0% 0%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0.00) 65%)',
                  }}
                />
                <div className="relative z-20 flex w-full flex-col justify-between px-5 pb-4 pt-5 text-white">
                  <div>
                    <div className="text-base font-semibold text-white">{item.title}</div>
                    <p className="mt-2 text-xs leading-relaxed text-white/75">{item.body}</p>
                  </div>

                  <Link
                    href={item.href}
                    className="mt-4 inline-flex items-center rounded-full border border-white/30 px-2.5 py-1 text-[0.7rem] font-semibold text-white/90 transition hover:border-white/50 hover:text-white"
                  >
                    {item.cta}
                  </Link>
                </div>
              </div>

              {/* Image block */}
              <div className="relative h-[180px] w-full">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
                  style={{ backgroundImage: `url('${item.bgImageUrl}')` }}
                  aria-hidden="true"
                />
                <div
                  className="absolute -top-[5px] inset-x-0 bottom-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(7,26,51,0.90) 0%, rgba(7,26,51,0.70) 35%, rgba(7,26,51,0.32) 55%, rgba(7,26,51,0.00) 70%)',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
