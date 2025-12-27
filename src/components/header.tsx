import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";

import { createServer } from "@/lib/supabase";
import UserMenu from "@/components/user-menu";
import { isAdminEmail } from "@/lib/admin";

const NAV_LINKS = [
  { href: "/resorts", label: "Resorts" },
  { href: "/owners", label: "Owners" },
  { href: "/guests", label: "Guests" },
  { href: "/about", label: "Get to Know" },
  { href: "/contact", label: "Contact" },
];

export default async function Header() {
  const cookieStore = await cookies();
  const supabase = createServer(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userLabel: string | null = null;
  let showAdminLink = false;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    userLabel = profile?.display_name ?? user.email ?? "Signed in";
    showAdminLink = isAdminEmail(user.email ?? null);
  }

  return (
    <header className="relative z-[60]">
      <div className="h-[80px] w-full border-b border-white/10 bg-[#0f2148]">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 md:px-6">
          <div className="logo-overlay">
            <Link href="/">
              <Image
                src="/images/pixiedvc-logo.png"
                alt="PixieDVC"
                width={1188}
                height={300}
                priority
                className="h-[148px] w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)] md:h-[156px] lg:h-[164px]"
              />
            </Link>
            <span className="logo-sparkle" aria-hidden="true" />
          </div>

          <nav className="hidden items-center gap-7 text-[15px] text-white/85 md:flex">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
            {user ? (
              <UserMenu label={userLabel ?? "Signed in"} isAdmin={showAdminLink} />
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/40 px-4 py-1 text-sm text-white/85 transition hover:text-white"
              >
                Login
              </Link>
            )}
            {/* Removed waitlist button per request */}
          </nav>
        </div>
      </div>

      <div className="h-[40px] w-full border-t border-white/10 bg-[#0f2148]">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-center px-4">
          <span className="text-[12px] tracking-[0.22em] text-white/60 uppercase">
            Disney Vacation Club Rentals Reinvented
          </span>
        </div>
      </div>
    </header>
  );
}
