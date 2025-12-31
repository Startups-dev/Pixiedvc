"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useReferral } from "@/hooks/useReferral";
import { withRef } from "@/lib/referral";

type Props = {
  name: string;
  slug: string;
  image: string;
  pros: string[];
  pickHref: string;
  detailsHref: string;
};

export default function ResortChoiceCard({
  name,
  slug,
  image,
  pros,
  pickHref,
  detailsHref,
}: Props) {
  const router = useRouter();
  const { ref } = useReferral();
  const isRelative = image.startsWith("/");
  const resolvedPickHref = withRef(pickHref, ref);
  const resolvedDetailsHref = withRef(detailsHref, ref);

  function handleCardClick() {
    router.push(resolvedPickHref);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push(resolvedPickHref);
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border border-ink/20 bg-white transition hover:border-ink/35 hover:shadow-[0_12px_32px_rgba(15,33,72,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
      aria-label={`Pick ${name}`}
    >
      <div className="relative h-40 w-full overflow-hidden bg-slate-100">
        {isRelative ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div
            aria-label={name}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
      </div>
      <div className="flex h-full flex-col gap-4 p-5">
        <h2 className="text-xl font-semibold text-ink">{name}</h2>
        <ul className="space-y-2 text-sm text-ink/80">
          {pros.map((pro) => (
            <li key={pro} className="flex items-start gap-2 leading-snug">
              <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-ink/30 text-[10px] text-ink/60">
                ✓
              </span>
              <span>{pro}</span>
            </li>
          ))}
        </ul>
        <Link
          href={resolvedDetailsHref}
          className="text-sm text-ink/60 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          More details →
        </Link>
        <div className="mt-auto">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              router.push(resolvedPickHref);
            }}
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white transition hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
          >
            Pick this resort
          </button>
        </div>
      </div>
    </div>
  );
}
