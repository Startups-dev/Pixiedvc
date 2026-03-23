import Link from "next/link";

import ReadyStayCard from "@/components/ready-stays-showcase/ReadyStayCard";
import type { ReadyStayShowcaseItem } from "@/lib/ready-stays/showcase-mock";

type ReadyStaysSectionProps = {
  title: string;
  subtitle: string;
  items: ReadyStayShowcaseItem[];
  layout?: "editorial" | "row";
  className?: string;
};

export default function ReadyStaysSection({
  title,
  subtitle,
  items,
  layout = "editorial",
  className = "",
}: ReadyStaysSectionProps) {
  if (!items.length) {
    return null;
  }

  const [lead, ...rest] = items;

  return (
    <section className={`mx-auto max-w-6xl px-6 py-14 ${className}`.trim()}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[#0F2148]/60">ReadyStays</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#0F2148] sm:text-4xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm text-[#0F2148]/70">{subtitle}</p>
        </div>
        <Link
          href="/ready-stays"
          className="inline-flex items-center rounded-full border border-[#0F2148]/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0F2148] transition hover:border-[#0F2148]/35 hover:bg-[#f8faff]"
        >
          View all ReadyStays
        </Link>
      </div>

      {layout === "row" ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 3).map((item) => (
            <ReadyStayCard key={item.id} item={item} compact />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <ReadyStayCard item={lead} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            {rest.slice(0, 2).map((item) => (
              <ReadyStayCard key={item.id} item={item} compact />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
