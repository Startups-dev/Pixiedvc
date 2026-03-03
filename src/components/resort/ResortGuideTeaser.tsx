import Link from "next/link";

type ResortGuideTeaserProps = {
  resortSlug: string;
};

export default function ResortGuideTeaser({ resortSlug }: ResortGuideTeaserProps) {
  return (
    <section className="mx-auto mt-16 max-w-6xl px-6">
      <div className="rounded-3xl border border-[#0F2148]/10 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <h2 className="text-4xl font-semibold text-[#0F2148] md:text-5xl">Insider Guide</h2>
        <p className="mt-4 max-w-3xl text-base font-medium leading-relaxed text-[#0F2148]/80">
          Discover what makes this resort special, who it&apos;s best for, and the hidden advantages most guests
          overlook.
        </p>
        <Link
          href={`/guides/${resortSlug}`}
          className="mt-6 inline-flex items-center rounded-full bg-[#0F2148] px-5 py-2 text-sm font-semibold !text-white transition hover:bg-[#1A2F66]"
        >
          Read the Full Guide →
        </Link>
      </div>
    </section>
  );
}
