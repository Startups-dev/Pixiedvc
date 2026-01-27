import Link from "next/link";

import { Button } from "@pixiedvc/design-system";

type GuideHeaderProps = {
  title: string;
  subtitle: string;
  category?: string;
  updatedLabel: string;
};

export default function GuideHeader({ title, subtitle, category, updatedLabel }: GuideHeaderProps) {
  return (
    <header className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Knowledge Hub</p>
          <h1 className="font-display text-4xl text-ink sm:text-5xl">{title}</h1>
          <p className="max-w-2xl text-lg text-muted">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted">
            {category ? (
              <span className="rounded-full bg-brand/10 px-3 py-1 text-brand">{category}</span>
            ) : null}
            <span>{updatedLabel}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/contact?role=Owner">Contact Concierge</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/guides">Back to Guides</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
