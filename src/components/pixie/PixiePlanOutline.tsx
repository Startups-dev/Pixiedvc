type OutlineShape = {
  outline?: string[];
  warnings?: string[];
};

function toOutline(value: unknown): OutlineShape {
  if (!value || typeof value !== "object") return {};
  const record = value as OutlineShape;
  return {
    outline: Array.isArray(record.outline) ? record.outline.filter((item): item is string => typeof item === "string") : [],
    warnings: Array.isArray(record.warnings) ? record.warnings.filter((item): item is string => typeof item === "string") : [],
  };
}

export default function PixiePlanOutline({ outline }: { outline: unknown }) {
  const parsed = toOutline(outline);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Plan outline</h2>
      {parsed.outline?.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {parsed.outline.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-500">Hara will draft a simple outline as your trip details become clearer.</p>
      )}
      <p className="mt-3 text-[11px] leading-5 text-slate-500">Outline guidance does not include live Disney operating data, ticket prices, dining availability, or Lightning Lane policy.</p>
    </section>
  );
}
