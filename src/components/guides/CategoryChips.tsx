"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Props = {
  primary: string[];
  secondary: string[];
};

export default function CategoryChips({ primary, secondary }: Props) {
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "";
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const primaryChips = useMemo(
    () => primary.map((label) => ({ label, slug: slugify(label) })),
    [primary],
  );
  const secondaryChips = useMemo(
    () => secondary.map((label) => ({ label, slug: slugify(label) })),
    [secondary],
  );
  const [showMore, setShowMore] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/guides"
        className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] transition ${
          active === ""
            ? "border-ink/20 bg-white text-ink"
            : "border-ink/5 bg-white/60 text-ink/60 hover:bg-white/80"
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20`}
      >
        All
      </Link>
      {primaryChips.map((category) => (
        <Link
          key={category.slug}
          href={`/guides?category=${category.slug}`}
          className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] transition ${
            active === category.slug
              ? "border-ink/20 bg-white text-ink"
              : "border-ink/5 bg-white/60 text-ink/60 hover:bg-white/80"
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20`}
        >
          {category.label}
        </Link>
      ))}
      {showMore
        ? secondaryChips.map((category) => (
            <Link
              key={category.slug}
              href={`/guides?category=${category.slug}`}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] transition ${
                active === category.slug
                  ? "border-ink/20 bg-white text-ink"
                  : "border-ink/5 bg-white/60 text-ink/60 hover:bg-white/80"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20`}
            >
              {category.label}
            </Link>
          ))
        : null}
      {secondary.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowMore((prev) => !prev)}
          className="text-xs font-medium text-ink/60"
        >
          {showMore ? "Fewer guides" : "More planning guides →"}
        </button>
      ) : null}
    </div>
  );
}
