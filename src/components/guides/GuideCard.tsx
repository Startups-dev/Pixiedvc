import Image from "next/image";
import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import type { GuideMeta } from "@/lib/guides";
import { formatGuideDate } from "@/lib/guides";

export default function GuideCard({ guide }: { guide: GuideMeta }) {
  return (
    <Card className="overflow-hidden p-0">
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
      <div className="space-y-4 p-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
            <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">{guide.category}</span>
            <span>{formatGuideDate(guide.publishedAt)}</span>
          </div>
          <h3 className="font-display text-xl text-ink">
            <Link href={`/guides/${guide.slug}`} className="transition hover:text-brand">
              {guide.title}
            </Link>
          </h3>
          <p className="text-sm text-muted">{guide.excerpt}</p>
        </div>
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
          <span>Read in ~{guide.readingTime} min</span>
          <Link href={`/guides/${guide.slug}`} className="font-semibold text-brand hover:text-brand/80">
            Read guide
          </Link>
        </div>
      </div>
    </Card>
  );
}
