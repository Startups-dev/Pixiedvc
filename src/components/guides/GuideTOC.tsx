import Link from "next/link";

import type { GuideTocItem } from "@/lib/guides";

export default function GuideTOC({ items }: { items: GuideTocItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Table of contents</p>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {items.map((item) => (
          <li key={`${item.id}-${item.title}`} className={item.level === 3 ? "pl-3 text-slate-500" : ""}>
            <Link href={`#${item.id}`} className="transition hover:text-brand">
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
