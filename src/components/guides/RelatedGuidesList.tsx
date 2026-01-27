import Link from "next/link";

import type { GuideMeta } from "@/lib/guides";
import { Card } from "@pixiedvc/design-system";

export default function RelatedGuidesList({ guides }: { guides: GuideMeta[] }) {
  if (guides.length === 0) return null;

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Related Guides</p>
        <h3 className="mt-2 font-display text-xl text-ink">Keep exploring</h3>
      </div>
      <div className="space-y-4">
        {guides.map((guide) => (
          <div key={guide.slug} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
            <p className="text-sm font-semibold text-ink">{guide.title}</p>
            <p className="mt-1 text-xs text-slate-500">{guide.excerpt}</p>
            <Link href={`/guides/${guide.slug}`} className="mt-2 inline-flex text-xs font-semibold text-brand">
              Read →
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
