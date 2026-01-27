import Link from "next/link";

import { Button, Card } from "@pixiedvc/design-system";

type ResourceItem = {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

export default function GuideResources({ items }: { items: ResourceItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Resources</p>
        <h3 className="mt-2 font-display text-xl text-ink">Owner-ready documents</h3>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-100 bg-white/80 p-4 text-sm text-slate-600"
          >
            <p className="font-semibold text-ink">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">{item.description}</p>
            <Button asChild variant="ghost" className="mt-3 px-3 py-1 text-xs">
              <Link href={item.href}>{item.actionLabel}</Link>
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
