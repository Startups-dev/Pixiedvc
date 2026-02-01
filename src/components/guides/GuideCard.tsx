import Image from "next/image";
import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import type { GuideMeta } from "@/lib/guides";
import { formatGuideDate } from "@/lib/guides";

export default function GuideCard({ guide }: { guide: GuideMeta }) {
  return (
    <Card className="group overflow-hidden p-0 transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(11,27,58,0.16)]">
      {guide.heroImage ? (
        <div className="relative h-40 w-full">
          <Image
            src={guide.heroImage}
            alt={guide.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="relative space-y-5 p-6 pl-7">
        <span
          aria-hidden="true"
          className="absolute left-6 top-[88px] h-[45%] w-[2px] rounded-full bg-[#0B1B3A]/25"
        />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0B1B3A]/55 transition duration-200 ease-out group-hover:text-[#0B1B3A]/70">
              {guide.category}
            </span>
            <span>{formatGuideDate(guide.publishedAt)}</span>
          </div>
          <h3 className="font-display text-[22px] font-bold leading-tight text-[#0B1B3A]">
            <Link href={`/guides/${guide.slug}`} className="transition hover:text-brand">
              {guide.title}
            </Link>
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-[#0B1B3A]/55">{guide.excerpt}</p>
        </div>
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
          <span>Read in ~{guide.readingTime} min</span>
          <Link
            href={`/guides/${guide.slug}`}
            className="font-semibold tracking-[0.24em] text-brand transition duration-200 ease-out group-hover:underline"
          >
            Read guide
          </Link>
        </div>
      </div>
    </Card>
  );
}
