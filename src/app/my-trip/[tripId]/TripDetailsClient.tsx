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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        onClick={handleCopy}
        disabled={!canCopy}
        aria-label={confirmationNumber ? 'Copy confirmation number' : 'Pending'}
        className="font-mono text-lg font-semibold tracking-[0.08em] text-[#0B1B3A] transition hover:text-[#0B1B3A]/85 disabled:cursor-not-allowed disabled:text-[#0B1B3A]/40"
      >
        {confirmationNumber ?? 'Pending'}
      </button>
      {canCopy ? (
        <button
          type="button"
          onClick={handleCopy}
          className="border-b border-[#C49A3A] pb-0.5 text-sm font-semibold text-[#0B1B3A]/72 transition hover:border-[#0B1B3A] hover:text-[#0B1B3A]"
        >
          Copy
        </button>
      ) : null}
      <div className="h-5 text-sm text-[#0B1B3A]/50" aria-live="polite">{copied ? 'Copied' : ''}</div>
    </div>
  );
}

export type MonetizationItem = {
  title: string;
  body: string;
  cta: string;
  href: string;
  bgImageUrl: string;
  isAvailable?: boolean;
};

export function ComingSoonOverlay({
  message = "This feature is currently in development and will be available soon.",
}: {
  message?: string;
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-30 bg-[#071a33]/10" aria-hidden="true" />
      <div className="pointer-events-none absolute right-4 top-4 z-40 border border-white/24 bg-[#071a33]/72 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/82 backdrop-blur-sm">
        Coming Soon
      </div>
      <div
        role="tooltip"
        className="pointer-events-none absolute inset-x-4 bottom-4 z-40 rounded-xl border border-[#0B1B3A]/12 bg-white/96 px-3 py-2 text-xs leading-relaxed text-[#0B1B3A]/75 opacity-0 shadow-[0_16px_34px_rgba(11,27,58,0.14)] transition-opacity duration-200 group-hover/soon:opacity-100"
      >
        {message}
      </div>
    </>
  );
}

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
            title={
              item.isAvailable === false
                ? "This feature is currently in development and will be available soon."
                : undefined
            }
            aria-disabled={item.isAvailable === false}
            className={`group/soon relative min-w-[260px] snap-start overflow-hidden rounded-xl border border-[#0B1B3A]/10 bg-white transition-transform duration-200 ${
              item.isAvailable === false
                ? "cursor-default opacity-75"
                : "hover:-translate-y-1 hover:shadow-lg hover:shadow-[#0B1B3A]/15"
            }`}
          >
            {item.isAvailable === false ? <ComingSoonOverlay /> : null}
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

                  {item.isAvailable === false ? (
                    <span className="mt-4 inline-flex items-center rounded-full border border-white/20 px-2.5 py-1 text-[0.7rem] font-semibold text-white/70">
                      {item.cta}
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      className="mt-4 inline-flex items-center rounded-full border border-white/30 px-2.5 py-1 text-[0.7rem] font-semibold text-white/90 transition hover:border-white/50 hover:text-white"
                    >
                      {item.cta}
                    </Link>
                  )}
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
