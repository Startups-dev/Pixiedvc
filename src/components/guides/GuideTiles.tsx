import Link from "next/link";

type KeyTakeawaysProps = {
  items: string[];
};

type DecisionTileProps = {
  goodFit: string[];
  betterIf: string[];
};

type NextStepProps = {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

type CalloutProps = {
  variant: "concierge" | "warning" | "quick";
  label: string;
  children: React.ReactNode;
};

const calloutStyles: Record<CalloutProps["variant"], string> = {
  concierge: "border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.04] text-[#0B1B3A]/80",
  warning: "border-amber-200/60 bg-amber-100/60 text-amber-900/80",
  quick: "border-slate-200/70 bg-slate-100/70 text-slate-700",
};

export function KeyTakeaways({ items }: KeyTakeawaysProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Key takeaways</p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
        {items.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function DecisionTile({ goodFit, betterIf }: DecisionTileProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Good fit if…</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            {goodFit.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Better if you…</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            {betterIf.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function NextStep({ primaryLabel, primaryHref, secondaryLabel, secondaryHref }: NextStepProps) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Next step</p>
      <div className="mt-4 space-y-3 text-sm font-medium text-slate-700">
        <Link href={primaryHref} className="block transition hover:text-brand">
          {primaryLabel}
        </Link>
        <Link href={secondaryHref} className="block text-slate-500 transition hover:text-brand">
          {secondaryLabel}
        </Link>
      </div>
    </div>
  );
}

export function GuideCallout({ variant, label, children }: CalloutProps) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 shadow-[0_12px_26px_rgba(15,23,42,0.05)] ${calloutStyles[variant]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em]">{label}</p>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </div>
  );
}
