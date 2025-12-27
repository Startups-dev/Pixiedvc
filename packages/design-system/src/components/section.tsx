export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-3">
      {eyebrow ? (
        <p className="text-xs uppercase tracking-[0.25em] text-muted">{eyebrow}</p>
      ) : null}
      <h2 className="font-display text-3xl text-ink sm:text-4xl">{title}</h2>
      {description ? <p className="max-w-2xl text-base text-muted">{description}</p> : null}
    </div>
  );
}
