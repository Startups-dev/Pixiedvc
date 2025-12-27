import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/50 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xl font-display text-ink">PixieDVC</p>
          <p className="mt-2 text-sm text-muted">
            Disney magic meets boutique tech. Crafted with wonder in Orlando & beyond.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <Link href="/our-story" className="transition hover:text-brand">
            Our Story
          </Link>
          <Link href="#" className="transition hover:text-brand">
            Privacy
          </Link>
          <Link href="#" className="transition hover:text-brand">
            Accessibility
          </Link>
          <Link href="#" className="transition hover:text-brand">
            Careers
          </Link>
          <Link href="#" className="transition hover:text-brand">
            Instagram
          </Link>
          <Link href="#" className="transition hover:text-brand">
            Threads
          </Link>
        </div>
      </div>
    </footer>
  );
}
