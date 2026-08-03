import Link from "next/link";
import Image from "next/image";

const DISCLAIMER =
  "HannaDVC is an independent vacation rental platform and is not affiliated with, sponsored by, or endorsed by The Walt Disney Company or Disney Vacation Club®. Disney trademarks and resort names are used for informational purposes only and remain the property of their respective owners.";

const COMPANY_LINKS = [
  { label: "Our Story", href: "/our-story" },
  { label: "Our Approach", href: "/our-approach" },
  { label: "About Us", href: "/about-us" },
];

const SUPPORT_LINKS = [
  { label: "Contact Concierge", href: "/contact" },
  { label: "FAQ", href: "/faq" },
];

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
];

const EXPLORE_LINKS = [
  { label: "Resorts", href: "/resorts" },
  { label: "How It Works", href: "/guides/how-renting-dvc-points-works" },
  { label: "Ready Stays", href: "/ready-stays" },
  { label: "Guides", href: "/guides" },
  { label: "For Owners", href: "/owners" },
];

const BOOKING_POLICY_LINKS = [
  { label: "Cancellation Policy", href: "/guests/cancellation-policy" },
  { label: "Deferred Cancellation Policy", href: "/policies/deferred-cancellation" },
  { label: "Guest Policies", href: "/guests/policies" },
];

const PARTNER_LINKS = [
  { label: "Partners", href: "/partners" },
  { label: "Affiliate Program", href: "/partners/affiliate-program" },
  { label: "Travel Advisors", href: "/partners#advisor" },
  { label: "Service Providers", href: "/partners#service" },
];

const linkClassName =
  "text-sm text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F2148]";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#0F2148] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-14">
        <div className="grid gap-y-10 sm:grid-cols-2 lg:grid-cols-[170px_140px_140px_140px_150px_120px] lg:gap-x-9">
          <div className="space-y-3">
            <div className="relative h-[26px] w-[170px] overflow-hidden">
              <Image
                src="/images/hannadvc-logo.png"
                alt="HannaDVC"
                width={1962}
                height={802}
                className="h-auto w-[200px] max-w-none object-contain"
                style={{ transform: "translate(-17px, -29px)" }}
              />
            </div>
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
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Support</p>
            <ul className="space-y-2">
              {SUPPORT_LINKS.map((link) => (
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
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Booking Policies</p>
            <ul className="space-y-2">
              {BOOKING_POLICY_LINKS.map((link) => (
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

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Partners</p>
            <ul className="space-y-2">
              {PARTNER_LINKS.map((link) => (
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
          <p className="mt-3 text-xs text-white/50">© {year} HannaDVC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
