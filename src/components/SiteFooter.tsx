import Link from "next/link";

const DISCLAIMER =
  "PixieDVC is an independent vacation rental platform and is not affiliated with, sponsored by, or endorsed by The Walt Disney Company or Disney Vacation Club®. Disney trademarks and resort names are used for informational purposes only and remain the property of their respective owners.";

const COMPANY_LINKS = [
  { label: "About", href: "/get-to-know" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
];

const LEGAL_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Refund / Cancellation", href: "/policies" },
];

const EXPLORE_LINKS = [
  { label: "Resorts", href: "/resorts" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Owners", href: "/owners" },
  { label: "Guests", href: "/guests" },
];

const linkClassName =
  "text-sm text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F2148]";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#0F2148] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <p className="text-xl font-semibold tracking-tight">PixieDVC</p>
            <p className="text-sm text-white/70">Disney Vacation Club rentals reimagined.</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Company</p>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Legal</p>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Explore</p>
            <ul className="space-y-2">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClassName}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="max-w-4xl text-xs leading-5 text-white/50">{DISCLAIMER}</p>
          <p className="mt-3 text-xs text-white/50">© {year} PixieDVC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
