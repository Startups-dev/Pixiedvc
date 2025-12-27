import Image from "next/image";
import Link from "next/link";

import { Button } from "@pixiedvc/design-system";

const navLinks = [
  { name: "Our Story", href: "/our-story" },
  { name: "Resorts", href: "/resorts" },
  { name: "Owners", href: "/owners" },
  { name: "Guests", href: "/guests" },
  { name: "Get to Know", href: "/get-to-know" },
  { name: "Contact", href: "/contact" },
];

export function SiteHeader({ variant = "transparent" }: { variant?: "transparent" | "solid" }) {
  return (
    <header
      className={
        variant === "solid"
          ? "relative z-10 bg-white/85 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur"
          : "relative z-10"
      }
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-display font-semibold text-ink">
          <Image src="/images/pixie-logo.png" alt="PixieDVC" width={140} height={36} priority />
        </Link>
        <nav className="flex flex-wrap items-center gap-6 text-sm font-medium text-muted sm:text-base">
          {navLinks.map((item) => (
            <Link key={item.name} href={item.href} className="transition-colors hover:text-brand">
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-brand hover:text-brand sm:inline-flex"
          >
            Member Login
          </Link>
          <Button asChild className="bg-gradient-to-r from-[#2b3a70] via-[#384b94] to-[#9aa7ff] text-white">
            <Link href="/signup">Join the Waitlist</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
