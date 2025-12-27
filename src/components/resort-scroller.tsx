import Image from "next/image";
import Link from "next/link";

type ResortScrollerProps = {
  resorts: {
    slug: string;
    name: string;
    location: string | null;
    tags: string[];
    pointsRange: string | null;
    cardImage: string | null;
  }[];
};

export function ResortScroller({ resorts }: ResortScrollerProps) {
  if (!resorts.length) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-6 text-sm text-white/80">
        Our concierge team is curating featured resorts. Check back soon!
      </div>
    );
  }

  return (
    <div
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:gap-6"
      aria-roledescription="carousel"
    >
      {resorts.map((resort) => {
        const image = resort.cardImage ?? "/images/castle-hero.png";
        const isRelative = Boolean(image && image.startsWith("/"));
        return (
          <Link
            key={resort.slug}
            href={`/resorts/${resort.slug}#gallery`}
            className="group relative h-[220px] w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-[2px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:shadow-[0_16px_42px_rgba(8,12,30,0.32)] sm:w-[320px]"
            aria-label={resort.name}
          >
            {isRelative ? (
              <Image
                src={image}
                alt={resort.name}
                fill
                sizes="(max-width:640px) 280px, 320px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            ) : (
              <div
                aria-label={resort.name}
                className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.04]"
                style={{
                  backgroundImage: `url(${image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,21,49,0.78)] via-[rgba(15,21,49,0.18)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <h3 className="text-lg font-semibold leading-tight">{resort.name}</h3>
              <p className="text-xs leading-5 opacity-85">{resort.location ?? "Disney Destinations"}</p>
              {resort.tags.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {resort.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium backdrop-blur"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {resort.pointsRange ? (
                <span className="mt-2 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold">
                  {resort.pointsRange}
                </span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
