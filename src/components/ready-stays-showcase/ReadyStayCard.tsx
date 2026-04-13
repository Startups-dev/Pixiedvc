import Link from "next/link";

import { resolveReadyStaySignals } from "@/lib/ready-stays/signal-engine";
import type { ReadyStayShowcaseItem } from "@/lib/ready-stays/showcase-mock";

type ReadyStayCardProps = {
  item: ReadyStayShowcaseItem;
  compact?: boolean;
};

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Dates to be announced";
  }

  const startText = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endText = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return `${startText}-${endText}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ReadyStayCard({ item, compact = false }: ReadyStayCardProps) {
  const nightly = Math.round(item.totalPriceUsd / Math.max(item.nights, 1));
  const originalNightly = item.originalTotalPriceUsd
    ? Math.round(item.originalTotalPriceUsd / Math.max(item.nights, 1))
    : null;
  const destination = item.href?.trim() || `/ready-stays/${item.id}`;
  const isValidDetailDestination = destination.startsWith("/ready-stays/") && destination !== "/ready-stays";
  const safeDestination = isValidDetailDestination ? destination : "/ready-stays";
  const signals = resolveReadyStaySignals({
    checkIn: item.startDate,
    totalPriceCents: Math.round(item.totalPriceUsd * 100),
  });

  return (
    <Link
      href={safeDestination}
      aria-label={`View ready stay: ${item.title}`}
      className={`group relative overflow-hidden rounded-3xl border border-white/20 shadow-[0_16px_45px_rgba(15,23,42,0.2)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.28)] ${
        compact ? "min-h-[220px]" : "min-h-[460px]"
      }`}
    >
      <img
        src={item.imageUrl}
        alt={`${item.resortName} ready stay`}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/26 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <div
          className={`relative overflow-hidden rounded-2xl border border-white/20 ring-1 ring-white/10 bg-black/40 p-4 shadow-lg shadow-black/20 backdrop-blur-sm transition duration-300 group-hover:border-white/30 sm:p-5 ${
            compact ? "max-w-[88%]" : "max-w-[80%]"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/14 to-black/28" />
          {signals.primary ? (
            <div className="relative z-10 mb-3">
              <span
                className={`inline-flex shrink-0 items-center rounded-full border border-white/35 bg-white/10 font-semibold uppercase leading-none !text-white ${
                  compact
                    ? "px-2.5 py-1 text-[10px] tracking-[0.14em] whitespace-nowrap"
                    : "px-3 py-1 text-[11px] tracking-[0.18em] whitespace-nowrap"
                }`}
              >
                {signals.primary.label}
              </span>
            </div>
          ) : null}

          <h3 className="relative z-10 text-xl font-semibold !text-white drop-shadow-[0_2px_6px_rgba(2,6,23,0.85)]">
            {item.resortName} • {item.nights} {item.nights === 1 ? "Night" : "Nights"}
          </h3>
          <p className="relative z-10 mt-3 text-sm !text-white/90 drop-shadow-[0_1px_3px_rgba(2,6,23,0.7)]">
            {formatDateRange(item.startDate, item.endDate)} • Sleeps {item.sleeps}
          </p>

          <div className="relative z-10 mt-6 space-y-1.5">
            {item.originalTotalPriceUsd ? (
              <p className="text-sm !text-white/65 line-through">
                {formatCurrency(item.originalTotalPriceUsd)}
                {originalNightly ? ` • ${formatCurrency(originalNightly)}/night` : ""}
              </p>
            ) : null}
            <p className="text-3xl font-semibold !text-white">{formatCurrency(item.totalPriceUsd)}</p>
            <p className="text-sm !text-white/80">{formatCurrency(nightly)}/night</p>
            {item.originalTotalPriceUsd ? (
              <span className="inline-flex rounded-full bg-emerald-100/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-900">
                Price reduced
              </span>
            ) : null}
          </div>

          <span className="relative z-10 mt-6 inline-flex items-center rounded-full border border-white/70 bg-white/22 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] !text-white transition duration-300 hover:-translate-y-0.5 hover:border-white hover:bg-white/30 group-hover:border-white group-hover:bg-white/28">
            Book Instantly
          </span>
        </div>
      </div>
      <div className="sr-only">
        <span>{item.badge}</span>
        <span>{item.resortName}</span>
      </div>
    </Link>
  );
}
