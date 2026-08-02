type OwnerPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  summary?: string;
};

export default function OwnerPageHeader({ eyebrow, title, description, summary }: OwnerPageHeaderProps) {
  return (
    <header className="space-y-3">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9A7A35]">{eyebrow}</p>
      ) : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#10224A] md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#667085]">{description}</p>
        </div>
        {summary ? (
          <p className="rounded-full border border-[#E7E7E4] bg-white px-4 py-2 text-sm font-medium text-[#10224A]">
            {summary}
          </p>
        ) : null}
      </div>
    </header>
  );
}
