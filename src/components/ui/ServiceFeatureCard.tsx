import Link from "next/link";
import type { ReactNode } from "react";

export type ServiceFeatureCardProps = {
  title: string;
  description: string;
  href?: string; // if missing OR comingSoon=true => disabled
  ctaLabel?: string; // default: "Explore"
  badge?: string; // small label pill
  comingSoon?: boolean; // shows "Coming soon" and disables link
  bgImageUrl?: string; // background image for top area (optional)
  icon?: ReactNode; // optional
  className?: string;
};

export function ServiceFeatureCard({
  title,
  description,
  href,
  ctaLabel = "Explore",
  badge,
  comingSoon,
  bgImageUrl,
  icon,
  className,
}: ServiceFeatureCardProps) {
  const isDisabled = Boolean(comingSoon || !href);

  const baseClassName = [
    "rounded-2xl border border-[#0B1B3A]/10 bg-white",
    "transition-transform duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1B3A]/40",
    isDisabled
      ? "opacity-70"
      : "hover:-translate-y-1 hover:shadow-lg hover:shadow-[#0B1B3A]/15",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl">
      {bgImageUrl ? (
        <div className="relative h-[140px] w-full bg-[#0B1B3A]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${bgImageUrl}')` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(11,27,58,0.45) 0%, rgba(11,27,58,0.15) 55%, rgba(11,27,58,0.00) 100%)",
            }}
            aria-hidden="true"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[#0B1B3A]">{title}</h3>
            <p className="mt-2 text-sm text-[#0B1B3A]/70">{description}</p>
          </div>
          {icon ? <div className="text-[#0B1B3A]/70">{icon}</div> : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          {badge ? (
            <span className="inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#0B1B3A]/70">
              {badge}
            </span>
          ) : (
            <span />
          )}

          <span className="inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-3 py-1 text-xs font-semibold text-[#0B1B3A]/80">
            {isDisabled ? "Coming soon" : ctaLabel}
          </span>
        </div>
      </div>
    </div>
  );

  if (isDisabled) {
    return <div className={baseClassName}>{inner}</div>;
  }

  return (
    <Link href={href as string} className={baseClassName} aria-label={title}>
      {inner}
    </Link>
  );
}

